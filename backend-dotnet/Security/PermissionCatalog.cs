using backend_dotnet.Models;

namespace backend_dotnet.Security;

public static class Permissions
{
    public const string OrdersRead = "orders.read";
    public const string OrdersWrite = "orders.write";
    public const string CustomersRead = "customers.read";
    public const string CustomersWrite = "customers.write";
    public const string ProductsRead = "products.read";
    public const string ProductsWrite = "products.write";
    public const string StoreSettingsRead = "store.settings.read";
    public const string StoreSettingsWrite = "store.settings.write";
}

public static class PermissionCatalog
{
    private static readonly HashSet<string> OwnerAdminTemplate = new(StringComparer.OrdinalIgnoreCase)
    {
        Permissions.OrdersRead,
        Permissions.OrdersWrite,
        Permissions.CustomersRead,
        Permissions.CustomersWrite,
        Permissions.ProductsRead,
        Permissions.ProductsWrite,
        Permissions.StoreSettingsRead,
        Permissions.StoreSettingsWrite
    };

    private static readonly HashSet<string> StaffTemplate = new(StringComparer.OrdinalIgnoreCase)
    {
        Permissions.OrdersRead,
        Permissions.OrdersWrite,
        Permissions.CustomersRead,
        Permissions.ProductsRead
    };

    public static IReadOnlyCollection<string> GetTemplatePermissions(StoreRole? role)
    {
        return role switch
        {
            StoreRole.Owner => OwnerAdminTemplate,
            StoreRole.Admin => OwnerAdminTemplate,
            StoreRole.Staff => StaffTemplate,
            StoreRole.Custom => Array.Empty<string>(),
            _ => Array.Empty<string>()
        };
    }
}
