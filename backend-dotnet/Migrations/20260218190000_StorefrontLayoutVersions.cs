using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    public partial class StorefrontLayoutVersions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS storefront_layout_versions (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""SectionsJson"" character varying(4000),
  ""VersionType"" character varying(20) NOT NULL,
  ""VersionNumber"" integer NOT NULL,
  ""CreatedByUserId"" uuid NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  CONSTRAINT ""FK_storefront_layout_versions_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_storefront_layout_versions_StoreId_VersionNumber"" ON storefront_layout_versions (""StoreId"", ""VersionNumber"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS storefront_layout_versions;");
        }
    }
}
