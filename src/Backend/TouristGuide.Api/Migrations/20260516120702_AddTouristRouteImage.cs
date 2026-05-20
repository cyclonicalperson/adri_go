using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTouristRouteImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "image_url",
                table: "tourist_route",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "image_url",
                table: "tourist_route");
        }
    }
}
