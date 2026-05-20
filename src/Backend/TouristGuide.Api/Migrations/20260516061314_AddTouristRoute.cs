using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTouristRoute : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "tourist_route_id",
                table: "planner_item",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "tourist_route",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    waypoints = table.Column<string>(type: "text", nullable: true),
                    travel_mode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    scenic_mode = table.Column<bool>(type: "boolean", nullable: false),
                    distance_km = table.Column<decimal>(type: "numeric", nullable: true),
                    duration_min = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tourist_route", x => x.id);
                    table.ForeignKey(
                        name: "FK_tourist_route_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_planner_item_tourist_route_id",
                table: "planner_item",
                column: "tourist_route_id");

            migrationBuilder.CreateIndex(
                name: "IX_tourist_route_tourist_id",
                table: "tourist_route",
                column: "tourist_id");

            migrationBuilder.AddForeignKey(
                name: "FK_planner_item_tourist_route_tourist_route_id",
                table: "planner_item",
                column: "tourist_route_id",
                principalTable: "tourist_route",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_planner_item_tourist_route_tourist_route_id",
                table: "planner_item");

            migrationBuilder.DropTable(
                name: "tourist_route");

            migrationBuilder.DropIndex(
                name: "IX_planner_item_tourist_route_id",
                table: "planner_item");

            migrationBuilder.DropColumn(
                name: "tourist_route_id",
                table: "planner_item");
        }
    }
}
