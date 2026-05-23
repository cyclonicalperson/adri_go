using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TouristGuide.Api.Data;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260522120000_AddPostCountryAndPendingTouristEmailChange")]
    public partial class AddPostCountryAndPendingTouristEmailChange : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "country",
                table: "post",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Montenegro");

            migrationBuilder.AddColumn<string>(
                name: "pending_email",
                table: "tourist",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "pending_email_verification_token",
                table: "tourist",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "pending_email_verification_token_expires_at",
                table: "tourist",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "country",
                table: "post");

            migrationBuilder.DropColumn(
                name: "pending_email",
                table: "tourist");

            migrationBuilder.DropColumn(
                name: "pending_email_verification_token",
                table: "tourist");

            migrationBuilder.DropColumn(
                name: "pending_email_verification_token_expires_at",
                table: "tourist");
        }
    }
}
