using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TouristGuide.Api.Data;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260603181500_AddTouristFavoriteRouteUniqueness")]
    public partial class AddTouristFavoriteRouteUniqueness : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM tourist_favorite tf
                USING (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY tourist_id, route_id
                               ORDER BY saved_at DESC, id DESC
                           ) AS rn
                    FROM tourist_favorite
                    WHERE tourist_id IS NOT NULL AND route_id IS NOT NULL
                ) d
                WHERE tf.id = d.id AND d.rn > 1;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_tourist_favorite_tourist_id_route_id",
                table: "tourist_favorite",
                columns: new[] { "tourist_id", "route_id" },
                unique: true,
                filter: "tourist_id IS NOT NULL AND route_id IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tourist_favorite_tourist_id_route_id",
                table: "tourist_favorite");
        }
    }
}
