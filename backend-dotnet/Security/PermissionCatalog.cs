using backend_dotnet.Models;

namespace backend_dotnet.Security;

public static class Permissions
{
    // Store-level permissions
    public const string OrdersRead = "orders.read";
    public const string OrdersWrite = "orders.write";
    public const string CustomersRead = "customers.read";
    public const string CustomersWrite = "customers.write";
    public const string ProductsRead = "products.read";
    public const string ProductsWrite = "products.write";
    public const string StoreSettingsRead = "store.settings.read";
    public const string StoreSettingsWrite = "store.settings.write";

    // Platform owner capability permissions
    public const string MerchantsRead = "merchants.read";
    public const string MerchantsUpdate = "merchants.update";
    public const string MerchantsSuspend = "merchants.suspend";
    public const string MerchantsDelete = "merchants.delete";
    public const string MerchantsImpersonate = "merchants.impersonate";

    public const string PaymentsReadAll = "payments.read_all";
    public const string SettlementsReadAll = "settlements.read_all";
    public const string RefundsOverride = "refunds.override";
    public const string PayoutsFreeze = "payouts.freeze";
    public const string PayoutsRelease = "payouts.release";

    public const string SubscriptionsManage = "subscriptions.manage";
    public const string PlansManage = "plans.manage";
    public const string BillingAdjust = "billing.adjust";

    public const string PlatformSettingsManage = "platform.settings.manage";
    public const string PlatformFeaturesManage = "platform.features.manage";

    public const string SecurityAuditLogsRead = "security.audit_logs.read";
    public const string SecuritySessionsRevoke = "security.sessions.revoke";
    public const string SecurityPoliciesManage = "security.policies.manage";

    public const string FraudMonitor = "fraud.monitor";
    public const string RiskActionsExecute = "risk.actions.execute";

    public const string PluginsRead = "plugins.read";
    public const string PluginsApprove = "plugins.approve";
    public const string PluginsSuspend = "plugins.suspend";
    public const string PluginsDelete = "plugins.delete";
    public const string PluginsConfigManage = "plugins.config.manage";
    public const string PluginsScopesManage = "plugins.scopes.manage";

    public const string ApiGatewayManage = "api.gateway.manage";
    public const string ApiRoutesManage = "api.routes.manage";
    public const string ApiRateLimitsManage = "api.rate_limits.manage";
    public const string ApiVersioningManage = "api.versioning.manage";

    public const string ApiKeysReadMeta = "api_keys.read_meta";
    public const string ApiKeysRevoke = "api_keys.revoke";
    public const string ApiKeysRotate = "api_keys.rotate";

    public const string WebhooksManage = "webhooks.manage";
    public const string IntegrationsSecurityManage = "integrations.security.manage";
    public const string IntegrationsBlock = "integrations.block";
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

    public static IReadOnlyCollection<string> GetPlatformOwnerTemplatePermissions()
    {
        return new[]
        {
            Permissions.MerchantsRead,
            Permissions.MerchantsUpdate,
            Permissions.MerchantsSuspend,
            Permissions.MerchantsDelete,
            Permissions.MerchantsImpersonate,
            Permissions.PaymentsReadAll,
            Permissions.SettlementsReadAll,
            Permissions.RefundsOverride,
            Permissions.PayoutsFreeze,
            Permissions.PayoutsRelease,
            Permissions.SubscriptionsManage,
            Permissions.PlansManage,
            Permissions.BillingAdjust,
            Permissions.PlatformSettingsManage,
            Permissions.PlatformFeaturesManage,
            Permissions.SecurityAuditLogsRead,
            Permissions.SecuritySessionsRevoke,
            Permissions.SecurityPoliciesManage,
            Permissions.FraudMonitor,
            Permissions.RiskActionsExecute,
            Permissions.PluginsRead,
            Permissions.PluginsApprove,
            Permissions.PluginsSuspend,
            Permissions.PluginsDelete,
            Permissions.PluginsConfigManage,
            Permissions.PluginsScopesManage,
            Permissions.ApiGatewayManage,
            Permissions.ApiRoutesManage,
            Permissions.ApiRateLimitsManage,
            Permissions.ApiVersioningManage,
            Permissions.ApiKeysReadMeta,
            Permissions.ApiKeysRevoke,
            Permissions.ApiKeysRotate,
            Permissions.WebhooksManage,
            Permissions.IntegrationsSecurityManage,
            Permissions.IntegrationsBlock
        };
    }
}
