using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTouristBioAndLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bio",
                table: "tourist",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "location",
                table: "tourist",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "bio",
                table: "tourist");

            migrationBuilder.DropColumn(
                name: "location",
                table: "tourist");
        }
    }
}
