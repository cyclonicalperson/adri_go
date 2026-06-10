using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(Data.AppDbContext))]
    [Migration("20260604091500_AddTouristRouteSourceAndUpdatedAt")]
    public partial class AddTouristRouteSourceAndUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "source_route_id",
                table: "tourist_route",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "tourist_route",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.CreateIndex(
                name: "IX_tourist_route_source_route_id",
                table: "tourist_route",
                column: "source_route_id");

            migrationBuilder.AddForeignKey(
                name: "FK_tourist_route_route_source_route_id",
                table: "tourist_route",
                column: "source_route_id",
                principalTable: "route",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tourist_route_route_source_route_id",
                table: "tourist_route");

            migrationBuilder.DropIndex(
                name: "IX_tourist_route_source_route_id",
                table: "tourist_route");

            migrationBuilder.DropColumn(
                name: "source_route_id",
                table: "tourist_route");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "tourist_route");
        }
    }
}
