using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TouristGuide.Api.Data;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525143000_FixScopedAdminPermissionIndex")]
    public partial class FixScopedAdminPermissionIndex : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_admin_user_permission_admin_user_id_permission_id",
                table: "admin_user_permission");

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_permission_admin_user_id_permission_id_region_id",
                table: "admin_user_permission",
                columns: new[] { "admin_user_id", "permission_id", "region_id" });

            migrationBuilder.Sql("""
                DELETE FROM admin_user_permission p
                USING (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY admin_user_id, permission_id, COALESCE(region_id, 0)
                               ORDER BY granted_at DESC, id DESC
                           ) AS rn
                    FROM admin_user_permission
                ) d
                WHERE p.id = d.id AND d.rn > 1;
                """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX "UX_admin_user_permission_scope"
                ON admin_user_permission (admin_user_id, permission_id, COALESCE(region_id, 0));
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "UX_admin_user_permission_scope";""");

            migrationBuilder.DropIndex(
                name: "IX_admin_user_permission_admin_user_id_permission_id_region_id",
                table: "admin_user_permission");

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_permission_admin_user_id_permission_id",
                table: "admin_user_permission",
                columns: new[] { "admin_user_id", "permission_id" },
                unique: true);
        }
    }
}
