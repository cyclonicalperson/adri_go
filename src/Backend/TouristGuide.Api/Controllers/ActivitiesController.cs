using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/activities")]
    [Authorize(Roles = "admin,superadmin")]
    public class ActivitiesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly AdminIdentityService _adminIdentityService;
        private readonly AdminPermissionService _permissionService;
        private readonly NotificationService _notificationService;
        private const char SEP = '|';
        private const string INNER_SEP = "\u2630";

        public ActivitiesController(
            AppDbContext context,
            AdminIdentityService adminIdentityService,
            AdminPermissionService permissionService,
            NotificationService notificationService)
        {
            _context = context;
            _adminIdentityService = adminIdentityService;
            _permissionService = permissionService;
            _notificationService = notificationService;
        }

        private static readonly Dictionary<string, string> ColorMap = new()
        {
            ["SPORT"] = "#3b82f6",
            ["ADVENTURE"] = "#22c55e",
            ["WELLNESS"] = "#8b5cf6",
            ["SHOPPING"] = "#f59e0b",
            ["DINING"] = "#ef4444",
            ["NIGHTLIFE"] = "#1e1b4b",
            ["SIGHTSEEING"] = "#06b6d4",
            ["CULTURE"] = "#ec4899",
            ["OTHER"] = "#6b7280",
        };

        private static string EncodeColor(string subcat, string hex, string status,
            string? desc, string? duration, string? difficulty, int? capacity, string? tags)
        {
            var parts = new List<string> { subcat, hex, status };
            if (!string.IsNullOrWhiteSpace(desc)) parts.Add($"desc={Encode(desc)}");
            if (!string.IsNullOrWhiteSpace(duration)) parts.Add($"dur={Encode(duration)}");
            if (!string.IsNullOrWhiteSpace(difficulty)) parts.Add($"diff={Encode(difficulty)}");
            if (capacity.HasValue) parts.Add($"cap={capacity.Value}");
            if (!string.IsNullOrWhiteSpace(tags)) parts.Add($"tags={Encode(tags)}");
            return string.Join(SEP, parts);
        }

        private static string Encode(string? s) => (s ?? "").Replace("|", INNER_SEP);
        private static string Decode(string? s) => (s ?? "").Replace(INNER_SEP, "|");

        private static ActivityData DecodeColor(string? color)
        {
            var parts = (color ?? "").Split(SEP);
            var d = new ActivityData
            {
                Subcat = parts.Length >= 1 && parts[0].Length > 1 ? parts[0] : "OTHER",
                Hex = parts.Length >= 2 ? parts[1] : "#6b7280",
                Status = parts.Length >= 3 ? parts[2] : "approved",
            };
            for (int i = 3; i < parts.Length; i++)
            {
                var kv = parts[i];
                if (kv.StartsWith("desc=")) d.Description = Decode(kv[5..]);
                else if (kv.StartsWith("dur=")) d.Duration = Decode(kv[4..]);
                else if (kv.StartsWith("diff=")) d.Difficulty = Decode(kv[5..]);
                else if (kv.StartsWith("cap=") && int.TryParse(kv[4..], out var cap)) d.MaxCapacity = cap;
                else if (kv.StartsWith("tags=")) d.Tags = Decode(kv[5..]);
            }
            return d;
        }

        private class ActivityData
        {
            public string Subcat { get; set; } = "OTHER";
            public string Hex { get; set; } = "#6b7280";
            public string Status { get; set; } = "approved";
            public string? Description { get; set; }
            public string? Duration { get; set; }
            public string? Difficulty { get; set; }
            public int? MaxCapacity { get; set; }
            public string? Tags { get; set; }
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? category, [FromQuery] string? search, [FromQuery] string? status,
            [FromQuery] string? sortBy, [FromQuery] string? sortDir,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var isAdminRequest = User.IsInRole("admin") || User.IsInRole("superadmin");
            var query = _context.Tags.Where(t => t.Category == "aktivnost").AsQueryable();

            if (isAdminRequest)
            {
                if (!await _permissionService.CanManageTagsAsync())
                    return Forbid();

                if (!_adminIdentityService.IsSuperAdmin())
                {
                    var adminId = _adminIdentityService.GetAdminId();
                    if (adminId == null) return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });
                    var adminTagIds = await _context.PostTags
                        .Where(pt => pt.Post.AdminId == adminId.Value).Select(pt => pt.TagId).Distinct().ToListAsync();
                    query = query.Where(t => adminTagIds.Contains(t.Id));
                }
            }
            else
            {
                query = query.Where(t => t.Color == null
                    || (!t.Color.ToLower().Contains("|pending|") && !t.Color.ToLower().EndsWith("|pending")));
            }

            var adminFilteredQuery = query;

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(t => t.Name.Contains(search));
            if (!string.IsNullOrWhiteSpace(category) && category != "OTHER")
                query = query.Where(t => t.Color != null && t.Color.ToUpper().StartsWith(category.ToUpper() + "|"));
            else if (category == "OTHER")
            {
                // OTHER = sve što NIJE u poznatim kategorijama
                var known = new[] { "SPORT|", "ADVENTURE|", "WELLNESS|", "SHOPPING|", "DINING|", "NIGHTLIFE|", "SIGHTSEEING|", "CULTURE|" };
                foreach (var k in known)
                    query = query.Where(t => t.Color == null || !t.Color.ToUpper().StartsWith(k));
            }
            if (!string.IsNullOrWhiteSpace(status) && isAdminRequest)
            {
                var sl = status.ToLower();
                query = query.Where(t => t.Color != null &&
                    (t.Color.ToLower().Contains("|" + sl + "|") || t.Color.ToLower().EndsWith("|" + sl)));
            }

            var total = await query.CountAsync();
            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("name", "asc") => query.OrderBy(t => t.Name),
                ("name", _) => query.OrderByDescending(t => t.Name),
                (_, "asc") => query.OrderBy(t => t.Id),
                _ => query.OrderByDescending(t => t.Id)
            };

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 10;

            var tagIds = await query.Skip((page - 1) * pageSize).Take(pageSize).Select(t => t.Id).ToListAsync();
            var tags = await _context.Tags.Where(t => tagIds.Contains(t.Id)).ToListAsync();
            tags = tags.OrderBy(t => tagIds.IndexOf(t.Id)).ToList();

            var linkedPosts = await _context.PostTags
                .Include(pt => pt.Post).ThenInclude(p => p.Region)
                .Where(pt => tagIds.Contains(pt.TagId)).ToListAsync();

            var data = tags.Select(t =>
            {
                var veze = linkedPosts.Where(pt => pt.TagId == t.Id).ToList();
                var prviPost = veze.FirstOrDefault()?.Post;
                var d = DecodeColor(t.Color);
                return new
                {
                    id = t.Id,
                    activityId = t.Id,
                    name = t.Name,
                    category = d.Subcat,
                    color = d.Hex,
                    description = d.Description ?? "",
                    duration = d.Duration ?? "",
                    difficulty = d.Difficulty ?? "",
                    maxCapacity = d.MaxCapacity,
                    tags = d.Tags ?? "",
                    lat = prviPost?.Lat,
                    lng = prviPost?.Lng,
                    locationName = prviPost?.Region?.Name ?? prviPost?.Address ?? "",
                    postId = veze.FirstOrDefault()?.PostId,
                    viewCount = (uint)veze.Sum(pt => (long)pt.Post.ViewCount),
                    linkedPosts = veze.Count,
                    status = d.Status == "pending" ? "pending" : "approved"
                };
            }).ToList();

            var bq = adminFilteredQuery;
            var sportCount = await bq.CountAsync(t => t.Color != null && t.Color.ToUpper().StartsWith("SPORT|"));
            var natureCount = await bq.CountAsync(t => t.Color != null && (t.Color.ToUpper().StartsWith("ADVENTURE|") || t.Color.ToUpper().StartsWith("NATURE|") || t.Color.ToUpper().StartsWith("HIKING|")));
            var wellnessCount = await bq.CountAsync(t => t.Color != null && (t.Color.ToUpper().StartsWith("WELLNESS|") || t.Color.ToUpper().StartsWith("SPA|")));
            var pendingCount = await bq.CountAsync(t => t.Color != null && (t.Color.ToLower().Contains("|pending|") || t.Color.ToLower().EndsWith("|pending")));

            return Ok(new { data, total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize), sportCount, natureCount, wellnessCount, pendingCount });
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(uint id)
        {
            var isAdminRequest = User.IsInRole("admin") || User.IsInRole("superadmin");
            if (isAdminRequest && !await _permissionService.CanManageTagsAsync())
                return Forbid();

            var tag = await _context.Tags
                .Include(t => t.PostTags).ThenInclude(pt => pt.Post).ThenInclude(p => p.Region)
                .FirstOrDefaultAsync(t => t.Id == id && t.Category == "aktivnost");
            if (tag == null) return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });

            if (isAdminRequest && !_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null) return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });
                if (!tag.PostTags.Any(pt => pt.Post.AdminId == adminId.Value)) return Forbid();
            }

            var prviPost = tag.PostTags.FirstOrDefault()?.Post;
            var d = DecodeColor(tag.Color);
            if (!isAdminRequest && d.Status == "pending")
                return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });
            return Ok(new
            {
                data = new
                {
                    activityId = tag.Id,
                    id = tag.Id,
                    name = tag.Name,
                    category = d.Subcat,
                    color = d.Hex,
                    description = d.Description ?? "",
                    duration = d.Duration ?? "",
                    difficulty = d.Difficulty ?? "",
                    maxCapacity = d.MaxCapacity,
                    tags = d.Tags ?? "",
                    status = d.Status,
                    lat = prviPost?.Lat,
                    lng = prviPost?.Lng,
                    locationName = prviPost?.Region?.Name ?? prviPost?.Address ?? "",
                    postId = tag.PostTags.FirstOrDefault()?.PostId
                },
                success = true
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateActivityDto dto)
        {
            if (!await _permissionService.CanManageTagsAsync())
                return Forbid();

            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Naziv aktivnosti je obavezan." });

            var subcat = dto.Category?.ToUpper() ?? "OTHER";
            var hex = ColorMap.GetValueOrDefault(subcat, "#6b7280");
            var statusFlag = string.Equals(dto.Status, "pending", StringComparison.OrdinalIgnoreCase) ? "pending" : "approved";

            var noviTag = new Tag
            {
                Name = dto.Name.Trim(),
                Category = "aktivnost",
                Color = EncodeColor(subcat, hex, statusFlag, dto.Description, dto.Duration, dto.Difficulty, dto.MaxCapacity, dto.Tags),
            };
            _context.Tags.Add(noviTag);
            await _context.SaveChangesAsync();

            if (dto.PostId.HasValue)
            {
                if (!await CanAttachToPostAsync(dto.PostId.Value))
                    return Forbid();

                if (await _context.Posts.AnyAsync(p => p.Id == dto.PostId.Value))
                {
                    _context.PostTags.Add(new PostTag { PostId = dto.PostId.Value, TagId = noviTag.Id });
                    await _context.SaveChangesAsync();
                }
            }
            if (statusFlag == "pending")
            {
                await _notificationService.BroadcastToSuperAdminsAsync(
                    "activity_pending",
                    "Nova aktivnost ceka pregled",
                    $"Aktivnost \"{noviTag.Name}\" je poslata na odobrenje.",
                    new { activityId = noviTag.Id, postId = dto.PostId, url = "/admin/aktivnosti" });
            }
            return Ok(new { data = new { activityId = noviTag.Id, id = noviTag.Id }, success = true });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(uint id, [FromBody] CreateActivityDto dto)
        {
            if (!await _permissionService.CanManageTagsAsync())
                return Forbid();

            var tag = await _context.Tags.FindAsync(id);
            if (tag == null) return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });

            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null) return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });
                if (!await _context.PostTags.AnyAsync(pt => pt.TagId == id && pt.Post.AdminId == adminId.Value)) return Forbid();
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) tag.Name = dto.Name.Trim();

            var existing = DecodeColor(tag.Color);
            var subcat = !string.IsNullOrWhiteSpace(dto.Category) ? dto.Category.ToUpper() : existing.Subcat;
            var hex = ColorMap.GetValueOrDefault(subcat, existing.Hex);
            var statusFlag = !string.IsNullOrWhiteSpace(dto.Status) ? dto.Status.ToLower() : existing.Status;

            // null = nije poslano (ne mijenjaj), "" = eksplicitno briši
            var newDesc = dto.Description != null ? dto.Description : existing.Description;
            var newDur = dto.Duration != null ? dto.Duration : existing.Duration;
            var newDiff = dto.Difficulty != null ? dto.Difficulty : existing.Difficulty;
            var newCap = dto.MaxCapacity.HasValue ? dto.MaxCapacity : existing.MaxCapacity;
            var newTags = dto.Tags != null ? dto.Tags : existing.Tags;

            tag.Color = EncodeColor(subcat, hex, statusFlag, newDesc, newDur, newDiff, newCap, newTags);
            await _context.SaveChangesAsync();

            // PostTag logika:
            // ClearPost=true  → odvezi (standalone)
            // PostId ima vrijednost → vezuj za taj post (zamijeni staru vezu)
            // Ni jedno ni drugo → ne diraj vezu
            if (dto.ClearPost)
            {
                var links = await _context.PostTags.Where(pt => pt.TagId == id).ToListAsync();
                if (links.Count > 0) { _context.PostTags.RemoveRange(links); await _context.SaveChangesAsync(); }
            }
            else if (dto.PostId.HasValue)
            {
                if (!await CanAttachToPostAsync(dto.PostId.Value))
                    return Forbid();

                var links = await _context.PostTags.Where(pt => pt.TagId == id).ToListAsync();
                _context.PostTags.RemoveRange(links);
                if (await _context.Posts.AnyAsync(p => p.Id == dto.PostId.Value))
                    _context.PostTags.Add(new PostTag { PostId = dto.PostId.Value, TagId = id });
                await _context.SaveChangesAsync();
            }

            if (statusFlag == "pending" && existing.Status != "pending")
            {
                await _notificationService.BroadcastToSuperAdminsAsync(
                    "activity_pending",
                    "Aktivnost ceka pregled",
                    $"Aktivnost \"{tag.Name}\" je prebacena na odobrenje.",
                    new { activityId = tag.Id, postId = dto.PostId, url = "/admin/aktivnosti" });
            }

            return Ok(new { success = true });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(uint id)
        {
            if (!await _permissionService.CanManageTagsAsync())
                return Forbid();

            var tag = await _context.Tags.FindAsync(id);
            if (tag == null) return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });

            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null) return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });
                if (!await _context.PostTags.AnyAsync(pt => pt.TagId == id && pt.Post.AdminId == adminId.Value)) return Forbid();
            }
            _context.Tags.Remove(tag);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        private async Task<bool> CanAttachToPostAsync(uint postId)
        {
            if (_adminIdentityService.IsSuperAdmin())
                return await _context.Posts.AnyAsync(p => p.Id == postId);

            var adminId = _adminIdentityService.GetAdminId();
            if (adminId == null)
                return false;

            return await _context.Posts.AnyAsync(p => p.Id == postId && p.AdminId == adminId.Value);
        }
    }

    public class CreateActivityDto
    {
        public string Name { get; set; } = "";
        public string? Category { get; set; }
        public string? Description { get; set; }
        public string? Duration { get; set; }
        public string? Difficulty { get; set; }
        public int? MaxCapacity { get; set; }
        public string? Tags { get; set; }
        public string? Color { get; set; }
        public string? Status { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public uint? PostId { get; set; }
        /// <summary>true = eksplicitno odvezi od lokacije (standalone)</summary>
        public bool ClearPost { get; set; } = false;
    }
}
