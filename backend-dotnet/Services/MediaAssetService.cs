using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace backend_dotnet.Services;

public record MediaAssetSaveResult(
    string FileName,
    string ContentType,
    long SizeBytes,
    string Url,
    string Kind);

public interface IMediaAssetService
{
    Task<MediaAssetSaveResult> SaveUploadedAsync(Guid storeId, IFormFile file, string kind, HttpRequest request, CancellationToken ct);
    Task<MediaAssetSaveResult> FetchAndSaveImageAsync(Guid storeId, string sourceUrl, string kind, HttpRequest request, CancellationToken ct);
}

public class MediaAssetService : IMediaAssetService
{
    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/webp", "image/gif"
    };

    private static readonly HashSet<string> AllowedVideoTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "video/mp4", "video/webm", "video/quicktime"
    };

    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;

    public MediaAssetService(IHttpClientFactory httpFactory, IConfiguration config)
    {
        _httpFactory = httpFactory;
        _config = config;
    }

    public async Task<MediaAssetSaveResult> SaveUploadedAsync(Guid storeId, IFormFile file, string kind, HttpRequest request, CancellationToken ct)
    {
        var normalizedKind = string.IsNullOrWhiteSpace(kind) ? "generic" : kind.Trim().ToLowerInvariant();
        if (AllowedImageTypes.Contains(file.ContentType))
        {
            await using var stream = file.OpenReadStream();
            return await SaveOptimizedImageAsync(storeId, stream, normalizedKind, request, ct);
        }

        if (AllowedVideoTypes.Contains(file.ContentType))
        {
            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}{ext}";
            var savePath = EnsureUploadPath(storeId, safeName);
            await using var stream = File.Create(savePath);
            await file.CopyToAsync(stream, ct);
            return BuildResult(storeId, safeName, file.ContentType, new FileInfo(savePath).Length, normalizedKind, request);
        }

        throw new InvalidOperationException("unsupported_content_type");
    }

    public async Task<MediaAssetSaveResult> FetchAndSaveImageAsync(Guid storeId, string sourceUrl, string kind, HttpRequest request, CancellationToken ct)
    {
        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
        {
            throw new InvalidOperationException("invalid_source_url");
        }

        var client = _httpFactory.CreateClient();
        using var response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("source_fetch_failed");
        }

        var contentType = response.Content.Headers.ContentType?.MediaType ?? string.Empty;
        if (!AllowedImageTypes.Contains(contentType))
        {
            throw new InvalidOperationException("source_not_supported_image");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        var normalizedKind = string.IsNullOrWhiteSpace(kind) ? "product-image" : kind.Trim().ToLowerInvariant();
        return await SaveOptimizedImageAsync(storeId, stream, normalizedKind, request, ct);
    }

    private async Task<MediaAssetSaveResult> SaveOptimizedImageAsync(Guid storeId, Stream input, string kind, HttpRequest request, CancellationToken ct)
    {
        using var image = await Image.LoadAsync(input, ct);
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(1200, 1200),
            Mode = ResizeMode.Pad,
            Position = AnchorPositionMode.Center
        }));

        var safeName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}.webp";
        var savePath = EnsureUploadPath(storeId, safeName);
        await image.SaveAsWebpAsync(savePath, new WebpEncoder { Quality = 82 }, ct);
        return BuildResult(storeId, safeName, "image/webp", new FileInfo(savePath).Length, kind, request);
    }

    private string EnsureUploadPath(Guid storeId, string fileName)
    {
        var webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadDir = Path.Combine(webRoot, "uploads", storeId.ToString("N"));
        Directory.CreateDirectory(uploadDir);
        return Path.Combine(uploadDir, fileName);
    }

    private MediaAssetSaveResult BuildResult(Guid storeId, string fileName, string contentType, long sizeBytes, string kind, HttpRequest request)
    {
        var relativeUrl = $"/uploads/{storeId:N}/{fileName}";
        var baseUrl = $"{request.Scheme}://{request.Host}";
        var cdnBase = _config["ASSET_BASE_URL"];
        var assetUrl = string.IsNullOrWhiteSpace(cdnBase) ? $"{baseUrl}{relativeUrl}" : $"{cdnBase.TrimEnd('/')}{relativeUrl}";
        return new MediaAssetSaveResult(fileName, contentType, sizeBytes, assetUrl, kind);
    }
}
