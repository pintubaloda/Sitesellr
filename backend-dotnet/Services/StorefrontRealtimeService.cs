using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace backend_dotnet.Services;

public class StorefrontRealtimeService
{
    private class RoomState
    {
        public int Revision { get; set; }
        public string SectionsJson { get; set; } = "[]";
        public ConcurrentDictionary<string, WebSocket> Clients { get; } = new();
    }

    private readonly ConcurrentDictionary<Guid, RoomState> _rooms = new();

    public async Task HandleClientAsync(Guid storeId, string clientId, WebSocket socket, CancellationToken ct)
    {
        var room = _rooms.GetOrAdd(storeId, _ => new RoomState());
        room.Clients[clientId] = socket;

        await SendAsync(socket, new { type = "snapshot", revision = room.Revision, sectionsJson = room.SectionsJson }, ct);
        await BroadcastAsync(room, new { type = "presence", eventType = "join", clientId }, exceptClientId: clientId, ct);

        var buffer = new byte[32 * 1024];
        try
        {
            while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await socket.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close) break;
                if (result.MessageType != WebSocketMessageType.Text) continue;

                var payload = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await HandleMessageAsync(room, clientId, payload, ct);
            }
        }
        finally
        {
            room.Clients.TryRemove(clientId, out _);
            await BroadcastAsync(room, new { type = "presence", eventType = "leave", clientId }, exceptClientId: clientId, ct);
            if (room.Clients.IsEmpty)
            {
                _rooms.TryRemove(storeId, out _);
            }
            if (socket.State == WebSocketState.Open)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "closed", CancellationToken.None);
            }
        }
    }

    private async Task HandleMessageAsync(RoomState room, string clientId, string payload, CancellationToken ct)
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        var type = root.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : "";
        if (string.Equals(type, "cursor", StringComparison.OrdinalIgnoreCase))
        {
            await BroadcastAsync(room, new
            {
                type = "cursor",
                clientId,
                nodeId = root.TryGetProperty("nodeId", out var nodeId) ? nodeId.GetString() : "",
                x = root.TryGetProperty("x", out var x) ? x.GetDouble() : 0,
                y = root.TryGetProperty("y", out var y) ? y.GetDouble() : 0
            }, exceptClientId: clientId, ct);
            return;
        }

        if (!string.Equals(type, "op", StringComparison.OrdinalIgnoreCase)) return;
        var baseRevision = root.TryGetProperty("baseRevision", out var baseRevEl) ? baseRevEl.GetInt32() : -1;
        var sectionsJson = root.TryGetProperty("sectionsJson", out var sectionsEl) ? sectionsEl.GetString() : "[]";
        if (string.IsNullOrWhiteSpace(sectionsJson)) sectionsJson = "[]";

        if (baseRevision != room.Revision)
        {
            var client = room.Clients.TryGetValue(clientId, out var ws) ? ws : null;
            if (client != null && client.State == WebSocketState.Open)
            {
                await SendAsync(client, new { type = "conflict", revision = room.Revision, sectionsJson = room.SectionsJson }, ct);
            }
            return;
        }

        room.Revision++;
        room.SectionsJson = sectionsJson;
        await BroadcastAsync(room, new
        {
            type = "op_applied",
            revision = room.Revision,
            sectionsJson = room.SectionsJson,
            clientId
        }, exceptClientId: null, ct);
    }

    private async Task BroadcastAsync(RoomState room, object payload, string? exceptClientId, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload);
        var bytes = Encoding.UTF8.GetBytes(json);
        var tasks = new List<Task>();
        foreach (var kv in room.Clients)
        {
            if (exceptClientId != null && kv.Key == exceptClientId) continue;
            if (kv.Value.State != WebSocketState.Open) continue;
            tasks.Add(kv.Value.SendAsync(bytes, WebSocketMessageType.Text, true, ct));
        }
        await Task.WhenAll(tasks);
    }

    private static Task SendAsync(WebSocket socket, object payload, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload);
        var bytes = Encoding.UTF8.GetBytes(json);
        return socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
    }
}
