using backend_dotnet.Models;

namespace backend_dotnet.Security;

public static class Permissions
{
    // Backward-compatible store-level permissions
    public const string OrdersRead = "orders.read";
    public const string OrdersWrite = "orders.write";
    public const string CustomersRead = "customers.read";
    public const string CustomersWrite = "customers.write";
    public const string CustomersUpdate = "customers.update";
    public const string ProductsRead = "products.read";
    public const string ProductsWrite = "products.write";
    public const string StoreSettingsRead = "store.settings.read";
    public const string StoreSettingsWrite = "store.settings.write";

    // Platform owner/ops permissions
    public const string MerchantsReadAll = "merchants.read_all";
    public const string MerchantsManage = "merchants.manage";
    public const string MerchantsRead = "merchants.read";
    public const string MerchantsSuspend = "merchants.suspend";
    public const string MerchantsLock = "merchants.lock";
    public const string MerchantsDelete = "merchants.delete";
    public const string MerchantsImpersonate = "merchants.impersonate";
    public const string MerchantsFlag = "merchants.flag";
    public const string StoresRead = "stores.read";

    public const string PaymentsReadAll = "payments.read_all";
    public const string TransactionsReadAll = "transactions.read_all";
    public const string TransactionsRead = "transactions.read";
    public const string TransactionsMonitor = "transactions.monitor";
    public const string SettlementsReadAll = "settlements.read_all";
    public const string RefundsReadAll = "refunds.read_all";
    public const string DisputesReadAll = "disputes.read_all";
    public const string PaymentsRead = "payments.read";
    public const string RefundsOverride = "refunds.override";
    public const string RefundsIssue = "refunds.issue";
    public const string PayoutsFreeze = "payouts.freeze";
    public const string PayoutsRelease = "payouts.release";
    public const string PaymentsSystemControl = "payments.system_control";

    public const string SubscriptionsManage = "subscriptions.manage";
    public const string SubscriptionsReadAll = "subscriptions.read_all";
    public const string PlansManage = "plans.manage";
    public const string BillingAdjust = "billing.adjust";

    public const string PlatformSettingsManage = "platform.settings.manage";
    public const string PlatformFeaturesManage = "platform.features.manage";

    public const string SecurityAuditLogsRead = "security.audit_logs.read";
    public const string SecurityAuditLogsReadAll = "security.audit_logs.read_all";
    public const string SecuritySessionsRevoke = "security.sessions.revoke";
    public const string SecurityTokensRevoke = "security.tokens.revoke";
    public const string SecurityPoliciesManage = "security.policies.manage";
    public const string SecurityAccountsLock = "security.accounts.lock";

    public const string FraudMonitor = "fraud.monitor";
    public const string RiskActionsExecute = "risk.actions.execute";
    public const string OrdersReadMasked = "orders.read_masked";
    public const string CustomersReadMasked = "customers.read_masked";

    public const string PluginsRead = "plugins.read";
    public const string PluginsApprove = "plugins.approve";
    public const string PluginsReject = "plugins.reject";
    public const string PluginsSuspend = "plugins.suspend";
    public const string PluginsDelete = "plugins.delete";
    public const string PluginsConfigManage = "plugins.config.manage";
    public const string PluginsScopesManage = "plugins.scopes.manage";
    public const string PluginsFeature = "plugins.feature";
    public const string PluginsPermissionsManage = "plugins.permissions.manage";
    public const string PluginsTokensRevoke = "plugins.tokens.revoke";

    public const string ApiGatewayManage = "api.gateway.manage";
    public const string ApiRoutesManage = "api.routes.manage";
    public const string ApiRateLimitsManage = "api.rate_limits.manage";
    public const string ApiVersioningManage = "api.versioning.manage";

    public const string ApiKeysReadMeta = "api_keys.read_meta";
    public const string ApiKeysRevoke = "api_keys.revoke";
    public const string ApiKeysRotate = "api_keys.rotate";
    public const string ApiKeysPoliciesManage = "api_keys.policies.manage";

    public const string WebhooksManage = "webhooks.manage";
    public const string IntegrationsSecurityManage = "integrations.security.manage";
    public const string IntegrationsBlock = "integrations.block";

    // Store admin/staff permissions
    public const string StoreSettingsManage = "store.settings.manage";
    public const string StoreBrandingManage = "store.branding.manage";
    public const string StoreDomainsManage = "store.domains.manage";
    public const string ProductsCreate = "products.create";
    public const string ProductsUpdate = "products.update";
    public const string ProductsDelete = "products.delete";
    public const string CategoriesManage = "categories.manage";
    public const string InventoryManage = "inventory.manage";
    public const string PricingManage = "pricing.manage";
    public const string DiscountsManage = "discounts.manage";
    public const string OrdersUpdate = "orders.update";
    public const string OrdersCancel = "orders.cancel";
    public const string OrdersCreateManual = "orders.create_manual";
    public const string ShipmentsManage = "shipments.manage";
    public const string CustomerGroupsManage = "customer_groups.manage";
    public const string InvoicesManage = "invoices.manage";
    public const string ReturnsManage = "returns.manage";
    public const string MediaManage = "media.manage";
    public const string CouponsManage = "coupons.manage";
    public const string CampaignsManage = "campaigns.manage";

    // Customer permissions
    public const string ProfileManage = "profile.manage";
    public const string AddressesManage = "addresses.manage";
    public const string OrdersCreate = "orders.create";
    public const string OrdersReadOwn = "orders.read_own";
    public const string PaymentsInitiate = "payments.initiate";
}

public static class PermissionCatalog
{
    private static readonly HashSet<string> OwnerAdminTemplate = new(StringComparer.OrdinalIgnoreCase)
    {
        Permissions.StoreSettingsRead,
        Permissions.StoreSettingsWrite,
        Permissions.StoreSettingsManage,
        Permissions.StoreBrandingManage,
        Permissions.StoreDomainsManage,
        Permissions.ProductsCreate,
        Permissions.ProductsRead,
        Permissions.ProductsWrite,
        Permissions.ProductsUpdate,
        Permissions.ProductsDelete,
        Permissions.CategoriesManage,
        Permissions.InventoryManage,
        Permissions.PricingManage,
        Permissions.DiscountsManage,
        Permissions.OrdersRead,
        Permissions.OrdersUpdate,
        Permissions.OrdersCancel,
        Permissions.OrdersCreateManual,
        Permissions.ShipmentsManage,
        Permissions.CustomersRead,
        Permissions.CustomersWrite,
        Permissions.CustomersUpdate,
        Permissions.CustomerGroupsManage,
        Permissions.PaymentsRead,
        Permissions.TransactionsRead,
        Permissions.RefundsIssue,
        Permissions.InvoicesManage
    };

    private static readonly HashSet<string> StaffTemplate = new(StringComparer.OrdinalIgnoreCase)
    {
        Permissions.StoreSettingsRead,
        Permissions.OrdersRead,
        Permissions.OrdersWrite,
        Permissions.OrdersUpdate,
        Permissions.ShipmentsManage,
        Permissions.ReturnsManage,
        Permissions.ProductsCreate,
        Permissions.ProductsRead,
        Permissions.ProductsWrite,
        Permissions.ProductsUpdate,
        Permissions.InventoryManage,
        Permissions.MediaManage,
        Permissions.DiscountsManage,
        Permissions.CouponsManage,
        Permissions.CampaignsManage
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
            Permissions.MerchantsReadAll,
            Permissions.MerchantsManage,
            Permissions.MerchantsSuspend,
            Permissions.MerchantsLock,
            Permissions.MerchantsDelete,
            Permissions.MerchantsImpersonate,
            Permissions.PaymentsReadAll,
            Permissions.TransactionsReadAll,
            Permissions.SettlementsReadAll,
            Permissions.RefundsReadAll,
            Permissions.DisputesReadAll,
            Permissions.RefundsOverride,
            Permissions.PayoutsFreeze,
            Permissions.PayoutsRelease,
            Permissions.PaymentsSystemControl,
            Permissions.SubscriptionsManage,
            Permissions.PlansManage,
            Permissions.BillingAdjust,
            Permissions.PlatformSettingsManage,
            Permissions.PlatformFeaturesManage,
            Permissions.SecurityAuditLogsReadAll,
            Permissions.SecuritySessionsRevoke,
            Permissions.SecurityTokensRevoke,
            Permissions.SecurityPoliciesManage,
            Permissions.SecurityAccountsLock,
            Permissions.FraudMonitor,
            Permissions.RiskActionsExecute,
            Permissions.PluginsRead,
            Permissions.PluginsApprove,
            Permissions.PluginsReject,
            Permissions.PluginsSuspend,
            Permissions.PluginsDelete,
            Permissions.PluginsFeature,
            Permissions.PluginsConfigManage,
            Permissions.PluginsScopesManage,
            Permissions.PluginsPermissionsManage,
            Permissions.PluginsTokensRevoke,
            Permissions.ApiGatewayManage,
            Permissions.ApiRoutesManage,
            Permissions.ApiRateLimitsManage,
            Permissions.ApiVersioningManage,
            Permissions.ApiKeysReadMeta,
            Permissions.ApiKeysRevoke,
            Permissions.ApiKeysRotate,
            Permissions.ApiKeysPoliciesManage,
            Permissions.WebhooksManage,
            Permissions.IntegrationsSecurityManage,
            Permissions.IntegrationsBlock
        };
    }

    public static IReadOnlyCollection<string> GetPlatformStaffTemplatePermissions()
    {
        return new[]
        {
            Permissions.MerchantsRead,
            Permissions.StoresRead,
            Permissions.OrdersReadMasked,
            Permissions.CustomersReadMasked
        };
    }
}
