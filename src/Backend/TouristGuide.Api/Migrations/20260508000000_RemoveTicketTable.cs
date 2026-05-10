using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTicketTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ticket");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ticket",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    ticket_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qr_code = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    price_paid = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 0.00m),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "issued"),
                    issued_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ticket_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ticket_ticket_code",
                table: "ticket",
                column: "ticket_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_post_id",
                table: "ticket",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_tourist_id",
                table: "ticket",
                column: "tourist_id");
        }
    }
}
