using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TouristGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "admin_permission",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_permission", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "organization",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    website = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    is_verified = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "region",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    lat = table.Column<decimal>(type: "numeric", nullable: true),
                    lng = table.Column<decimal>(type: "numeric", nullable: true),
                    cover_image = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_region", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tag",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    color = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    duration = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    difficulty = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    max_capacity = table.Column<short>(type: "smallint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tag", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tourist",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    language = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    interests = table.Column<string>(type: "text", nullable: true),
                    home_lat = table.Column<decimal>(type: "numeric", nullable: true),
                    home_lng = table.Column<decimal>(type: "numeric", nullable: true),
                    profile_image = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tourist", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "admin_user",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    organization_id = table.Column<long>(type: "bigint", nullable: true),
                    full_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email_verified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    is_individual = table.Column<bool>(type: "boolean", nullable: false),
                    account_status = table.Column<string>(type: "text", nullable: false),
                    profile_image = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_user", x => x.id);
                    table.ForeignKey(
                        name: "FK_admin_user_organization_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organization",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "mailing_list",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    preferences = table.Column<string>(type: "text", nullable: true),
                    is_subscribed = table.Column<bool>(type: "boolean", nullable: false),
                    subscribed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    unsubscribed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mailing_list", x => x.id);
                    table.ForeignKey(
                        name: "FK_mailing_list_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "notification",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    body = table.Column<string>(type: "text", nullable: true),
                    payload = table.Column<string>(type: "text", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification", x => x.id);
                    table.ForeignKey(
                        name: "FK_notification_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "visit_planner",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    is_public = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_visit_planner", x => x.id);
                    table.ForeignKey(
                        name: "FK_visit_planner_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "admin_audit_log",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    admin_user_id = table.Column<long>(type: "bigint", nullable: true),
                    performed_by = table.Column<long>(type: "bigint", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<long>(type: "bigint", nullable: true),
                    old_value = table.Column<string>(type: "text", nullable: true),
                    new_value = table.Column<string>(type: "text", nullable: true),
                    performed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_audit_log", x => x.id);
                    table.ForeignKey(
                        name: "FK_admin_audit_log_admin_user_admin_user_id",
                        column: x => x.admin_user_id,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_admin_audit_log_admin_user_performed_by",
                        column: x => x.performed_by,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "admin_notification",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    admin_user_id = table.Column<long>(type: "bigint", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    body = table.Column<string>(type: "text", nullable: true),
                    payload = table.Column<string>(type: "text", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_notification", x => x.id);
                    table.ForeignKey(
                        name: "FK_admin_notification_admin_user_admin_user_id",
                        column: x => x.admin_user_id,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "admin_registration_request",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    full_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email_verification_token = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    email_verified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_organization = table.Column<bool>(type: "boolean", nullable: false),
                    is_individual = table.Column<bool>(type: "boolean", nullable: false),
                    organization_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    organization_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_registration_request", x => x.id);
                    table.ForeignKey(
                        name: "FK_admin_registration_request_admin_user_reviewed_by",
                        column: x => x.reviewed_by,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "admin_user_permission",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    admin_user_id = table.Column<long>(type: "bigint", nullable: false),
                    permission_id = table.Column<long>(type: "bigint", nullable: false),
                    region_id = table.Column<long>(type: "bigint", nullable: true),
                    granted_by = table.Column<long>(type: "bigint", nullable: false),
                    granted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_user_permission", x => x.id);
                    table.ForeignKey(
                        name: "FK_admin_user_permission_admin_permission_permission_id",
                        column: x => x.permission_id,
                        principalTable: "admin_permission",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_admin_user_permission_admin_user_admin_user_id",
                        column: x => x.admin_user_id,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_admin_user_permission_admin_user_granted_by",
                        column: x => x.granted_by,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_admin_user_permission_region_region_id",
                        column: x => x.region_id,
                        principalTable: "region",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "post",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    admin_id = table.Column<long>(type: "bigint", nullable: false),
                    region_id = table.Column<long>(type: "bigint", nullable: true),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    post_type = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    lat = table.Column<decimal>(type: "numeric", nullable: true),
                    lng = table.Column<decimal>(type: "numeric", nullable: true),
                    address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    external_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    external_url_label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    images = table.Column<string>(type: "text", nullable: true),
                    opening_hours = table.Column<string>(type: "text", nullable: true),
                    details = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    view_count = table.Column<long>(type: "bigint", nullable: false),
                    like_count = table.Column<long>(type: "bigint", nullable: false),
                    save_count = table.Column<long>(type: "bigint", nullable: false),
                    review_count = table.Column<long>(type: "bigint", nullable: false),
                    avg_rating = table.Column<decimal>(type: "numeric", nullable: true),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post", x => x.id);
                    table.ForeignKey(
                        name: "FK_post_admin_user_admin_id",
                        column: x => x.admin_id,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_post_region_region_id",
                        column: x => x.region_id,
                        principalTable: "region",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "route",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    admin_id = table.Column<long>(type: "bigint", nullable: false),
                    region_id = table.Column<long>(type: "bigint", nullable: true),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    difficulty = table.Column<string>(type: "text", nullable: false),
                    distance_km = table.Column<decimal>(type: "numeric", nullable: true),
                    duration_min = table.Column<long>(type: "bigint", nullable: true),
                    elevation_gain = table.Column<long>(type: "bigint", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    waypoints = table.Column<string>(type: "text", nullable: true),
                    gpx_file_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    images = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    view_count = table.Column<long>(type: "bigint", nullable: false),
                    save_count = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_route", x => x.id);
                    table.ForeignKey(
                        name: "FK_route_admin_user_admin_id",
                        column: x => x.admin_id,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_route_region_region_id",
                        column: x => x.region_id,
                        principalTable: "region",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "terms_acceptance",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    admin_user_id = table.Column<long>(type: "bigint", nullable: true),
                    registration_request_id = table.Column<long>(type: "bigint", nullable: true),
                    terms_version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_terms_acceptance", x => x.id);
                    table.ForeignKey(
                        name: "FK_terms_acceptance_admin_registration_request_registration_re~",
                        column: x => x.registration_request_id,
                        principalTable: "admin_registration_request",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_terms_acceptance_admin_user_admin_user_id",
                        column: x => x.admin_user_id,
                        principalTable: "admin_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "verification_document",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    registration_request_id = table.Column<long>(type: "bigint", nullable: false),
                    file_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_type = table.Column<string>(type: "text", nullable: false),
                    file_size_kb = table.Column<long>(type: "bigint", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verification_document", x => x.id);
                    table.ForeignKey(
                        name: "FK_verification_document_admin_registration_request_registrati~",
                        column: x => x.registration_request_id,
                        principalTable: "admin_registration_request",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "direction_request",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    from_lat = table.Column<decimal>(type: "numeric", nullable: true),
                    from_lng = table.Column<decimal>(type: "numeric", nullable: true),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_direction_request", x => x.id);
                    table.ForeignKey(
                        name: "FK_direction_request_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_direction_request_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "external_click",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    clicked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_external_click", x => x.id);
                    table.ForeignKey(
                        name: "FK_external_click_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_external_click_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "post_like",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    tourist_id = table.Column<long>(type: "bigint", nullable: false),
                    liked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_like", x => x.id);
                    table.ForeignKey(
                        name: "FK_post_like_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_post_like_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "post_save",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    tourist_id = table.Column<long>(type: "bigint", nullable: false),
                    saved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_save", x => x.id);
                    table.ForeignKey(
                        name: "FK_post_save_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_post_save_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "post_tag",
                columns: table => new
                {
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    tag_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_tag", x => new { x.post_id, x.tag_id });
                    table.ForeignKey(
                        name: "FK_post_tag_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_post_tag_tag_tag_id",
                        column: x => x.tag_id,
                        principalTable: "tag",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "post_translation",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    lang_code = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_translation", x => x.id);
                    table.ForeignKey(
                        name: "FK_post_translation_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "post_view",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    viewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    duration_sec = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_view", x => x.id);
                    table.ForeignKey(
                        name: "FK_post_view_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_post_view_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ticket",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    post_id = table.Column<long>(type: "bigint", nullable: false),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    ticket_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qr_code = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    price_paid = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
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

            migrationBuilder.CreateTable(
                name: "content_share",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    post_id = table.Column<long>(type: "bigint", nullable: true),
                    route_id = table.Column<long>(type: "bigint", nullable: true),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    shared_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_content_share", x => x.id);
                    table.ForeignKey(
                        name: "FK_content_share_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_content_share_route_route_id",
                        column: x => x.route_id,
                        principalTable: "route",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_content_share_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "planner_item",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    planner_id = table.Column<long>(type: "bigint", nullable: false),
                    post_id = table.Column<long>(type: "bigint", nullable: true),
                    route_id = table.Column<long>(type: "bigint", nullable: true),
                    day_number = table.Column<byte>(type: "smallint", nullable: false),
                    order_in_day = table.Column<byte>(type: "smallint", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    scheduled_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_planner_item", x => x.id);
                    table.ForeignKey(
                        name: "FK_planner_item_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_planner_item_route_route_id",
                        column: x => x.route_id,
                        principalTable: "route",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_planner_item_visit_planner_planner_id",
                        column: x => x.planner_id,
                        principalTable: "visit_planner",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "review",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: true),
                    post_id = table.Column<long>(type: "bigint", nullable: true),
                    route_id = table.Column<long>(type: "bigint", nullable: true),
                    rating = table.Column<byte>(type: "smallint", nullable: false),
                    comment = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    is_approved = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review", x => x.id);
                    table.ForeignKey(
                        name: "FK_review_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_review_route_route_id",
                        column: x => x.route_id,
                        principalTable: "route",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_review_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tourist_favorite",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tourist_id = table.Column<long>(type: "bigint", nullable: false),
                    post_id = table.Column<long>(type: "bigint", nullable: true),
                    route_id = table.Column<long>(type: "bigint", nullable: true),
                    saved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tourist_favorite", x => x.id);
                    table.ForeignKey(
                        name: "FK_tourist_favorite_post_post_id",
                        column: x => x.post_id,
                        principalTable: "post",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tourist_favorite_route_route_id",
                        column: x => x.route_id,
                        principalTable: "route",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tourist_favorite_tourist_tourist_id",
                        column: x => x.tourist_id,
                        principalTable: "tourist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_admin_user_id",
                table: "admin_audit_log",
                column: "admin_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_performed_by",
                table: "admin_audit_log",
                column: "performed_by");

            migrationBuilder.CreateIndex(
                name: "IX_admin_notification_admin_user_id",
                table: "admin_notification",
                column: "admin_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_registration_request_reviewed_by",
                table: "admin_registration_request",
                column: "reviewed_by");

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_email",
                table: "admin_user",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_organization_id",
                table: "admin_user",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_permission_admin_user_id_permission_id",
                table: "admin_user_permission",
                columns: new[] { "admin_user_id", "permission_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_permission_granted_by",
                table: "admin_user_permission",
                column: "granted_by");

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_permission_permission_id",
                table: "admin_user_permission",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_user_permission_region_id",
                table: "admin_user_permission",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "IX_content_share_post_id",
                table: "content_share",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_content_share_route_id",
                table: "content_share",
                column: "route_id");

            migrationBuilder.CreateIndex(
                name: "IX_content_share_tourist_id",
                table: "content_share",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_direction_request_post_id",
                table: "direction_request",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_direction_request_tourist_id",
                table: "direction_request",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_external_click_post_id",
                table: "external_click",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_external_click_tourist_id",
                table: "external_click",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_mailing_list_tourist_id",
                table: "mailing_list",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_notification_tourist_id",
                table: "notification",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_planner_item_planner_id",
                table: "planner_item",
                column: "planner_id");

            migrationBuilder.CreateIndex(
                name: "IX_planner_item_post_id",
                table: "planner_item",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_planner_item_route_id",
                table: "planner_item",
                column: "route_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_admin_id",
                table: "post",
                column: "admin_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_region_id",
                table: "post",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_like_post_id",
                table: "post_like",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_like_tourist_id_post_id",
                table: "post_like",
                columns: new[] { "tourist_id", "post_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_post_save_post_id",
                table: "post_save",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_save_tourist_id_post_id",
                table: "post_save",
                columns: new[] { "tourist_id", "post_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_post_tag_tag_id",
                table: "post_tag",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_translation_post_id_lang_code",
                table: "post_translation",
                columns: new[] { "post_id", "lang_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_post_view_post_id",
                table: "post_view",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_view_tourist_id",
                table: "post_view",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_post_id",
                table: "review",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_route_id",
                table: "review",
                column: "route_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_tourist_id",
                table: "review",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_route_admin_id",
                table: "route",
                column: "admin_id");

            migrationBuilder.CreateIndex(
                name: "IX_route_region_id",
                table: "route",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "IX_tag_name",
                table: "tag",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_terms_acceptance_admin_user_id",
                table: "terms_acceptance",
                column: "admin_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_terms_acceptance_registration_request_id",
                table: "terms_acceptance",
                column: "registration_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_post_id",
                table: "ticket",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_ticket_code",
                table: "ticket",
                column: "ticket_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_tourist_id",
                table: "ticket",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_tourist_email",
                table: "tourist",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tourist_favorite_post_id",
                table: "tourist_favorite",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_tourist_favorite_route_id",
                table: "tourist_favorite",
                column: "route_id");

            migrationBuilder.CreateIndex(
                name: "IX_tourist_favorite_tourist_id",
                table: "tourist_favorite",
                column: "tourist_id");

            migrationBuilder.CreateIndex(
                name: "IX_verification_document_registration_request_id",
                table: "verification_document",
                column: "registration_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_visit_planner_tourist_id",
                table: "visit_planner",
                column: "tourist_id");

            // ── VIEWOVI ──────────────────────────────────────────────────

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW v_posts_full AS
                SELECT
                    p.id            AS ""postId"",
                    p.admin_id      AS ""adminId"",
                    p.region_id     AS ""regionId"",
                    p.title,
                    p.post_type     AS ""postType"",
                    p.description,
                    p.lat,
                    p.lng,
                    p.address,
                    p.external_url        AS ""externalUrl"",
                    p.external_url_label  AS ""externalUrlLabel"",
                    p.images,
                    p.opening_hours       AS ""openingHours"",
                    p.details,
                    p.status,
                    p.view_count    AS ""viewCount"",
                    p.like_count    AS ""likeCount"",
                    p.save_count    AS ""saveCount"",
                    p.review_count  AS ""reviewCount"",
                    p.avg_rating    AS ""avgRating"",
                    p.published_at  AS ""publishedAt"",
                    p.created_at    AS ""createdAt"",
                    p.updated_at    AS ""updatedAt"",
                    a.full_name     AS ""adminName"",
                    a.role          AS ""adminRole"",
                    r.name          AS ""regionName"",
                    r.type          AS ""regionType"",
                    r.lat           AS ""regionLat"",
                    r.lng           AS ""regionLng""
                FROM post p
                JOIN admin_user a ON p.admin_id  = a.id
                LEFT JOIN region r ON p.region_id = r.id;
                ");

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW v_routes_full AS
                SELECT
                    rt.id            AS ""routeId"",
                    rt.admin_id      AS ""adminId"",
                    rt.region_id     AS ""regionId"",
                    rt.name,
                    rt.difficulty,
                    rt.distance_km   AS ""distanceKm"",
                    rt.duration_min  AS ""durationMin"",
                    rt.elevation_gain AS ""elevationGainM"",
                    rt.description,
                    rt.waypoints,
                    rt.images,
                    rt.status,
                    rt.view_count    AS ""viewCount"",
                    rt.save_count    AS ""saveCount"",
                    rt.created_at    AS ""createdAt"",
                    rt.updated_at    AS ""updatedAt"",
                    a.full_name      AS ""adminName"",
                    r.name           AS ""regionName""
                FROM route rt
                JOIN admin_user a  ON rt.admin_id  = a.id
                LEFT JOIN region r ON rt.region_id = r.id;
                ");

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW v_reviews_full AS
                SELECT
                    rv.id           AS ""reviewId"",
                    rv.tourist_id   AS ""touristId"",
                    rv.post_id      AS ""postId"",
                    rv.route_id     AS ""routeId"",
                    rv.rating,
                    rv.comment,
                    rv.status,
                    rv.is_approved  AS ""isApproved"",
                    rv.created_at   AS ""createdAt"",
                    t.name          AS ""touristName"",
                    p.title         AS ""postTitle"",
                    p.post_type     AS ""postType"",
                    ro.name         AS ""routeName"",
                    CASE
                        WHEN rv.post_id IS NOT NULL AND p.post_type = 'event' THEN 'EVENT'
                        WHEN rv.route_id IS NOT NULL THEN 'ROUTE'
                        WHEN rv.post_id IS NOT NULL THEN 'OBJECT'
                        ELSE NULL
                    END AS ""entityType"",
                    COALESCE(p.title, ro.name) AS ""entityName""
                FROM review rv
                LEFT JOIN tourist t  ON rv.tourist_id = t.id
                LEFT JOIN post    p  ON rv.post_id    = p.id
                LEFT JOIN route   ro ON rv.route_id   = ro.id;
                ");

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW v_admin_users_full AS
                SELECT
                    au.id                 AS ""userId"",
                    au.organization_id    AS ""organizationId"",
                    au.full_name          AS ""fullName"",
                    au.email,
                    au.email_verified_at  AS ""emailVerifiedAt"",
                    au.role,
                    au.is_individual      AS ""isIndividual"",
                    au.account_status     AS ""accountStatus"",
                    au.profile_image      AS ""profileImage"",
                    au.last_login_at      AS ""lastLoginAt"",
                    au.created_at         AS ""createdAt"",
                    o.name                AS ""organizationName"",
                    o.type                AS ""organizationType"",
                    o.contact_email       AS ""organizationEmail"",
                    o.website             AS ""organizationWebsite"",
                    o.is_verified         AS ""organizationIsVerified"",
                    (SELECT COUNT(*) FROM admin_user_permission aup
                     WHERE aup.admin_user_id = au.id) AS ""permissionCount"",
                    CASE WHEN au.account_status = 'active' THEN true ELSE false END AS ""isActive""
                FROM admin_user au
                LEFT JOIN organization o ON au.organization_id = o.id;
                ");

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW v_superadmin_overview AS
                SELECT
                    (SELECT COUNT(*) FROM tourist      WHERE is_active = true)                                    AS ""totalTourists"",
                    (SELECT COUNT(*) FROM admin_user   WHERE role = 'admin' AND account_status = 'active')        AS ""totalAdmins"",
                    (SELECT COUNT(*) FROM post         WHERE status = 'published')                                AS ""totalPosts"",
                    (SELECT COUNT(*) FROM route        WHERE status = 'published')                                AS ""totalRoutes"",
                    (SELECT COUNT(*) FROM admin_registration_request WHERE status = 'pending')                    AS ""pendingRegistrations"",
                    (SELECT COUNT(*) FROM review       WHERE status = 'PENDING')                                  AS ""pendingReviews"",
                    (SELECT COUNT(*) FROM ticket       WHERE status = 'issued')                                   AS ""ticketsIssued"",
                    (SELECT COUNT(*) FROM admin_notification WHERE is_read = false)                               AS ""unreadNotifications"";
                ");

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW v_region_popularity AS
                SELECT
                    r.id   AS ""regionId"",
                    r.name,
                    r.type,
                    COUNT(DISTINCT p.id)            AS ""numPosts"",
                    COALESCE(SUM(p.view_count), 0)  AS ""totalViews"",
                    COALESCE(SUM(p.like_count), 0)  AS ""totalLikes"",
                    AVG(p.avg_rating)               AS ""avgRating""
                FROM region r
                LEFT JOIN post p ON p.region_id = r.id AND p.status = 'published'
                GROUP BY r.id, r.name, r.type;
                ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_audit_log");

            migrationBuilder.DropTable(
                name: "admin_notification");

            migrationBuilder.DropTable(
                name: "admin_user_permission");

            migrationBuilder.DropTable(
                name: "content_share");

            migrationBuilder.DropTable(
                name: "direction_request");

            migrationBuilder.DropTable(
                name: "external_click");

            migrationBuilder.DropTable(
                name: "mailing_list");

            migrationBuilder.DropTable(
                name: "notification");

            migrationBuilder.DropTable(
                name: "planner_item");

            migrationBuilder.DropTable(
                name: "post_like");

            migrationBuilder.DropTable(
                name: "post_save");

            migrationBuilder.DropTable(
                name: "post_tag");

            migrationBuilder.DropTable(
                name: "post_translation");

            migrationBuilder.DropTable(
                name: "post_view");

            migrationBuilder.DropTable(
                name: "review");

            migrationBuilder.DropTable(
                name: "terms_acceptance");

            migrationBuilder.DropTable(
                name: "ticket");

            migrationBuilder.DropTable(
                name: "tourist_favorite");

            migrationBuilder.DropTable(
                name: "verification_document");

            migrationBuilder.DropTable(
                name: "admin_permission");

            migrationBuilder.DropTable(
                name: "visit_planner");

            migrationBuilder.DropTable(
                name: "tag");

            migrationBuilder.DropTable(
                name: "post");

            migrationBuilder.DropTable(
                name: "route");

            migrationBuilder.DropTable(
                name: "admin_registration_request");

            migrationBuilder.DropTable(
                name: "tourist");

            migrationBuilder.DropTable(
                name: "region");

            migrationBuilder.DropTable(
                name: "admin_user");

            migrationBuilder.DropTable(
                name: "organization");

            migrationBuilder.Sql("DROP VIEW IF EXISTS v_posts_full;");
            migrationBuilder.Sql("DROP VIEW IF EXISTS v_routes_full;");
            migrationBuilder.Sql("DROP VIEW IF EXISTS v_reviews_full;");
            migrationBuilder.Sql("DROP VIEW IF EXISTS v_admin_users_full;");
            migrationBuilder.Sql("DROP VIEW IF EXISTS v_superadmin_overview;");
            migrationBuilder.Sql("DROP VIEW IF EXISTS v_region_popularity;");
        }
    }
}
