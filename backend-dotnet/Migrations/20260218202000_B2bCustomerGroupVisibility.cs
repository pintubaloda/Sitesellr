using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    public partial class B2bCustomerGroupVisibility : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS customer_groups (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Name"" character varying(120) NOT NULL,
  ""Description"" character varying(400),
  ""CreatedAt"" timestamp with time zone NOT NULL,
  CONSTRAINT ""FK_customer_groups_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_customer_groups_StoreId_Name"" ON customer_groups (""StoreId"", ""Name"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS customer_group_members (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerGroupId"" uuid NOT NULL,
  ""CustomerId"" uuid NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  CONSTRAINT ""FK_customer_group_members_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE,
  CONSTRAINT ""FK_customer_group_members_customer_groups_CustomerGroupId"" FOREIGN KEY (""CustomerGroupId"") REFERENCES customer_groups (""Id"") ON DELETE CASCADE,
  CONSTRAINT ""FK_customer_group_members_customers_CustomerId"" FOREIGN KEY (""CustomerId"") REFERENCES customers (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_customer_group_members_StoreId_Group_Customer"" ON customer_group_members (""StoreId"", ""CustomerGroupId"", ""CustomerId"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS visibility_rules (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerGroupId"" uuid NULL,
  ""TargetType"" character varying(30) NOT NULL,
  ""TargetKey"" character varying(120) NOT NULL,
  ""Effect"" character varying(10) NOT NULL,
  ""IsActive"" boolean NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  CONSTRAINT ""FK_visibility_rules_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE,
  CONSTRAINT ""FK_visibility_rules_customer_groups_CustomerGroupId"" FOREIGN KEY (""CustomerGroupId"") REFERENCES customer_groups (""Id"") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ""IX_visibility_rules_lookup"" ON visibility_rules (""StoreId"", ""TargetType"", ""TargetKey"", ""CustomerGroupId"", ""Effect"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS visibility_rules;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS customer_group_members;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS customer_groups;");
        }
    }
}
