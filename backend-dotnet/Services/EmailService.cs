using System.Net;
using System.Net.Mail;

namespace backend_dotnet.Services;

public interface IEmailService
{
    Task<bool> SendInviteAsync(string toEmail, string inviteUrl, string role, CancellationToken ct = default);
    Task<bool> SendGenericAsync(string toEmail, string subject, string body, CancellationToken ct = default);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<bool> SendInviteAsync(string toEmail, string inviteUrl, string role, CancellationToken ct = default)
    {
        var subject = "Sitesellr Team Invitation";
        var body = $@"You are invited to join Sitesellr store team.

Role: {role}
Accept invite: {inviteUrl}

If you did not request this, ignore this email.";
        return await SendGenericAsync(toEmail, subject, body, ct);
    }

    public async Task<bool> SendGenericAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        var host = _config["SMTP__Host"];
        var portRaw = _config["SMTP__Port"];
        var username = _config["SMTP__Username"];
        var password = _config["SMTP__Password"];
        var from = _config["SMTP__From"];
        var useSsl = _config.GetValue("SMTP__UseSsl", true);

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
        {
            _logger.LogWarning("SMTP not configured. Invite email skipped.");
            return false;
        }

        var port = int.TryParse(portRaw, out var parsedPort) ? parsedPort : 587;
        using var client = new SmtpClient(host, port)
        {
            EnableSsl = useSsl
        };

        if (!string.IsNullOrWhiteSpace(username))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        using var message = new MailMessage(from, toEmail)
        {
            Subject = subject,
            Body = body
        };

        await client.SendMailAsync(message, ct);
        return true;
    }
}
