using System.IdentityModel.Tokens.Jwt;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Interfaces;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IReviewService _reviewService;
        private readonly AdminPermissionService _permissionService;
        private readonly NotificationService _notificationService;

        private static readonly HashSet<string> AllowedPostTypes = new()
        {
            "accommodation", "restaurant", "club", "cultural_site",
            "monument", "sports_facility", "event", "attraction", "shop", "other"
        };

        private static readonly HashSet<string> AllowedStatuses = new()
        {
            "draft", "published", "archived"
        };

        public PostsController(
            AppDbContext context,
            IReviewService reviewService,
            AdminPermissionService permissionService,
            NotificationService notificationService)
        {
            _context = context;
            _reviewService = reviewService;
            _permissionService = permissionService;
            _notificationService = notificationService;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll(
            [FromQuery] uint? region_id,
            [FromQuery] string? type,
            [FromQuery] string? excludeType,
            [FromQuery] string? status,
            [FromQuery] string? country,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = BuildFilteredPostsQuery(region_id, type, status, country, forcePublishedOnly: false, out var error);
            if (error is not null)
                return error;

            // Isključi određeni tip (npr. excludeType=event za listu lokacija)
            var normalizedStatus = NormalizeStatusValue(status);
            if (!IsSuperAdmin() &&
                !string.IsNullOrWhiteSpace(normalizedStatus) &&
                !string.Equals(normalizedStatus, "published", StringComparison.OrdinalIgnoreCase) &&
                !await _permissionService.HasPermissionAsync("manage_own_posts", region_id))
            {
                return Forbid();
            }

            if (!string.IsNullOrWhiteSpace(excludeType))
                query = query!.Where(p => p.PostType != excludeType.ToLower().Trim());

            // Regular admins only see their own posts
            if (!IsSuperAdmin())
            {
                var adminId = GetCurrentAdminId();
                if (adminId.HasValue)
                    query = query!.Where(p => p.AdminId == adminId.Value);
            }

            // Search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                var terms = SplitSearchTerms(search);
                query = terms.Count > 0
                    ? ApplyPostSearchTerms(query!, terms)
                    : query!.Where(p =>
                        p.Title.Contains(search) ||
                        (p.Description != null && p.Description.Contains(search)) ||
                        (p.Address != null && p.Address.Contains(search)) ||
                        (p.Region != null && p.Region.Name.Contains(search)));
            }

            return Ok(await BuildPagedPostsResponse(query!, page, pageSize, sortBy, sortDir));
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic(
            [FromQuery] uint? region_id,
            [FromQuery] string? type,
            [FromQuery] string? country,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = BuildFilteredPostsQuery(region_id, type, "published", country, forcePublishedOnly: true, out var error);
            if (error is not null)
                return error;

            return Ok(await BuildPagedPostsResponse(query!, page, pageSize));
        }

        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchPublic(
            [FromQuery] string? q,
            [FromQuery] decimal? lat,
            [FromQuery] decimal? lng,
            [FromQuery] string? type,
            [FromQuery] string? country,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var search = q?.Trim();
            if (string.IsNullOrWhiteSpace(search))
            {
                var publicQuery = BuildFilteredPostsQuery(null, type, "published", country, forcePublishedOnly: true, out var publicError);
                if (publicError is not null)
                    return publicError;

                return Ok(await BuildPagedPostsResponse(publicQuery!, page, pageSize));
            }

            var query = BuildFilteredPostsQuery(null, type, "published", country, forcePublishedOnly: true, out var error);
            if (error is not null)
                return error;

            // Razdvajamo unos da bi npr. "kotor tvrdjava" koristio "kotor" kao region,
            // a ostatak pretrage trazio samo unutar tog regiona.
            var searchTerms = SplitSearchTerms(search);
            var regions = await _context.Regions
                .AsNoTracking()
                .Where(r => r.IsActive)
                .ToListAsync();

            var normalizedSearch = NormalizeSearchText(search);
            // Region trazimo pre objava, da drzava/region/grad ne moraju da postoje
            // u naslovu ili opisu same objave.
            var matchedRegions = regions
                .Select(region => new
                {
                    Region = region,
                    Tokens = SplitSearchTerms($"{region.Name} {region.Country} {region.Type}")
                })
                .Where(region => region.Tokens.Any(token => searchTerms.Contains(token))
                    || NormalizeSearchText(region.Region.Name).Contains(normalizedSearch)
                    || NormalizeSearchText(region.Region.Country).Contains(normalizedSearch))
                .ToList();

            var regionMatches = matchedRegions
                .Select(region => region.Region.Id)
                .ToList();

            var regionTerms = matchedRegions
                .SelectMany(region => region.Tokens)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var remainingTerms = searchTerms
                .Where(term => !regionTerms.Contains(term))
                .ToList();

            var isRegionSearch = regionMatches.Count > 0;
            if (isRegionSearch)
            {
                query = query!.Where(p => p.RegionId != null && regionMatches.Contains(p.RegionId.Value));

                // Unutar pogodjenog regiona trazimo samo deo upita koji nije region.
                if (remainingTerms.Count > 0)
                    query = ApplyPostSearchTerms(query, remainingTerms);
            }
            else
            {
                query = ApplyPostSearchTerms(query!, searchTerms);
            }

            if (!isRegionSearch && lat.HasValue && lng.HasValue)
            {
                // Za obicnu tekstualnu pretragu zadrzavamo rezultate blizu korisnika/centra mape.
                // Koristimo aproksimaciju za mali radius koju SQL moze da filtrira i sortira.
                const double radiusKm = 10;
                var lngKmFactor = 111.32m * (decimal)Math.Cos(ToRadians((double)lat.Value));
                var radiusSquared = (decimal)(radiusKm * radiusKm);

                query = query
                    .Where(p => p.Lat != null && p.Lng != null)
                    .Where(p =>
                        ((p.Lat!.Value - lat.Value) * 111.32m * (p.Lat.Value - lat.Value) * 111.32m) +
                        ((p.Lng!.Value - lng.Value) * lngKmFactor * (p.Lng.Value - lng.Value) * lngKmFactor) <= radiusSquared);

                query = query
                    .OrderBy(p =>
                        ((p.Lat!.Value - lat.Value) * 111.32m * (p.Lat.Value - lat.Value) * 111.32m) +
                        ((p.Lng!.Value - lng.Value) * lngKmFactor * (p.Lng.Value - lng.Value) * lngKmFactor))
                    .ThenByDescending(p => p.AvgRating ?? 0);

                return Ok(await BuildPagedPostsResponse(query, page, pageSize, sortBy: "distance"));
            }

            return Ok(await BuildPagedPostsResponse(
                query,
                page,
                pageSize,
                isRegionSearch ? "rating" : "createdat",
                "desc"));
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(uint id)
        {
            var post = await _context.Posts
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            if (!string.Equals(post.Status, "published", StringComparison.OrdinalIgnoreCase) && !await CanViewUnpublishedPostAsync(post))
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            // Include like/save status for the requesting tourist (if logged in as tourist)
            bool? isLiked = null;
            bool? isSaved = null;
            var touristId = GetAuthorizedTouristId();
            if (touristId.HasValue)
            {
                isLiked = await _context.PostLikes.AnyAsync(l => l.PostId == id && l.TouristId == touristId.Value);
                isSaved = await _context.SavedPosts.AnyAsync(s => s.PostId == id && s.TouristId == touristId.Value);
            }

            // Always compute live counts so stale seed data doesn't display wrong numbers
            uint liveLikeCount   = (uint)await _context.PostLikes.CountAsync(l => l.PostId == id);
            uint liveSaveCount   = (uint)await _context.SavedPosts.CountAsync(s => s.PostId == id);
            uint liveReviewCount = (uint)await _context.Reviews.CountAsync(r => r.PostId == id && r.Status == "APPROVED");
            decimal? liveAvgRating = await _context.Reviews
                .Where(r => r.PostId == id && r.Status == "APPROVED")
                .AverageAsync(r => (decimal?)r.Rating);

            return Ok(MapToDto(post, isLiked, isSaved, liveLikeCount, liveSaveCount, liveReviewCount, liveAvgRating, await CanSeePendingActivitiesAsync()));
        }

        [HttpGet("my-saved")]
        [Authorize]
        public async Task<IActionResult> GetMySavedPosts()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                return Unauthorized(new { message = "Niste ulogovani ili fali ID u tokenu." });

            if (!uint.TryParse(userIdClaim.Value, out uint touristId))
                return BadRequest(new { message = "Neispravan format ID-ja korisnika." });

            var savedItems = await _context.SavedPosts
                .Where(sp => sp.TouristId == touristId)
                .Include(sp => sp.Post)
                    .ThenInclude(p => p.Admin)
                .Include(sp => sp.Post)
                    .ThenInclude(p => p.Region)
                .ToListAsync();

            // Get the set of post IDs that this tourist has liked, so we can mark each post correctly
            var likedPostIds = new HashSet<uint>(await _context.PostLikes
                .Where(l => l.TouristId == touristId)
                .Select(l => l.PostId)
                .ToListAsync());

            var includePendingActivities = await CanSeePendingActivitiesAsync();
            var postsDto = savedItems
                .Select(sp => MapToDto(sp.Post, isLiked: likedPostIds.Contains(sp.PostId), isSaved: true, includePendingActivities: includePendingActivities))
                .ToList();
            return Ok(postsDto);
        }

        [HttpGet("{id}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(uint id)
        {
            var result = await _reviewService.GetReviewsByPostId(id);
            if (!result.PostExists)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var touristId = GetAuthorizedTouristId();
            var myReview = touristId.HasValue
                ? await _context.Reviews
                    .AsNoTracking()
                    .Where(r => r.PostId == id && r.TouristId == touristId.Value)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new { r.Id, r.Status })
                    .FirstOrDefaultAsync()
                : null;

            return Ok(new
            {
                total = result.Reviews.Count,
                myReviewStatus = myReview?.Status,
                myReviewId = myReview?.Id,
                data = result.Reviews
            });
        }

        [HttpPost("{id}/reviews")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> CreateReview(uint id, [FromBody] CreateReviewDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var result = await _reviewService.CreateReview(id, touristId.Value, dto);

            if (!result.Succeeded)
            {
                return result.Failure switch
                {
                    CreateReviewFailure.PostNotFound => NotFound(new { message = result.Message }),
                    CreateReviewFailure.TouristNotFound => Unauthorized(new { message = result.Message }),
                    CreateReviewFailure.DuplicateReview => Conflict(new { message = result.Message }),
                    _ => BadRequest(new { message = "Recenziju nije moguce sacuvati." })
                };
            }

            return CreatedAtAction(
                nameof(GetReviews),
                new { id },
                result.Review
            );
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Create([FromBody] CreatePostDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // AdminId se čita iz JWT tokena; ignoriši vrednost iz tela zahteva
            var jwtAdminId = GetCurrentAdminId();
            if (jwtAdminId.HasValue)
                dto.AdminId = jwtAdminId.Value;

            var postTypeLower = dto.PostType.ToLower().Trim();
            if (!AllowedPostTypes.Contains(postTypeLower))
                return BadRequest(new { message = $"Nepoznat tip '{dto.PostType}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });

            var statusLower = dto.Status.ToLower().Trim();
            if (!AllowedStatuses.Contains(statusLower))
                return BadRequest(new { message = "Status mora biti: draft, published ili archived." });

            var adminExists = await _context.AdminUsers.AnyAsync(a => a.Id == dto.AdminId);
            if (!adminExists)
                return BadRequest(new { message = $"Admin sa ID={dto.AdminId} ne postoji." });

            var proposedRegionName = NormalizeProposedRegionName(dto.ProposedRegionName);
            if (dto.RegionId.HasValue && proposedRegionName is not null)
                return BadRequest(new { message = "Ne mozete istovremeno izabrati postojeci region i poslati predlog novog regiona." });

            var hasRegionProposal = !dto.RegionId.HasValue && proposedRegionName is not null;
            var country = await ResolveCountryForPostAsync(dto.Country, dto.RegionId);

            if (dto.RegionId.HasValue)
            {
                var regionExists = await _context.Regions.AnyAsync(r => r.Id == dto.RegionId.Value);
                if (!regionExists)
                    return BadRequest(new { message = $"Region sa ID={dto.RegionId} ne postoji." });
            }

            if (statusLower == "published" && hasRegionProposal && !IsSuperAdmin())
                return Forbid();

            if (!await CanCreatePostAsync(postTypeLower, dto.RegionId, hasRegionProposal))
                return Forbid();

            var now = DateTime.UtcNow;
            var resolvedRegionId = statusLower == "published" && hasRegionProposal
                ? await ResolveRegionProposalAsync(proposedRegionName!, country)
                : dto.RegionId;
            var post = new Post
            {
                AdminId = dto.AdminId,
                RegionId = resolvedRegionId,
                ProposedRegionName = resolvedRegionId.HasValue ? null : proposedRegionName,
                Country = country,
                Title = dto.Title.Trim(),
                PostType = postTypeLower,
                Description = dto.Description?.Trim(),
                Lat = dto.Lat,
                Lng = dto.Lng,
                Address = dto.Address?.Trim(),
                ExternalUrl = dto.ExternalUrl?.Trim(),
                ExternalUrlLabel = dto.ExternalUrlLabel?.Trim(),
                Images = dto.ImagesToString(),
                OpeningHours = dto.OpeningHoursToString(),
                Details = dto.DetailsToString(),
                Status = statusLower,
                PublishedAt = statusLower == "published" ? now : null,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Posts.Add(post);
            await _context.SaveChangesAsync();

            if (dto.TagIds is not null)
                await ReplacePostTagsAsync(post.Id, dto.TagIds);

            if (hasRegionProposal && !resolvedRegionId.HasValue)
                await NotifyRegionProposalAsync(proposedRegionName!, post);

            await RecordHeatmapSampleForProposedLocationAsync(post);

            await _context.Entry(post).Reference(p => p.Admin).LoadAsync();
            await _context.Entry(post).Reference(p => p.Region).LoadAsync();
            await _context.Entry(post).Collection(p => p.PostTags).Query().Include(pt => pt.Tag).LoadAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = post.Id },
                MapToDto(post, includePendingActivities: await CanSeePendingActivitiesAsync())
            );
        }

        [HttpPost("{id:int}/toggle-save")]
        [Authorize]
        public async Task<IActionResult> ToggleSavePost(uint id)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                return Unauthorized(new { message = "Niste ulogovani." });

            if (!uint.TryParse(userIdClaim.Value, out uint touristId))
                return BadRequest(new { message = "Neispravan format ID-ja." });

            var post = await _context.Posts.FindAsync(id);
            if (post == null)
                return NotFound(new { message = "Lokacija nije pronađena." });

            var existingSave = await _context.SavedPosts
                .FirstOrDefaultAsync(sp => sp.TouristId == touristId && sp.PostId == id);

            if (existingSave != null)
            {
                _context.SavedPosts.Remove(existingSave);
                await _context.SaveChangesAsync();
                return Ok(new { isSaved = false, message = "Uklonjeno iz sačuvanih." });
            }
            else
            {
                var newSave = new SavedPost { TouristId = touristId, PostId = id };
                _context.SavedPosts.Add(newSave);
                await _context.SaveChangesAsync();
                return Ok(new { isSaved = true, message = "Dodato u sačuvane." });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpdatePostDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var post = await _context.Posts
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            if (!await CanManagePostAsync(post))
                return Forbid();

            var previousProposedRegion = post.ProposedRegionName;
            var nextProposedRegionName = NormalizeProposedRegionName(dto.ProposedRegionName);
            if (dto.RegionId.HasValue && nextProposedRegionName is not null)
                return BadRequest(new { message = "Ne mozete istovremeno izabrati postojeci region i poslati predlog novog regiona." });

            if (dto.RegionId.HasValue)
            {
                var regionExists = await _context.Regions.AnyAsync(r => r.Id == dto.RegionId.Value);
                if (!regionExists)
                    return BadRequest(new { message = $"Region sa ID={dto.RegionId} ne postoji." });
                post.RegionId = dto.RegionId.Value;
                post.ProposedRegionName = null;
                post.Country = await ResolveCountryForPostAsync(dto.Country, dto.RegionId.Value);
            }
            else if (dto.ProposedRegionName is not null)
            {
                post.ProposedRegionName = nextProposedRegionName;
            }

            if (dto.Country is not null)
                post.Country = NormalizeCountry(dto.Country);

            if (dto.Title is not null)
                post.Title = dto.Title.Trim();

            if (dto.PostType is not null)
            {
                var typeLower = dto.PostType.ToLower().Trim();
                if (!AllowedPostTypes.Contains(typeLower))
                    return BadRequest(new { message = $"Nepoznat tip '{dto.PostType}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });

                if (!string.Equals(typeLower, post.PostType, StringComparison.OrdinalIgnoreCase) &&
                    !await CanCreatePostAsync(typeLower, post.RegionId, !string.IsNullOrWhiteSpace(post.ProposedRegionName)))
                    return Forbid();

                post.PostType = typeLower;
            }

            if (dto.Description is not null)
                post.Description = dto.Description.Trim();

            if (dto.Lat.HasValue)
                post.Lat = dto.Lat.Value;

            if (dto.Lng.HasValue)
                post.Lng = dto.Lng.Value;

            if (dto.Address is not null)
                post.Address = dto.Address.Trim();

            if (dto.ExternalUrl is not null)
                post.ExternalUrl = dto.ExternalUrl.Trim();

            if (dto.ExternalUrlLabel is not null)
                post.ExternalUrlLabel = dto.ExternalUrlLabel.Trim();

            if (dto.Images is not null)
                post.Images = dto.ImagesToString();

            if (dto.OpeningHours is not null)
                post.OpeningHours = dto.OpeningHoursToString();

            if (dto.Details is not null)
                post.Details = dto.DetailsToString();

            if (dto.Status is not null)
            {
                var statusLower = dto.Status.ToLower().Trim();
                if (!AllowedStatuses.Contains(statusLower))
                    return BadRequest(new { message = "Status mora biti: draft, published ili archived." });

                if (statusLower == "published" && post.ProposedRegionName is not null && !IsSuperAdmin())
                    return Forbid();

                if (statusLower == "published" && post.ProposedRegionName is not null)
                {
                    post.RegionId = await ResolveRegionProposalAsync(post.ProposedRegionName, post.Country);
                    post.ProposedRegionName = null;
                }

                if (statusLower == "published" && post.Status != "published")
                    post.PublishedAt = DateTime.UtcNow;

                post.Status = statusLower;
            }

            // Ažuriranje tag veza
            if (dto.TagIds is not null)
                await ReplacePostTagsAsync(id, dto.TagIds);

            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(post.ProposedRegionName) &&
                !string.Equals(previousProposedRegion, post.ProposedRegionName, StringComparison.OrdinalIgnoreCase))
            {
                await NotifyRegionProposalAsync(post.ProposedRegionName, post);
            }

            await RecordHeatmapSampleForProposedLocationAsync(post);

            await _context.Entry(post).Reference(p => p.Admin).LoadAsync();
            await _context.Entry(post).Reference(p => p.Region).LoadAsync();
            await _context.Entry(post).Collection(p => p.PostTags).Query().Include(pt => pt.Tag).LoadAsync();

            return Ok(MapToDto(post, includePendingActivities: await CanSeePendingActivitiesAsync()));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            if (!await CanManagePostAsync(post))
                return Forbid();

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Objava '{post.Title}' (ID={id}) je uspešno obrisana." });
        }

        [HttpPost("{id}/like")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Like(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var likeExists = await _context.PostLikes.AnyAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (likeExists)
                return Ok(new { message = "Objava je vec lajkovana.", likeCount = post.LikeCount });

            _context.PostLikes.Add(new PostLike
            {
                PostId = id,
                TouristId = touristId.Value,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await RefreshLikeCount(post);

            return Ok(new { message = "Objava je uspesno lajkovana.", likeCount = post.LikeCount });
        }

        [HttpDelete("{id}/like")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Unlike(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var like = await _context.PostLikes.FirstOrDefaultAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (like is null)
                return Ok(new { message = "Objava nije bila lajkovana.", likeCount = post.LikeCount });

            _context.PostLikes.Remove(like);
            await _context.SaveChangesAsync();
            await RefreshLikeCount(post);

            return Ok(new { message = "Lajk je uklonjen.", likeCount = post.LikeCount });
        }

        [HttpPost("{id}/save")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Save(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var saveExists = await _context.SavedPosts.AnyAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (saveExists)
                return Ok(new { message = "Objava je vec sacuvana.", saveCount = post.SaveCount });

            _context.SavedPosts.Add(new SavedPost
            {
                PostId = id,
                TouristId = touristId.Value,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await RefreshSaveCount(post);

            return Ok(new { message = "Objava je uspesno sacuvana.", saveCount = post.SaveCount });
        }

        [HttpDelete("{id}/save")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Unsave(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var savedPost = await _context.SavedPosts.FirstOrDefaultAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (savedPost is null)
                return Ok(new { message = "Objava nije bila sacuvana.", saveCount = post.SaveCount });

            _context.SavedPosts.Remove(savedPost);
            await _context.SaveChangesAsync();
            await RefreshSaveCount(post);

            return Ok(new { message = "Sačuvana objava je uklonjena.", saveCount = post.SaveCount });
        }

        [HttpPost("{id}/view")]
        [AllowAnonymous]
        public async Task<IActionResult> RegisterView(uint id)
        {
            var touristId = GetAuthorizedTouristId();

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            _context.PostViews.Add(new PostView
            {
                PostId = id,
                TouristId = touristId,
                CreatedAt = DateTime.UtcNow
            });

            post.ViewCount += 1;
            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Pregled je evidentiran.", viewCount = post.ViewCount });
        }

        #region Private Helpers

        private IQueryable<Post> BuildFilteredPostsQuery(
            uint? regionId,
            string? type,
            string? status,
            string? country,
            bool forcePublishedOnly,
            out IActionResult? error)
        {
            error = null;

            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
                .AsQueryable();

            if (regionId.HasValue)
                query = query.Where(p => p.RegionId == regionId.Value);

            var normalizedCountry = NormalizeOptionalSearch(country);
            if (normalizedCountry is not null)
                query = query.Where(p => p.Country.ToLower() == normalizedCountry
                    || (p.Region != null && p.Region.Country.ToLower() == normalizedCountry));

            if (!string.IsNullOrWhiteSpace(type))
            {
                var typeLower = type.ToLower().Trim();
                if (!AllowedPostTypes.Contains(typeLower))
                {
                    error = BadRequest(new { message = $"Nepoznat tip '{type}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });
                    return query;
                }
                query = query.Where(p => p.PostType == typeLower);
            }

            if (forcePublishedOnly)
            {
                query = query.Where(p =>
                    p.Status == "published" &&
                    (p.RegionId == null || (p.Region != null && p.Region.IsActive)));
                return query;
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusLower = status.ToLower().Trim();
                if (!AllowedStatuses.Contains(statusLower))
                {
                    error = BadRequest(new { message = $"Nepoznat status '{status}'. Dozvoljeni: draft, published, archived" });
                    return query;
                }
                query = query.Where(p => p.Status == statusLower);
            }
            else
            {
                query = query.Where(p => p.Status == "published");
            }

            return query;
        }

        private async Task<object> BuildPagedPostsResponse(
            IQueryable<Post> query, int page, int pageSize,
            string? sortBy = null, string? sortDir = null)
        {
            if (page < 1) page = 1;
            pageSize = NormalizePageSize(pageSize);

            var total = await query.CountAsync();

            // Sortiranje
            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("distance", _) => query,
                ("title" or "name", "asc") => query.OrderBy(p => p.Title),
                ("title" or "name", _) => query.OrderByDescending(p => p.Title),
                ("viewcount", "asc") => query.OrderBy(p => p.ViewCount),
                ("viewcount", _) => query.OrderByDescending(p => p.ViewCount),
                ("createdat", "asc") => query.OrderBy(p => p.CreatedAt),
                ("createdat", _) => query.OrderByDescending(p => p.CreatedAt),
                ("updatedat", "asc") => query.OrderBy(p => p.UpdatedAt),
                ("updatedat", _) => query.OrderByDescending(p => p.UpdatedAt),
                ("averagerating" or "rating", "asc") => query.OrderBy(p => p.AvgRating),
                ("averagerating" or "rating", _) => query.OrderByDescending(p => p.AvgRating),
                _ => query.OrderByDescending(p => p.CreatedAt),
            };

            var posts = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Batch-fetch live counts for this page (3 queries instead of N*3)
            var postIds = posts.Select(p => p.Id).ToList();

            var likeCounts = await _context.PostLikes
                .Where(l => postIds.Contains(l.PostId))
                .GroupBy(l => l.PostId)
                .Select(g => new { PostId = g.Key, Count = (uint)g.Count() })
                .ToDictionaryAsync(x => x.PostId, x => x.Count);

            var saveCounts = await _context.SavedPosts
                .Where(s => postIds.Contains(s.PostId))
                .GroupBy(s => s.PostId)
                .Select(g => new { PostId = g.Key, Count = (uint)g.Count() })
                .ToDictionaryAsync(x => x.PostId, x => x.Count);

            var reviewStats = await _context.Reviews
                .Where(r => r.PostId != null && postIds.Contains(r.PostId.Value) && r.Status == "APPROVED")
                .GroupBy(r => r.PostId!.Value)
                .Select(g => new { PostId = g.Key, Count = (uint)g.Count(), Avg = g.Average(r => (decimal?)r.Rating) })
                .ToDictionaryAsync(x => x.PostId, x => x);

            var includePendingActivities = await CanSeePendingActivitiesAsync();
            var data = posts.Select(post => MapToDto(
                post,
                likeCountOverride:   likeCounts.TryGetValue(post.Id, out var lc) ? lc : 0u,
                saveCountOverride:   saveCounts.TryGetValue(post.Id, out var sc) ? sc : 0u,
                reviewCountOverride: reviewStats.TryGetValue(post.Id, out var rs) ? rs.Count : 0u,
                avgRatingOverride:   reviewStats.TryGetValue(post.Id, out var ra) ? ra.Avg : null,
                includePendingActivities: includePendingActivities
            )).ToList();

            return new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                data
            };
        }

        private static int NormalizePageSize(int pageSize) =>
            pageSize < 1 ? 20 : Math.Min(pageSize, 500);

        private static double ToRadians(double value) => value * Math.PI / 180;

        private static IQueryable<Post> ApplyPostSearchTerms(IQueryable<Post> query, IReadOnlyCollection<string> terms)
        {
            foreach (var term in terms)
            {
                // Svaki preostali termin je AND uslov, dok su polja objave OR uslovi.
                // Tako pretraga unutar regiona ostaje precizna.
                var alternateTerm = GetAlternateSearchTerm(term);

                query = alternateTerm is null
                    ? query.Where(p =>
                        p.Title.ToLower().Contains(term) ||
                        (p.Description != null && p.Description.ToLower().Contains(term)) ||
                        (p.Address != null && p.Address.ToLower().Contains(term)) ||
                        p.PostType.ToLower().Contains(term) ||
                        p.Country.ToLower().Contains(term) ||
                        (p.Region != null && (
                            p.Region.Name.ToLower().Contains(term) ||
                            p.Region.Country.ToLower().Contains(term))))
                    : query.Where(p =>
                        p.Title.ToLower().Contains(term) ||
                        p.Title.ToLower().Contains(alternateTerm) ||
                        (p.Description != null && (p.Description.ToLower().Contains(term) || p.Description.ToLower().Contains(alternateTerm))) ||
                        (p.Address != null && (p.Address.ToLower().Contains(term) || p.Address.ToLower().Contains(alternateTerm))) ||
                        p.PostType.ToLower().Contains(term) ||
                        p.PostType.ToLower().Contains(alternateTerm) ||
                        p.Country.ToLower().Contains(term) ||
                        p.Country.ToLower().Contains(alternateTerm) ||
                        (p.Region != null && (
                            p.Region.Name.ToLower().Contains(term) ||
                            p.Region.Name.ToLower().Contains(alternateTerm) ||
                            p.Region.Country.ToLower().Contains(term) ||
                            p.Region.Country.ToLower().Contains(alternateTerm))));
            }

            return query;
        }

        private static string? GetAlternateSearchTerm(string term)
        {
            // Podrzavamo jednostavne varijante pisanja bez izlaska iz EF query-ja.
            if (term.Contains("dj", StringComparison.OrdinalIgnoreCase))
                return term.Replace("dj", "đ", StringComparison.OrdinalIgnoreCase);

            if (term.Contains('đ'))
                return term.Replace("đ", "dj", StringComparison.OrdinalIgnoreCase);

            return null;
        }

        private async Task ReplacePostTagsAsync(uint postId, IEnumerable<uint> tagIds)
        {
            var normalizedIds = tagIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            var validTagIds = await _context.Tags
                .Where(t => normalizedIds.Contains(t.Id))
                .Select(t => t.Id)
                .ToListAsync();

            var existingTags = await _context.PostTags
                .Where(pt => pt.PostId == postId)
                .ToListAsync();

            _context.PostTags.RemoveRange(existingTags);
            foreach (var tagId in validTagIds)
                _context.PostTags.Add(new PostTag { PostId = postId, TagId = tagId });

            await _context.SaveChangesAsync();
        }

        private static List<string> SplitSearchTerms(string value) =>
            NormalizeSearchText(value)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(term => term.Length > 1)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        private static string NormalizeSearchText(string value)
        {
            // Normalizujemo unos korisnika i nazive regiona u uporedive termine.
            var normalized = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var character in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(character);
                if (category == UnicodeCategory.NonSpacingMark)
                    continue;

                builder.Append(char.IsLetterOrDigit(character) ? character : ' ');
            }

            return builder
                .ToString()
                .Normalize(NormalizationForm.FormC)
                .Replace("đ", "dj")
                .Replace("ð", "dj");
        }

        private static PostDto MapToDto(
            Post post,
            bool? isLiked = null,
            bool? isSaved = null,
            uint? likeCountOverride = null,
            uint? saveCountOverride = null,
            uint? reviewCountOverride = null,
            decimal? avgRatingOverride = null,
            bool includePendingActivities = false)
        {
            var visibleTags = post.PostTags?
                .Where(pt => includePendingActivities || pt.Tag == null || !IsPendingActivityTag(pt.Tag))
                .ToList() ?? new List<PostTag>();

            return new PostDto
            {
            Id = post.Id,
            AdminId = post.AdminId,
            AdminName = post.Admin?.FullName ?? string.Empty,
            RegionId = post.RegionId,
            RegionName = post.Region?.Name,
            ProposedRegionName = post.ProposedRegionName,
            Country = post.Country,
            Title = post.Title,
            PostType = post.PostType,
            Description = post.Description,
            Latitude = post.Lat,
            Longitude = post.Lng,
            Lat = post.Lat,
            Lng = post.Lng,
            Address = post.Address,
            ExternalUrl = post.ExternalUrl,
            ExternalUrlLabel = post.ExternalUrlLabel,
            Images = post.Images,
            OpeningHours = post.OpeningHours,
            Details = post.Details,
            Status = post.Status,
            ViewCount = post.ViewCount,
            LikeCount = likeCountOverride ?? post.LikeCount,
            SaveCount = saveCountOverride ?? post.SaveCount,
            ReviewCount = reviewCountOverride ?? post.ReviewCount,
            AvgRating = avgRatingOverride ?? post.AvgRating,
            PublishedAt = post.PublishedAt,
            CreatedAt = post.CreatedAt,
            UpdatedAt = post.UpdatedAt,
            TagIds = visibleTags.Select(pt => pt.TagId).ToList(),
            TagNames = visibleTags.Where(pt => pt.Tag != null).Select(pt => pt.Tag!.Name).ToList(),
            IsLiked = isLiked,
            IsSaved = isSaved
            };
        }

        private static bool IsPendingActivityTag(Tag tag) =>
            string.Equals(tag.Category, "aktivnost", StringComparison.OrdinalIgnoreCase) &&
            tag.Color is not null &&
            (tag.Color.ToLowerInvariant().Contains("|pending|") || tag.Color.ToLowerInvariant().EndsWith("|pending"));

        private static ReviewDto MapToReviewDto(Review review, string? touristName = null) => new()
        {
            Id = review.Id,
            TouristId = review.TouristId ?? 0,
            TouristName = touristName ?? review.Tourist?.Name ?? string.Empty,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };

        private async Task RefreshReviewStats(Post post)
        {
            post.AvgRating = await _context.Reviews
                .Where(r => r.PostId == post.Id && r.IsApproved)
                .AverageAsync(r => (decimal?)r.Rating);
            post.ReviewCount = (uint)await _context.Reviews.CountAsync(r => r.PostId == post.Id && r.IsApproved);
            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private async Task RefreshLikeCount(Post post)
        {
            post.LikeCount = (uint)await _context.PostLikes.CountAsync(x => x.PostId == post.Id);
            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private async Task RefreshSaveCount(Post post)
        {
            post.SaveCount = (uint)await _context.SavedPosts.CountAsync(x => x.PostId == post.Id);
            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private uint? GetAuthorizedTouristId()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "tourist", StringComparison.OrdinalIgnoreCase))
                return null;

            var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var touristId) ? touristId : null;
        }

        private uint? GetRequiredTouristId() => GetAuthorizedTouristId();

        private uint? GetCurrentAdminId()
        {
            var val = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                   ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(val, out var id) ? id : null;
        }

        private bool IsSuperAdmin()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            return string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsAdminUser()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase);
        }

        private async Task<bool> CanSeePendingActivitiesAsync() =>
            IsSuperAdmin() ||
            (IsAdminUser() && await _permissionService.HasPermissionAsync("manage_tags"));

        private async Task<bool> CanViewUnpublishedPostAsync(Post post)
        {
            if (!IsAdminUser())
                return false;

            if (!string.IsNullOrWhiteSpace(post.ProposedRegionName))
            {
                var adminId = GetCurrentAdminId();
                if (adminId is null || adminId.Value != post.AdminId)
                    return IsSuperAdmin();

                return await _permissionService.HasPermissionInAnyScopeAsync("manage_own_posts");
            }

            return await _permissionService.CanManageOwnContentAsync(post.AdminId, post.RegionId);
        }

        private Task<bool> CanManagePostAsync(Post post) => CanViewUnpublishedPostAsync(post);

        private async Task<bool> CanCreatePostAsync(string postType, uint? regionId, bool hasRegionProposal)
        {
            if (!IsAdminUser())
                return false;

            if (IsSuperAdmin())
                return true;

            if (hasRegionProposal)
            {
                if (!await _permissionService.HasPermissionInAnyScopeAsync("manage_own_posts"))
                    return false;

                var proposedPermissionCode = GetCreatePermissionCode(postType);
                return proposedPermissionCode is null ||
                       await _permissionService.HasPermissionInAnyScopeAsync(proposedPermissionCode);
            }

            if (!await _permissionService.HasPermissionAsync("manage_own_posts", regionId))
                return false;

            var permissionCode = GetCreatePermissionCode(postType);
            return permissionCode is null || await _permissionService.HasPermissionAsync(permissionCode, regionId);
        }

        private async Task<uint> ResolveRegionProposalAsync(string proposedRegionName, string? country)
        {
            var normalizedName = NormalizeProposedRegionName(proposedRegionName)
                ?? throw new InvalidOperationException("Naziv predlozenog regiona je obavezan.");
            var normalizedForLookup = normalizedName.ToLowerInvariant();
            var normalizedCountry = NormalizeCountry(country);

            var existingRegion = await _context.Regions
                .FirstOrDefaultAsync(r => r.Name.ToLower() == normalizedForLookup && r.Country.ToLower() == normalizedCountry.ToLower());
            if (existingRegion is not null)
                return existingRegion.Id;

            var region = new Region
            {
                Name = normalizedName,
                Type = "other",
                Country = normalizedCountry,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Regions.Add(region);
            await _context.SaveChangesAsync();

            return region.Id;
        }

        private static string? NormalizeProposedRegionName(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            var normalized = value.Trim();
            return normalized.Length > 200 ? normalized[..200] : normalized;
        }

        private static string NormalizeCountry(string? value)
        {
            var normalized = string.IsNullOrWhiteSpace(value) ? "Montenegro" : value.Trim();
            return normalized.Length > 100 ? normalized[..100] : normalized;
        }

        private static string? NormalizeOptionalSearch(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            return value.Trim().ToLowerInvariant();
        }

        private async Task<string> ResolveCountryForPostAsync(string? requestedCountry, uint? regionId)
        {
            if (!string.IsNullOrWhiteSpace(requestedCountry))
                return NormalizeCountry(requestedCountry);

            if (regionId.HasValue)
            {
                var regionCountry = await _context.Regions
                    .Where(r => r.Id == regionId.Value)
                    .Select(r => r.Country)
                    .FirstOrDefaultAsync();

                if (!string.IsNullOrWhiteSpace(regionCountry))
                    return NormalizeCountry(regionCountry);
            }

            return "Montenegro";
        }

        private async Task NotifyRegionProposalAsync(string proposedRegionName, Post post)
        {
            await _notificationService.BroadcastToSuperAdminsAsync(
                "region_pending",
                "Predlog za novi region",
                $"Admin je predlozio novi region \"{proposedRegionName}\" kroz lokaciju \"{post.Title}\".",
                new
                {
                    postId = post.Id,
                    regionName = proposedRegionName,
                    country = post.Country,
                    url = $"/admin/objects/{post.Id}"
                });
        }

        private async Task RecordHeatmapSampleForProposedLocationAsync(Post post)
        {
            if (!post.Lat.HasValue || !post.Lng.HasValue)
                return;

            if (!string.Equals(post.Status, "draft", StringComparison.OrdinalIgnoreCase) &&
                string.IsNullOrWhiteSpace(post.ProposedRegionName))
                return;

            var sessionId = $"post-proposal-{post.Id}";
            var recentExists = await _context.TouristLocationSamples.AnyAsync(s =>
                s.SessionId == sessionId &&
                s.RecordedAt >= DateTime.UtcNow.AddDays(-30));

            if (recentExists)
                return;

            _context.TouristLocationSamples.Add(new TouristLocationSample
            {
                TouristId = null,
                SessionId = sessionId,
                RegionId = post.RegionId,
                Lat = post.Lat.Value,
                Lng = post.Lng.Value,
                RecordedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        private static string? GetCreatePermissionCode(string postType) => postType switch
        {
            "accommodation" => "create_accommodation",
            "restaurant" => "create_restaurant",
            "club" => "create_club",
            "event" => "create_event",
            "cultural_site" => "create_cultural_site",
            "monument" => "create_monument",
            "sports_facility" => "create_sports",
            "shop" => "create_shop",
            _ => null
        };

        private static string? NormalizeStatusValue(string? status) =>
            string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToLowerInvariant();

        #endregion
    }
}
