using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TouristGuide.Api.Data;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260616232000_AddPostSearchIndexes")]
    public partial class AddPostSearchIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_post_lat_lng",
                table: "post",
                columns: new[] { "lat", "lng" });

            migrationBuilder.CreateIndex(
                name: "IX_post_status_country",
                table: "post",
                columns: new[] { "status", "country" });

            migrationBuilder.CreateIndex(
                name: "IX_post_status_created_at",
                table: "post",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_post_status_post_type_region_id",
                table: "post",
                columns: new[] { "status", "post_type", "region_id" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_post_lat_lng",
                table: "post");

            migrationBuilder.DropIndex(
                name: "IX_post_status_country",
                table: "post");

            migrationBuilder.DropIndex(
                name: "IX_post_status_created_at",
                table: "post");

            migrationBuilder.DropIndex(
                name: "IX_post_status_post_type_region_id",
                table: "post");
        }
    }
}
