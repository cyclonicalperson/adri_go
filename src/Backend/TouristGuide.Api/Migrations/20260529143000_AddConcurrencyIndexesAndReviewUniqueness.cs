using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TouristGuide.Api.Data;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260529143000_AddConcurrencyIndexesAndReviewUniqueness")]
    public partial class AddConcurrencyIndexesAndReviewUniqueness : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM review r
                USING (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY tourist_id, post_id
                               ORDER BY created_at DESC, id DESC
                           ) AS rn
                    FROM review
                    WHERE tourist_id IS NOT NULL AND post_id IS NOT NULL
                ) d
                WHERE r.id = d.id AND d.rn > 1;
                """);

            migrationBuilder.Sql("""
                DELETE FROM review r
                USING (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY tourist_id, route_id
                               ORDER BY created_at DESC, id DESC
                           ) AS rn
                    FROM review
                    WHERE tourist_id IS NOT NULL AND route_id IS NOT NULL
                ) d
                WHERE r.id = d.id AND d.rn > 1;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_review_post_id_status",
                table: "review",
                columns: new[] { "post_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_review_route_id_status",
                table: "review",
                columns: new[] { "route_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_review_tourist_id_post_id",
                table: "review",
                columns: new[] { "tourist_id", "post_id" },
                unique: true,
                filter: "tourist_id IS NOT NULL AND post_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_review_tourist_id_route_id",
                table: "review",
                columns: new[] { "tourist_id", "route_id" },
                unique: true,
                filter: "tourist_id IS NOT NULL AND route_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_post_view_post_id_created_at",
                table: "post_view",
                columns: new[] { "post_id", "viewed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_region_name_country",
                table: "region",
                columns: new[] { "name", "country" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_region_name_country", table: "region");
            migrationBuilder.DropIndex(name: "IX_post_view_post_id_created_at", table: "post_view");
            migrationBuilder.DropIndex(name: "IX_review_tourist_id_route_id", table: "review");
            migrationBuilder.DropIndex(name: "IX_review_tourist_id_post_id", table: "review");
            migrationBuilder.DropIndex(name: "IX_review_route_id_status", table: "review");
            migrationBuilder.DropIndex(name: "IX_review_post_id_status", table: "review");
        }
    }
}
