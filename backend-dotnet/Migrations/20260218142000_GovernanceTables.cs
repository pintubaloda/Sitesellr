using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    public partial class GovernanceTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS merchant_onboarding_profiles (
    ""Id"" uuid NOT NULL,
    ""MerchantId"" uuid NOT NULL,
    ""EmailVerified"" boolean NOT NULL,
    ""MobileVerified"" boolean NOT NULL,
    ""KycVerified"" boolean NOT NULL,
    ""OpsApproved"" boolean NOT NULL,
    ""RiskApproved"" boolean NOT NULL,
    ""PipelineStatus"" character varying(80) NOT NULL,
    ""UpdatedAt"" timestamp with time zone NOT NULL,
    CONSTRAINT ""PK_merchant_onboarding_profiles"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_merchant_onboarding_profiles_merchants_MerchantId"" FOREIGN KEY (""MerchantId"") REFERENCES merchants (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_merchant_onboarding_profiles_MerchantId"" ON merchant_onboarding_profiles (""MerchantId"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_role_templates (
    ""Id"" uuid NOT NULL,
    ""StoreId"" uuid NOT NULL,
    ""Name"" character varying(80) NOT NULL,
    ""PermissionsCsv"" character varying(2000) NOT NULL,
    ""IsSensitive"" boolean NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    CONSTRAINT ""PK_store_role_templates"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_store_role_templates_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_store_role_templates_StoreId_Name"" ON store_role_templates (""StoreId"", ""Name"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS sensitive_action_approvals (
    ""Id"" uuid NOT NULL,
    ""ActionType"" character varying(120) NOT NULL,
    ""EntityType"" character varying(80),
    ""EntityId"" character varying(80),
    ""PayloadJson"" character varying(4000),
    ""RequestedByUserId"" uuid NOT NULL,
    ""ApprovedByUserId"" uuid,
    ""Status"" character varying(30),
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""ApprovedAt"" timestamp with time zone,
    CONSTRAINT ""PK_sensitive_action_approvals"" PRIMARY KEY (""Id"")
);
CREATE INDEX IF NOT EXISTS ""IX_sensitive_action_approvals_Status"" ON sensitive_action_approvals (""Status"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS franchise_units (
    ""Id"" uuid NOT NULL,
    ""MerchantId"" uuid NOT NULL,
    ""Name"" character varying(120) NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    CONSTRAINT ""PK_franchise_units"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_franchise_units_merchants_MerchantId"" FOREIGN KEY (""MerchantId"") REFERENCES merchants (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_franchise_units_MerchantId_Name"" ON franchise_units (""MerchantId"", ""Name"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS franchise_stores (
    ""Id"" uuid NOT NULL,
    ""FranchiseUnitId"" uuid NOT NULL,
    ""StoreId"" uuid NOT NULL,
    CONSTRAINT ""PK_franchise_stores"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_franchise_stores_franchise_units_FranchiseUnitId"" FOREIGN KEY (""FranchiseUnitId"") REFERENCES franchise_units (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_franchise_stores_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_franchise_stores_FranchiseUnitId_StoreId"" ON franchise_stores (""FranchiseUnitId"", ""StoreId"");
CREATE INDEX IF NOT EXISTS ""IX_franchise_stores_StoreId"" ON franchise_stores (""StoreId"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS backoffice_assignments (
    ""Id"" uuid NOT NULL,
    ""MerchantId"" uuid NOT NULL,
    ""UserId"" uuid NOT NULL,
    ""StoreScopeId"" uuid,
    ""Scope"" character varying(80),
    ""Department"" character varying(80),
    ""CreatedAt"" timestamp with time zone NOT NULL,
    CONSTRAINT ""PK_backoffice_assignments"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_backoffice_assignments_merchants_MerchantId"" FOREIGN KEY (""MerchantId"") REFERENCES merchants (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_backoffice_assignments_stores_StoreScopeId"" FOREIGN KEY (""StoreScopeId"") REFERENCES stores (""Id"") ON DELETE SET NULL,
    CONSTRAINT ""FK_backoffice_assignments_users_UserId"" FOREIGN KEY (""UserId"") REFERENCES users (""Id"") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ""IX_backoffice_assignments_MerchantId_UserId_Scope_Department"" ON backoffice_assignments (""MerchantId"", ""UserId"", ""Scope"", ""Department"");
CREATE INDEX IF NOT EXISTS ""IX_backoffice_assignments_UserId"" ON backoffice_assignments (""UserId"");
CREATE INDEX IF NOT EXISTS ""IX_backoffice_assignments_StoreScopeId"" ON backoffice_assignments (""StoreScopeId"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS backoffice_assignments;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS franchise_stores;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS franchise_units;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS sensitive_action_approvals;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_role_templates;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS merchant_onboarding_profiles;");
        }
    }
}
