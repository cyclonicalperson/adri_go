using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// Endpoint za analizu sklonosti turista.
    /// Analizira interakcije (lajkovi, pregledi, sačuvano) i vraća agregirane podatke.
    /// </summary>
    [ApiController]
    [Route("api/tourist-preferences")]
    [Authorize(Roles = "tourist")]
    public class TouristPreferencesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TouristPreferencesController(AppDbContext db)
        {
            _db = db;
        }

        // ── GET /api/tourist-preferences/my ──────────────────────────────────
        /// <summary>
        /// Vraća agregirane sklonosti turiste na osnovu njegovih interakcija:
        /// - koje tipove postova najčešće lajkuje / gleda / čuva
        /// - koje tagove / kategorije preferira
        /// - koje regije ga najviše interesuju
        /// - opšti skorovi po interakcionim tipovima
        /// </summary>
        [HttpGet("my")]
        public async Task<IActionResult> GetMyPreferences()
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            // ── 1. Sklonosti po tipu posta (postType) ─────────────────────────
            //    Svaka interakcija nosi različitu težinu:
            //      sačuvano = 3  (jaka namjera)
            //      lajk     = 2  (eksplicitno odobravanje)
            //      pregled  = 1  (pasivna zainteresovanost)

            // Lajkovi po tipu posta
            var likedTypes = await _db.PostLikes
                .Where(l => l.TouristId == touristId.Value && l.Post != null)
                .GroupBy(l => l.Post.PostType)
                .Select(g => new { postType = g.Key, count = g.Count() })
                .ToListAsync();

            // Sačuvani po tipu posta
            var savedTypes = await _db.SavedPosts
                .Where(s => s.TouristId == touristId.Value && s.Post != null)
                .GroupBy(s => s.Post.PostType)
                .Select(g => new { postType = g.Key, count = g.Count() })
                .ToListAsync();

            // Pregledi po tipu posta (samo za postove – isključujemo evente jer imaju poseban flow)
            var viewedTypes = await _db.PostViews
                .Where(v => v.TouristId == touristId.Value && v.Post != null)
                .GroupBy(v => v.Post.PostType)
                .Select(g => new { postType = g.Key, count = g.Count() })
                .ToListAsync();

            // Kombinujemo u weighted score
            var allTypes = likedTypes.Select(x => x.postType)
                .Union(savedTypes.Select(x => x.postType))
                .Union(viewedTypes.Select(x => x.postType))
                .Distinct();

            var postTypePreferences = allTypes
                .Select(type => new
                {
                    postType = type,
                    likeCount = likedTypes.FirstOrDefault(x => x.postType == type)?.count ?? 0,
                    saveCount = savedTypes.FirstOrDefault(x => x.postType == type)?.count ?? 0,
                    viewCount = viewedTypes.FirstOrDefault(x => x.postType == type)?.count ?? 0,
                    score = (likedTypes.FirstOrDefault(x => x.postType == type)?.count ?? 0) * 2
                                + (savedTypes.FirstOrDefault(x => x.postType == type)?.count ?? 0) * 3
                                + (viewedTypes.FirstOrDefault(x => x.postType == type)?.count ?? 0) * 1
                })
                .OrderByDescending(x => x.score)
                .ToList();

            // ── 2. Sklonosti po tagovima ───────────────────────────────────────
            //    Uzimamo tagove postova s kojima je turista interagovao

            // Tagovi lajkovanih postova
            var likedTagIds = await _db.PostLikes
                .Where(l => l.TouristId == touristId.Value)
                .Select(l => l.PostId)
                .ToListAsync();

            // Tagovi sačuvanih postova
            var savedTagIds = await _db.SavedPosts
                .Where(s => s.TouristId == touristId.Value)
                .Select(s => s.PostId)
                .ToListAsync();

            // Tagovi pregledanih postova
            var viewedTagIds = await _db.PostViews
                .Where(v => v.TouristId == touristId.Value)
                .Select(v => v.PostId)
                .ToListAsync();

            // Dohvatamo tag podatke jednom SQL upitom — grupisano po tag imenu i kategoriji
            var tagInteractions = await _db.PostTags
                .Where(pt =>
                    likedTagIds.Contains(pt.PostId) ||
                    savedTagIds.Contains(pt.PostId) ||
                    viewedTagIds.Contains(pt.PostId))
                .Select(pt => new
                {
                    pt.TagId,
                    TagName = pt.Tag.Name,
                    TagCategory = pt.Tag.Category,
                    IsLiked = likedTagIds.Contains(pt.PostId),
                    IsSaved = savedTagIds.Contains(pt.PostId),
                    IsViewed = viewedTagIds.Contains(pt.PostId)
                })
                .ToListAsync();

            var tagPreferences = tagInteractions
                .GroupBy(t => new { t.TagId, t.TagName, t.TagCategory })
                .Select(g => new
                {
                    tagId = g.Key.TagId,
                    tagName = g.Key.TagName,
                    tagCategory = g.Key.TagCategory,
                    likeCount = g.Count(x => x.IsLiked),
                    saveCount = g.Count(x => x.IsSaved),
                    viewCount = g.Count(x => x.IsViewed),
                    score = g.Count(x => x.IsLiked) * 2
                                + g.Count(x => x.IsSaved) * 3
                                + g.Count(x => x.IsViewed) * 1
                })
                .OrderByDescending(x => x.score)
                .Take(20)  // top 20 tagova
                .ToList();

            // ── 3. Sklonosti po regijama ──────────────────────────────────────
            var likedRegions = await _db.PostLikes
                .Where(l => l.TouristId == touristId.Value && l.Post != null && l.Post.Region != null)
                .GroupBy(l => new { l.Post.RegionId, RegionName = l.Post.Region!.Name })
                .Select(g => new { regionId = g.Key.RegionId, regionName = g.Key.RegionName, count = g.Count() })
                .ToListAsync();

            var savedRegions = await _db.SavedPosts
                .Where(s => s.TouristId == touristId.Value && s.Post != null && s.Post.Region != null)
                .GroupBy(s => new { s.Post.RegionId, RegionName = s.Post.Region!.Name })
                .Select(g => new { regionId = g.Key.RegionId, regionName = g.Key.RegionName, count = g.Count() })
                .ToListAsync();

            var viewedRegions = await _db.PostViews
                .Where(v => v.TouristId == touristId.Value && v.Post != null && v.Post.Region != null)
                .GroupBy(v => new { v.Post.RegionId, RegionName = v.Post.Region!.Name })
                .Select(g => new { regionId = g.Key.RegionId, regionName = g.Key.RegionName, count = g.Count() })
                .ToListAsync();

            var allRegionIds = likedRegions.Select(x => x.regionId)
                .Union(savedRegions.Select(x => x.regionId))
                .Union(viewedRegions.Select(x => x.regionId))
                .Distinct();

            // Koristimo dictionary za brzo lookup po regionId
            var likedRegionDict = likedRegions.ToDictionary(x => x.regionId, x => x);
            var savedRegionDict = savedRegions.ToDictionary(x => x.regionId, x => x);
            var viewedRegionDict = viewedRegions.ToDictionary(x => x.regionId, x => x);

            var regionPreferences = allRegionIds
                .Select(rid =>
                {
                    var name = likedRegionDict.TryGetValue(rid, out var l) ? l.regionName
                             : savedRegionDict.TryGetValue(rid, out var s) ? s.regionName
                             : viewedRegionDict.TryGetValue(rid, out var v) ? v.regionName
                             : "Nepoznata regija";

                    var likes = likedRegionDict.TryGetValue(rid, out var ld) ? ld.count : 0;
                    var saves = savedRegionDict.TryGetValue(rid, out var sd) ? sd.count : 0;
                    var views = viewedRegionDict.TryGetValue(rid, out var vd) ? vd.count : 0;

                    return new
                    {
                        regionId = rid,
                        regionName = name,
                        likeCount = likes,
                        saveCount = saves,
                        viewCount = views,
                        score = likes * 2 + saves * 3 + views * 1
                    };
                })
                .OrderByDescending(x => x.score)
                .ToList();

            // ── 4. Ukupne interakcije (summary) ──────────────────────────────
            var totalLikes = await _db.PostLikes.CountAsync(l => l.TouristId == touristId.Value);
            var totalSaves = await _db.SavedPosts.CountAsync(s => s.TouristId == touristId.Value);
            var totalViews = await _db.PostViews.CountAsync(v => v.TouristId == touristId.Value);
            var totalReviews = await _db.Reviews.CountAsync(r => r.TouristId == touristId.Value);

            return Ok(new
            {
                success = true,
                data = new
                {
                    summary = new
                    {
                        totalLikes,
                        totalSaves,
                        totalViews,
                        totalReviews
                    },
                    postTypePreferences,
                    tagPreferences,
                    regionPreferences
                }
            });
        }

        // ── GET /api/tourist-preferences/summary/{touristId} ─────────────────
        /// <summary>
        /// Admin endpoint — vraća sklonosti konkretnog turiste po ID-ju.
        /// Dostupno samo adminima i superadminima.
        /// </summary>
        [HttpGet("summary/{id:int}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetTouristPreferencesSummary(int id)
        {
            var tourist = await _db.Tourists.FirstOrDefaultAsync(t => t.Id == (uint)id && t.IsActive);
            if (tourist is null)
                return NotFound(new { message = "Turista nije pronađen." });

            var totalLikes = await _db.PostLikes.CountAsync(l => l.TouristId == (uint)id);
            var totalSaves = await _db.SavedPosts.CountAsync(s => s.TouristId == (uint)id);
            var totalViews = await _db.PostViews.CountAsync(v => v.TouristId == (uint)id);
            var totalReviews = await _db.Reviews.CountAsync(r => r.TouristId == (uint)id);

            // Top tipovi postova (weighted score)
            var likedTypes = await _db.PostLikes.Where(l => l.TouristId == (uint)id && l.Post != null)
                .GroupBy(l => l.Post.PostType).Select(g => new { g.Key, c = g.Count() }).ToListAsync();
            var savedTypes = await _db.SavedPosts.Where(s => s.TouristId == (uint)id && s.Post != null)
                .GroupBy(s => s.Post.PostType).Select(g => new { g.Key, c = g.Count() }).ToListAsync();
            var viewedTypes = await _db.PostViews.Where(v => v.TouristId == (uint)id && v.Post != null)
                .GroupBy(v => v.Post.PostType).Select(g => new { g.Key, c = g.Count() }).ToListAsync();

            var allTypes = likedTypes.Select(x => x.Key)
                .Union(savedTypes.Select(x => x.Key))
                .Union(viewedTypes.Select(x => x.Key))
                .Distinct();

            var topPostTypes = allTypes
                .Select(type => new
                {
                    postType = type,
                    score = (likedTypes.FirstOrDefault(x => x.Key == type)?.c ?? 0) * 2
                             + (savedTypes.FirstOrDefault(x => x.Key == type)?.c ?? 0) * 3
                             + (viewedTypes.FirstOrDefault(x => x.Key == type)?.c ?? 0) * 1
                })
                .OrderByDescending(x => x.score)
                .Take(5)
                .ToList();

            return Ok(new
            {
                success = true,
                data = new
                {
                    touristId = tourist.Id,
                    touristName = tourist.Name,
                    summary = new { totalLikes, totalSaves, totalViews, totalReviews },
                    topPostTypes
                }
            });
        }

        // ── Helpers ────────────────────────────────────────────────────────────
        private uint? GetTouristId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var id) ? id : null;
        }
    }
}
