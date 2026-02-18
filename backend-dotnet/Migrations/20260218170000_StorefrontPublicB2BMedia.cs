using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    public partial class StorefrontPublicB2BMedia : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS \"ShowPricing\" boolean NOT NULL DEFAULT true;");
            migrationBuilder.Sql("ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS \"LoginToViewPrice\" boolean NOT NULL DEFAULT false;");
            migrationBuilder.Sql("ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS \"CatalogMode\" character varying(20) NOT NULL DEFAULT 'retail';");
            migrationBuilder.Sql("ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS \"CatalogVisibilityJson\" character varying(4000) NULL;");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_media_assets (
  \"Id\" uuid PRIMARY KEY,
  \"StoreId\" uuid NOT NULL,
  \"FileName\" character varying(260) NOT NULL,
  \"ContentType\" character varying(120) NOT NULL,
  \"SizeBytes\" bigint NOT NULL,
  \"Url\" character varying(1000) NOT NULL,
  \"Kind\" character varying(80),
  \"CreatedAt\" timestamp with time zone NOT NULL,
  CONSTRAINT \"FK_store_media_assets_stores_StoreId\" FOREIGN KEY (\"StoreId\") REFERENCES stores (\"Id\") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS \"IX_store_media_assets_StoreId_Kind\" ON store_media_assets (\"StoreId\", \"Kind\");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_media_assets;");
        }
    }
}
