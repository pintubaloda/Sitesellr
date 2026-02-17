namespace backend_dotnet.Services;

public interface IPaymentPlugin
{
    string Name { get; }
    Task<PaymentInitResult> InitializeAsync(PaymentInitRequest request, CancellationToken ct = default);
}

public record PaymentInitRequest(Guid StoreId, Guid OrderId, decimal Amount, string Currency, string ReturnUrl, string CallbackUrl);
public record PaymentInitResult(string RedirectUrl, string ProviderReference);

public class DummyPaymentPlugin : IPaymentPlugin
{
    public string Name => "dummy";

    public Task<PaymentInitResult> InitializeAsync(PaymentInitRequest request, CancellationToken ct = default)
    {
        var redirect = $"{request.ReturnUrl}?orderId={request.OrderId}&status=success";
        return Task.FromResult(new PaymentInitResult(redirect, Guid.NewGuid().ToString("N")));
    }
}

public interface IPaymentPluginFactory
{
    IPaymentPlugin Resolve(string name);
}

public class PaymentPluginFactory : IPaymentPluginFactory
{
    private readonly IEnumerable<IPaymentPlugin> _plugins;

    public PaymentPluginFactory(IEnumerable<IPaymentPlugin> plugins)
    {
        _plugins = plugins;
    }

    public IPaymentPlugin Resolve(string name)
    {
        return _plugins.FirstOrDefault(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
               ?? throw new InvalidOperationException($"Payment plugin '{name}' not registered.");
    }
}
