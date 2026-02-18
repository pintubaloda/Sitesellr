using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    public partial class StorefrontCmsThemeEngine : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS theme_catalog_items (
  \"Id\" uuid PRIMARY KEY,
  \"Name\" character varying(120) NOT NULL,
  \"Slug\" character varying(120) NOT NULL,
  \"Category\" character varying(80),
  \"Description\" character varying(800),
  \"PreviewUrl\" character varying(1000),
  \"IsPaid\" boolean NOT NULL,
  \"Price\" numeric(18,2) NOT NULL,
  \"AllowedPlanCodesCsv\" character varying(500),
  \"IsActive\" boolean NOT NULL,
  \"CreatedAt\" timestamp with time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS \"IX_theme_catalog_items_Slug\" ON theme_catalog_items (\"Slug\");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_theme_configs (
  \"Id\" uuid PRIMARY KEY,
  \"StoreId\" uuid NOT NULL,
  \"ActiveThemeId\" uuid NULL,
  \"LogoUrl\" character varying(1000),
  \"FaviconUrl\" character varying(1000),
  \"HeaderJson\" character varying(4000),
  \"FooterJson\" character varying(4000),
  \"BannerJson\" character varying(4000),
  \"DesignTokensJson\" character varying(4000),
  \"UpdatedAt\" timestamp with time zone NOT NULL,
  CONSTRAINT \"FK_store_theme_configs_stores_StoreId\" FOREIGN KEY (\"StoreId\") REFERENCES stores (\"Id\") ON DELETE CASCADE,
  CONSTRAINT \"FK_store_theme_configs_theme_catalog_items_ActiveThemeId\" FOREIGN KEY (\"ActiveThemeId\") REFERENCES theme_catalog_items (\"Id\") ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS \"IX_store_theme_configs_StoreId\" ON store_theme_configs (\"StoreId\");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_homepage_layouts (
  \"Id\" uuid PRIMARY KEY,
  \"StoreId\" uuid NOT NULL,
  \"SectionsJson\" character varying(4000),
  \"UpdatedAt\" timestamp with time zone NOT NULL,
  CONSTRAINT \"FK_store_homepage_layouts_stores_StoreId\" FOREIGN KEY (\"StoreId\") REFERENCES stores (\"Id\") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS \"IX_store_homepage_layouts_StoreId\" ON store_homepage_layouts (\"StoreId\");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_navigation_menus (
  \"Id\" uuid PRIMARY KEY,
  \"StoreId\" uuid NOT NULL,
  \"Name\" character varying(120),
  \"ItemsJson\" character varying(4000),
  \"IsPrimary\" boolean NOT NULL,
  \"UpdatedAt\" timestamp with time zone NOT NULL,
  CONSTRAINT \"FK_store_navigation_menus_stores_StoreId\" FOREIGN KEY (\"StoreId\") REFERENCES stores (\"Id\") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS \"IX_store_navigation_menus_StoreId_Name\" ON store_navigation_menus (\"StoreId\", \"Name\");
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS store_static_pages (
  \"Id\" uuid PRIMARY KEY,
  \"StoreId\" uuid NOT NULL,
  \"Title\" character varying(160) NOT NULL,
  \"Slug\" character varying(200) NOT NULL,
  \"Content\" character varying(10000),
  \"SeoTitle\" character varying(160),
  \"SeoDescription\" character varying(400),
  \"IsPublished\" boolean NOT NULL,
  \"UpdatedAt\" timestamp with time zone NOT NULL,
  CONSTRAINT \"FK_store_static_pages_stores_StoreId\" FOREIGN KEY (\"StoreId\") REFERENCES stores (\"Id\") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS \"IX_store_static_pages_StoreId_Slug\" ON store_static_pages (\"StoreId\", \"Slug\");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_static_pages;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_navigation_menus;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_homepage_layouts;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS store_theme_configs;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS theme_catalog_items;");
        }
    }
}
