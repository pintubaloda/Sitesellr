using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    public partial class StorefrontCollaborationSessions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS storefront_edit_sessions (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""UserId"" uuid NOT NULL,
  ""EditorName"" character varying(120),
  ""Status"" character varying(40) NOT NULL,
  ""LastSeenAt"" timestamp with time zone NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  CONSTRAINT ""FK_storefront_edit_sessions_stores_StoreId"" FOREIGN KEY (""StoreId"") REFERENCES stores (""Id"") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ""IX_storefront_edit_sessions_StoreId_Status"" ON storefront_edit_sessions (""StoreId"", ""Status"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS storefront_edit_sessions;");
        }
    }
}
