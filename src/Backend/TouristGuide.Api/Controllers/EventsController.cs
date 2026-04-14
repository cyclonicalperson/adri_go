using System.Data.Common;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin,superadmin")]
    public class EventsController : ControllerBase
    {
        private static readonly IReadOnlyList<EventCategoryOptionDto> EventCategories =
        [
            new() { Code = "CONCERT", Label = "Koncert" },
            new() { Code = "FESTIVAL", Label = "Festival" },
            new() { Code = "SPORT", Label = "Takmicenje" },
            new() { Code = "EXHIBITION", Label = "Izlozba" },
            new() { Code = "TOUR", Label = "Tura" },
            new() { Code = "THEATER", Label = "Pozoriste" },
            new() { Code = "CONFERENCE", Label = "Konferencija" },
            new() { Code = "OTHER", Label = "Ostalo" }
        ];

        private readonly AppDbContext _context;

        public EventsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("categories")]
        public IActionResult GetCategories()
        {
            return Ok(new
            {
                data = EventCategories
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] uint? destinationId,
            [FromQuery] string? category,
            [FromQuery] string? from,
            [FromQuery] string? to,
            [FromQuery] string? sortBy = "startAt",
            [FromQuery] string? sortDir = "asc",
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var role = User.FindFirstValue(ClaimTypes.Role);
            var adminId = GetAuthorizedAdminId();
            if (adminId is null)
                return Unauthorized(new { message = "Admin korisnik nije autentifikovan." });

            var whereClauses = new List<string> { "p.post_type = 'event'" };
            var parameters = new List<(string Name, object Value)>();

            if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
            {
                whereClauses.Add("p.admin_id = @adminId");
                parameters.Add(("@adminId", adminId.Value));
            }
            else if (!string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }

            if (destinationId.HasValue)
            {
                whereClauses.Add("p.region_id = @destinationId");
                parameters.Add(("@destinationId", destinationId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                whereClauses.Add("(LOWER(p.title) LIKE @search OR LOWER(COALESCE(p.description, '')) LIKE @search)");
                parameters.Add(("@search", $"%{search.Trim().ToLowerInvariant()}%"));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                if (!EventCategories.Any(x => string.Equals(x.Code, category.Trim(), StringComparison.OrdinalIgnoreCase)))
                    return BadRequest(new { message = $"Nepoznata kategorija '{category}'." });

                whereClauses.Add("LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.category')), '')) = @category");
                parameters.Add(("@category", category.Trim().ToLowerInvariant()));
            }

            if (TryParseDate(from, out var parsedFrom))
            {
                whereClauses.Add("CAST(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.event_end')) AS DATETIME) >= @from");
                parameters.Add(("@from", parsedFrom!.Value));
            }

            if (TryParseDate(to, out var parsedTo))
            {
                whereClauses.Add("CAST(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.event_start')) AS DATETIME) <= @to");
                parameters.Add(("@to", parsedTo!.Value));
            }

            var whereSql = string.Join(" AND ", whereClauses);
            var orderBySql = BuildOrderBySql(sortBy, sortDir);

            await _context.Database.OpenConnectionAsync();
            try
            {
                var connection = _context.Database.GetDbConnection();
                var total = await ExecuteCountAsync(connection, whereSql, parameters);
                var items = await ExecuteDataQueryAsync(connection, whereSql, orderBySql, parameters, page, pageSize);

                return Ok(new
                {
                    data = items,
                    total,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                });
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(uint id)
        {
            var post = await BuildAuthorizedEventQuery().FirstOrDefaultAsync(p => p.Id == id);
            if (post is null)
                return NotFound(new { success = false, message = "Dogadjaj nije pronadjen." });

            return Ok(new
            {
                success = true,
                data = MapToDto(post)
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateEventDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!IsValidCategory(dto.Category))
                return BadRequest(new { success = false, message = $"Nepoznata kategorija '{dto.Category}'." });

            if (dto.EndAt < dto.StartAt)
                return BadRequest(new { success = false, message = "Kraj dogadjaja mora biti nakon pocetka." });

            if (dto.DestinationId.HasValue)
            {
                var regionExists = await _context.Regions.AnyAsync(r => r.Id == dto.DestinationId.Value);
                if (!regionExists)
                    return BadRequest(new { success = false, message = $"Destinacija sa ID={dto.DestinationId.Value} ne postoji." });
            }

            var adminId = GetAuthorizedAdminId();
            if (adminId is null)
                return Unauthorized(new { success = false, message = "Admin korisnik nije autentifikovan." });

            var now = DateTime.UtcNow;
            var post = new Post
            {
                AdminId = adminId.Value,
                RegionId = dto.DestinationId,
                Title = dto.Name.Trim(),
                PostType = "event",
                Description = dto.Description.Trim(),
                Lat = dto.Latitude,
                Lng = dto.Longitude,
                ExternalUrl = string.IsNullOrWhiteSpace(dto.TicketUrl) ? null : dto.TicketUrl.Trim(),
                Details = BuildDetailsJson(dto.Category, dto.StartAt, dto.EndAt, dto.TicketUrl, dto.ObjectId),
                Status = "published",
                PublishedAt = now,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Posts.Add(post);
            await _context.SaveChangesAsync();

            var created = await _context.Posts
                .Include(p => p.Admin)
                    .ThenInclude(a => a.Organization)
                .Include(p => p.Region)
                .FirstAsync(p => p.Id == post.Id);

            return Ok(new
            {
                success = true,
                message = "Dogadjaj je uspesno kreiran.",
                data = MapToDto(created)
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpdateEventDto dto)
        {
            var post = await BuildAuthorizedEventQuery().FirstOrDefaultAsync(p => p.Id == id);
            if (post is null)
                return NotFound(new { success = false, message = "Dogadjaj nije pronadjen." });

            if (dto.DestinationId.HasValue)
            {
                var regionExists = await _context.Regions.AnyAsync(r => r.Id == dto.DestinationId.Value);
                if (!regionExists)
                    return BadRequest(new { success = false, message = $"Destinacija sa ID={dto.DestinationId.Value} ne postoji." });
                post.RegionId = dto.DestinationId.Value;
            }

            if (dto.Name is not null)
                post.Title = dto.Name.Trim();

            if (dto.Description is not null)
                post.Description = dto.Description.Trim();

            if (dto.Latitude.HasValue)
                post.Lat = dto.Latitude.Value;

            if (dto.Longitude.HasValue)
                post.Lng = dto.Longitude.Value;

            if (dto.TicketUrl is not null)
                post.ExternalUrl = string.IsNullOrWhiteSpace(dto.TicketUrl) ? null : dto.TicketUrl.Trim();

            var eventData = ReadEventData(post);

            if (dto.Category is not null)
            {
                if (!IsValidCategory(dto.Category))
                    return BadRequest(new { success = false, message = $"Nepoznata kategorija '{dto.Category}'." });
                eventData.Category = dto.Category.Trim().ToUpperInvariant();
            }

            if (dto.StartAt.HasValue)
                eventData.StartAt = dto.StartAt.Value;

            if (dto.EndAt.HasValue)
                eventData.EndAt = dto.EndAt.Value;

            if (eventData.EndAt < eventData.StartAt)
                return BadRequest(new { success = false, message = "Kraj dogadjaja mora biti nakon pocetka." });

            if (dto.ObjectId.HasValue || dto.DestinationId.HasValue || dto.Category is not null || dto.StartAt.HasValue || dto.EndAt.HasValue || dto.TicketUrl is not null)
            {
                eventData.ObjectId = dto.ObjectId ?? eventData.ObjectId;
                eventData.TicketUrl = dto.TicketUrl is null ? eventData.TicketUrl : (string.IsNullOrWhiteSpace(dto.TicketUrl) ? null : dto.TicketUrl.Trim());
                post.Details = BuildDetailsJson(eventData.Category, eventData.StartAt, eventData.EndAt, eventData.TicketUrl, eventData.ObjectId);
            }

            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updated = await _context.Posts
                .Include(p => p.Admin)
                    .ThenInclude(a => a.Organization)
                .Include(p => p.Region)
                .FirstAsync(p => p.Id == post.Id);

            return Ok(new
            {
                success = true,
                message = "Dogadjaj je uspesno izmenjen.",
                data = MapToDto(updated)
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(uint id)
        {
            var post = await BuildAuthorizedEventQuery().FirstOrDefaultAsync(p => p.Id == id);
            if (post is null)
                return NotFound(new { success = false, message = "Dogadjaj nije pronadjen." });

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Dogadjaj je uspesno obrisan."
            });
        }

        private IQueryable<Post> BuildAuthorizedEventQuery()
        {
            var query = _context.Posts
                .Include(p => p.Admin)
                    .ThenInclude(a => a.Organization)
                .Include(p => p.Region)
                .Where(p => p.PostType == "event");

            var role = User.FindFirstValue(ClaimTypes.Role);
            var adminId = GetAuthorizedAdminId();

            if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) && adminId.HasValue)
                query = query.Where(p => p.AdminId == adminId.Value);

            return query;
        }

        private static async Task<int> ExecuteCountAsync(
            DbConnection connection,
            string whereSql,
            List<(string Name, object Value)> parameters)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"""
                SELECT COUNT(*)
                FROM post p
                WHERE {whereSql}
                """;

            AddParameters(command, parameters);

            var result = await command.ExecuteScalarAsync();
            return result is null || result == DBNull.Value ? 0 : Convert.ToInt32(result);
        }

        private static async Task<List<EventDto>> ExecuteDataQueryAsync(
            DbConnection connection,
            string whereSql,
            string orderBySql,
            List<(string Name, object Value)> parameters,
            int page,
            int pageSize)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"""
                SELECT
                    p.id,
                    p.admin_id,
                    p.region_id,
                    p.title,
                    p.description,
                    p.lat,
                    p.lng,
                    p.external_url,
                    p.images,
                    p.created_at,
                    a.organization_id,
                    r.name AS region_name,
                    JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.category')) AS category,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.event_start')) AS DATETIME) AS event_start,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.event_end')) AS DATETIME) AS event_end,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.object_id')) AS UNSIGNED) AS object_id
                FROM post p
                LEFT JOIN admin_user a ON a.id = p.admin_id
                LEFT JOIN region r ON r.id = p.region_id
                WHERE {whereSql}
                ORDER BY {orderBySql}
                LIMIT @limit OFFSET @offset
                """;

            var allParameters = new List<(string Name, object Value)>(parameters)
            {
                ("@limit", pageSize),
                ("@offset", (page - 1) * pageSize)
            };

            AddParameters(command, allParameters);

            var items = new List<EventDto>();
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new EventDto
                {
                    EventId = GetUInt(reader, "id"),
                    DestinationId = GetNullableUInt(reader, "region_id"),
                    ObjectId = GetNullableUInt(reader, "object_id"),
                    OrganizationId = GetNullableUInt(reader, "organization_id"),
                    Name = GetString(reader, "title") ?? string.Empty,
                    Category = (GetString(reader, "category") ?? "OTHER").ToUpperInvariant(),
                    Description = GetString(reader, "description") ?? string.Empty,
                    StartAt = GetNullableDateTime(reader, "event_start") ?? DateTime.UtcNow,
                    EndAt = GetNullableDateTime(reader, "event_end") ?? DateTime.UtcNow,
                    TicketUrl = GetString(reader, "external_url"),
                    Latitude = GetNullableDecimal(reader, "lat"),
                    Longitude = GetNullableDecimal(reader, "lng"),
                    CreatedBy = GetUInt(reader, "admin_id"),
                    CreatedAt = GetDateTime(reader, "created_at"),
                    Destination = GetNullableUInt(reader, "region_id").HasValue
                        ? new EventLookupDto
                        {
                            Id = GetNullableUInt(reader, "region_id")!.Value,
                            Name = GetString(reader, "region_name") ?? string.Empty
                        }
                        : null,
                    Object = null,
                    Media = ParseMedia(GetString(reader, "images"))
                });
            }

            return items;
        }

        private static void AddParameters(DbCommand command, IEnumerable<(string Name, object Value)> parameters)
        {
            foreach (var (name, value) in parameters)
            {
                var parameter = command.CreateParameter();
                parameter.ParameterName = name;
                parameter.Value = value;
                command.Parameters.Add(parameter);
            }
        }

        private static string BuildOrderBySql(string? sortBy, string? sortDir)
        {
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();
            var direction = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase) ? "DESC" : "ASC";

            var column = normalizedSortBy switch
            {
                "name" => "p.title",
                "category" => "JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.category'))",
                "endat" => "CAST(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.event_end')) AS DATETIME)",
                "createdat" => "p.created_at",
                _ => "CAST(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.event_start')) AS DATETIME)"
            };

            return $"{column} {direction}, p.created_at DESC";
        }

        private uint? GetAuthorizedAdminId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            return uint.TryParse(value, out var adminId) ? adminId : null;
        }

        private static bool TryParseDate(string? input, out DateTime? value)
        {
            value = null;
            if (string.IsNullOrWhiteSpace(input))
                return false;

            if (!DateTime.TryParse(input, out var parsed))
                return false;

            value = parsed;
            return true;
        }

        private static bool IsValidCategory(string? category) =>
            !string.IsNullOrWhiteSpace(category) &&
            EventCategories.Any(x => string.Equals(x.Code, category.Trim(), StringComparison.OrdinalIgnoreCase));

        private static string BuildDetailsJson(string category, DateTime startAt, DateTime endAt, string? ticketUrl, uint? objectId)
        {
            var details = new Dictionary<string, object?>
            {
                ["category"] = category.Trim().ToUpperInvariant(),
                ["event_start"] = startAt,
                ["event_end"] = endAt
            };

            if (!string.IsNullOrWhiteSpace(ticketUrl))
                details["ticket_url"] = ticketUrl.Trim();

            if (objectId.HasValue)
                details["object_id"] = objectId.Value;

            return JsonSerializer.Serialize(details);
        }

        private static EventData ReadEventData(Post post)
        {
            var data = new EventData
            {
                Category = "OTHER",
                StartAt = post.PublishedAt ?? post.CreatedAt,
                EndAt = post.PublishedAt ?? post.CreatedAt,
                TicketUrl = post.ExternalUrl
            };

            if (string.IsNullOrWhiteSpace(post.Details))
                return data;

            using var document = JsonDocument.Parse(post.Details);
            var root = document.RootElement;

            if (root.TryGetProperty("category", out var categoryElement) && categoryElement.ValueKind == JsonValueKind.String)
                data.Category = categoryElement.GetString() ?? data.Category;

            if (root.TryGetProperty("event_start", out var startElement) && startElement.ValueKind == JsonValueKind.String && DateTime.TryParse(startElement.GetString(), out var startAt))
                data.StartAt = startAt;

            if (root.TryGetProperty("event_end", out var endElement) && endElement.ValueKind == JsonValueKind.String && DateTime.TryParse(endElement.GetString(), out var endAt))
                data.EndAt = endAt;

            if (root.TryGetProperty("ticket_url", out var ticketElement) && ticketElement.ValueKind == JsonValueKind.String)
                data.TicketUrl = ticketElement.GetString();

            if (root.TryGetProperty("object_id", out var objectIdElement) && objectIdElement.ValueKind == JsonValueKind.Number && objectIdElement.TryGetUInt32(out var objectId))
                data.ObjectId = objectId;

            return data;
        }

        private static EventDto MapToDto(Post post)
        {
            var eventData = ReadEventData(post);

            return new EventDto
            {
                EventId = post.Id,
                DestinationId = post.RegionId,
                ObjectId = eventData.ObjectId,
                OrganizationId = post.Admin?.OrganizationId,
                Name = post.Title,
                Category = eventData.Category,
                Description = post.Description ?? string.Empty,
                StartAt = eventData.StartAt,
                EndAt = eventData.EndAt,
                TicketUrl = eventData.TicketUrl ?? post.ExternalUrl,
                Latitude = post.Lat,
                Longitude = post.Lng,
                CreatedBy = post.AdminId,
                CreatedAt = post.CreatedAt,
                Destination = post.Region is null ? null : new EventLookupDto
                {
                    Id = post.Region.Id,
                    Name = post.Region.Name
                },
                Object = null,
                Media = ParseMedia(post.Images)
            };
        }

        private static List<EventMediaDto>? ParseMedia(string? imagesJson)
        {
            if (string.IsNullOrWhiteSpace(imagesJson))
                return null;

            try
            {
                using var document = JsonDocument.Parse(imagesJson);
                if (document.RootElement.ValueKind != JsonValueKind.Array)
                    return null;

                var media = new List<EventMediaDto>();
                var index = 0;
                foreach (var item in document.RootElement.EnumerateArray())
                {
                    if (item.ValueKind != JsonValueKind.String)
                        continue;

                    media.Add(new EventMediaDto
                    {
                        MediaId = (uint)(index + 1),
                        Url = item.GetString() ?? string.Empty,
                        SortOrder = index
                    });
                    index++;
                }

                return media.Count == 0 ? null : media;
            }
            catch
            {
                return null;
            }
        }

        private static string? GetString(DbDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetValue(ordinal)?.ToString();
        }

        private static uint GetUInt(DbDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? 0 : Convert.ToUInt32(reader.GetValue(ordinal));
        }

        private static uint? GetNullableUInt(DbDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : Convert.ToUInt32(reader.GetValue(ordinal));
        }

        private static decimal? GetNullableDecimal(DbDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : Convert.ToDecimal(reader.GetValue(ordinal));
        }

        private static DateTime GetDateTime(DbDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return Convert.ToDateTime(reader.GetValue(ordinal));
        }

        private static DateTime? GetNullableDateTime(DbDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : Convert.ToDateTime(reader.GetValue(ordinal));
        }

        private sealed class EventData
        {
            public string Category { get; set; } = "OTHER";
            public DateTime StartAt { get; set; }
            public DateTime EndAt { get; set; }
            public string? TicketUrl { get; set; }
            public uint? ObjectId { get; set; }
        }
    }
}