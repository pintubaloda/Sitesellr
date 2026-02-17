using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations;

public partial class WebAuthn : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "MfaSecret",
            table: "users",
            type: "character varying(64)",
            maxLength: 64,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "webauthn_credentials",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                CredentialId = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                PublicKey = table.Column<byte[]>(type: "bytea", nullable: false),
                SignCount = table.Column<long>(type: "bigint", nullable: false),
                AaGuid = table.Column<Guid>(type: "uuid", nullable: false),
                CredType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                Transports = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_webauthn_credentials", x => x.Id);
                table.ForeignKey(
                    name: "FK_webauthn_credentials_users_UserId",
                    column: x => x.UserId,
                    principalTable: "users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_webauthn_credentials_CredentialId",
            table: "webauthn_credentials",
            column: "CredentialId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_webauthn_credentials_UserId",
            table: "webauthn_credentials",
            column: "UserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "webauthn_credentials");

        migrationBuilder.DropColumn(
            name: "MfaSecret",
            table: "users");
    }
}
