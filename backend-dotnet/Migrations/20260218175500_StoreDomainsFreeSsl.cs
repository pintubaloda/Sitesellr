using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    public partial class StoreDomainsFreeSsl : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_domains (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Hostname"" character varying(255) NOT NULL,
  ""VerificationToken"" character varying(120) NOT NULL,
  ""IsVerified"" boolean NOT NULL,
  ""SslProvider"" character varying(40) NOT NULL,
  ""SslStatus"" character varying(30) NOT NULL,
  ""LastError"" character varying(500),
  ""SslExpiresAt"" timestamp with time zone,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL,
  CONSTRAINT ""FK_store_domains_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_store_domains_Hostname"" ON store_domains (""Hostname"");
CREATE INDEX IF NOT EXISTS ""IX_store_domains_StoreId_IsVerified"" ON store_domains (""StoreId"", ""IsVerified"");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_media_assets (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""FileName"" character varying(260) NOT NULL,
  ""ContentType"" character varying(120) NOT NULL,
  ""SizeBytes"" bigint NOT NULL,
  ""Url"" character varying(1000) NOT NULL,
  ""Kind"" character varying(80),
  ""CreatedAt"" timestamp with time zone NOT NULL,
  CONSTRAINT ""FK_store_media_assets_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ""IX_store_media_assets_StoreId_Kind"" ON store_media_assets (""StoreId"", ""Kind"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_domains;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_media_assets;");
        }
    }
}
