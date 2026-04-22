using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs.Recommendations;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services.Interfaces;
using Route = TouristGuide.Api.Models.Route;

namespace TouristGuide.Api.Services
{
    public class RecommendationService : IRecommendationService
    {
        private readonly AppDbContext _context;

        private const string Accommodation = "accommodation";

        public RecommendationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ContentRecommendationItemDto>> GetRecommendationsAsync(
            uint regionId,
            uint? touristId,
            string contextMode = "onsite",
            int take = 10)
        {
            var normalizedMode = NormalizeContextMode(contextMode);
            var totalPosts = await _context.Posts.CountAsync(p => p.Status == "published");
            var totalRoutes = await _context.Routes.CountAsync(r => r.Status == "published");
            var totalTourists = await _context.Tourists.CountAsync(t => t.IsActive);
            var totalPoi = totalPosts + totalRoutes;

            // PLAN: candidate generation ima smisla kad katalog postane veliki.
            // Sa malim brojem POI ne dobijamo mnogo ako prvo radimo 10k -> 300 kandidata.
            // Zato ovde preskacemo candidate generation dok je katalog mali.
            var skipCandidateGeneration = totalPoi < 100;

            // PLAN: collaborative / matrix factorization za sada ne koristimo.
            // Ovaj if je tu kao marker za buduci razvoj kada baza poraste.
            if (totalTourists >= 1000 && totalPoi >= 1000)
            {
                // FUTURE:
                // 1. collaborative kandidat set
                // 2. spajanje sa content/popularity kandidatima
                // 3. final ranking + diversity
            }

            var postQuery = _context.Posts
                .AsNoTracking()
                .Include(p => p.Region)
                .Include(p => p.PostTags)
                    .ThenInclude(pt => pt.Tag)
                .Where(p =>
                    p.RegionId == regionId &&
                    p.Status == "published" &&
                    (p.Region == null || p.Region.IsActive));

            // Ako je korisnik vec na destinaciji, nema potrebe da guramo smestaj.
            if (normalizedMode == "onsite")
                postQuery = postQuery.Where(p => p.PostType != Accommodation);

            var posts = await postQuery
                .OrderByDescending(p => p.SaveCount)
                .ThenByDescending(p => p.LikeCount)
                .ThenByDescending(p => p.ViewCount)
                .Take(skipCandidateGeneration ? 500 : 150)
                .ToListAsync();

            var routes = await _context.Routes
                .AsNoTracking()
                .Include(r => r.Region)
                .Where(r =>
                    r.RegionId == regionId &&
                    r.Status == "published" &&
                    (r.Region == null || r.Region.IsActive))
                .OrderByDescending(r => r.SaveCount)
                .ThenByDescending(r => r.ViewCount)
                .Take(skipCandidateGeneration ? 120 : 40)
                .ToListAsync();

            // Anonymous fallback: popularity + diversity.
            if (!touristId.HasValue)
            {
                var anonymousItems = posts.Select(p => ScoreAnonymousPost(p, normalizedMode))
                    .Concat(routes.Select(ScoreAnonymousRoute))
                    .Where(item => item.Score > 0)
                    .OrderByDescending(item => item.Score)
                    .ToList();

                return DiversifyAndTake(anonymousItems, take);
            }

            var profile = await BuildUserPreferenceProfileAsync(touristId.Value);

            // Ako turista nema dovoljno licnih signala, ostajemo na interests + popularity logici.
            var rankedItems = profile.HasSignals
                ? posts.Select(p => ScorePersonalizedPost(profile, p, normalizedMode))
                    .Concat(routes.Select(r => ScorePersonalizedRoute(profile, r)))
                : posts.Select(p => ScoreAnonymousPost(p, normalizedMode))
                    .Concat(routes.Select(ScoreAnonymousRoute));

            return DiversifyAndTake(
                rankedItems
                    .Where(item => item.Score > 0)
                    .OrderByDescending(item => item.Score)
                    .ToList(),
                take);
        }

        private async Task<UserPreferenceProfile> BuildUserPreferenceProfileAsync(uint touristId)
        {
            var tourist = await _context.Tourists
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == touristId && t.IsActive);

            if (tourist is null)
                return new UserPreferenceProfile();

            var profile = new UserPreferenceProfile();
            AddInterestSignals(profile, tourist.Interests);

            var savedPosts = await _context.SavedPosts
                .AsNoTracking()
                .Where(x => x.TouristId == touristId)
                .Include(x => x.Post)
                    .ThenInclude(p => p.Region)
                .Include(x => x.Post)
                    .ThenInclude(p => p.PostTags)
                        .ThenInclude(pt => pt.Tag)
                .OrderByDescending(x => x.CreatedAt)
                .Take(60)
                .ToListAsync();
            foreach (var saved in savedPosts)
                AddPostSignal(profile, saved.Post, 5m);

            var likedPosts = await _context.PostLikes
                .AsNoTracking()
                .Where(x => x.TouristId == touristId)
                .Include(x => x.Post)
                    .ThenInclude(p => p.Region)
                .Include(x => x.Post)
                    .ThenInclude(p => p.PostTags)
                        .ThenInclude(pt => pt.Tag)
                .OrderByDescending(x => x.CreatedAt)
                .Take(60)
                .ToListAsync();
            foreach (var like in likedPosts)
                AddPostSignal(profile, like.Post, 4m);

            var reviewedPosts = await _context.Reviews
                .AsNoTracking()
                .Where(x => x.TouristId == touristId && x.PostId != null && x.IsApproved)
                .Include(x => x.Post!)
                    .ThenInclude(p => p.Region)
                .Include(x => x.Post!)
                    .ThenInclude(p => p.PostTags)
                        .ThenInclude(pt => pt.Tag)
                .OrderByDescending(x => x.CreatedAt)
                .Take(40)
                .ToListAsync();
            foreach (var review in reviewedPosts)
            {
                if (review.Post is not null)
                    AddPostSignal(profile, review.Post, Math.Max(review.Rating, (byte)1));
            }

            var viewedPosts = await _context.PostViews
                .AsNoTracking()
                .Where(x => x.TouristId == touristId)
                .Include(x => x.Post)
                    .ThenInclude(p => p.Region)
                .Include(x => x.Post)
                    .ThenInclude(p => p.PostTags)
                        .ThenInclude(pt => pt.Tag)
                .OrderByDescending(x => x.CreatedAt)
                .Take(80)
                .ToListAsync();
            foreach (var view in viewedPosts)
                AddPostSignal(profile, view.Post, 1m);

            return profile;
        }

        private static ContentRecommendationItemDto ScoreAnonymousPost(Post post, string contextMode)
        {
            var contextBoost = post.PostType == Accommodation
                ? (contextMode == "planning" ? 4m : -100m)
                : 2m;

            return new ContentRecommendationItemDto
            {
                EntityId = post.Id,
                EntityType = "post",
                Title = post.Title,
                PostType = post.PostType,
                RegionId = post.RegionId,
                RegionName = post.Region?.Name,
                ImageUrl = ParseFirstImage(post.Images),
                Score = Math.Round(CalculatePopularityScore(post) + contextBoost, 2),
                Reason = BuildAnonymousPostReason(post, contextMode)
            };
        }

        private static ContentRecommendationItemDto ScoreAnonymousRoute(Route route)
        {
            return new ContentRecommendationItemDto
            {
                EntityId = route.Id,
                EntityType = "route",
                Title = route.Name,
                PostType = "route",
                RegionId = route.RegionId,
                RegionName = route.Region?.Name,
                ImageUrl = ParseFirstImage(route.Images),
                Score = Math.Round(CalculateRoutePopularityScore(route), 2),
                Reason = "Popularna ruta za ovu destinaciju"
            };
        }

        private static ContentRecommendationItemDto ScorePersonalizedPost(
            UserPreferenceProfile profile,
            Post post,
            string contextMode)
        {
            var tagNames = post.PostTags
                .Select(pt => pt.Tag.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var matchedTags = tagNames
                .Where(profile.TagWeights.ContainsKey)
                .OrderByDescending(tag => profile.TagWeights[tag])
                .ThenBy(tag => tag)
                .Take(5)
                .ToList();

            var tokens = BuildPostTokens(post, tagNames);
            var tagScore = matchedTags.Sum(tag => profile.TagWeights[tag]) * 4m;
            var typeScore = profile.PostTypeWeights.TryGetValue(post.PostType, out var typeWeight) ? typeWeight * 3m : 0m;
            var regionScore = post.RegionId.HasValue && profile.RegionWeights.TryGetValue(post.RegionId.Value, out var regionWeight)
                ? regionWeight * 2m
                : 0m;
            var tokenScore = tokens.Where(profile.TokenWeights.ContainsKey)
                .Sum(token => profile.TokenWeights[token]) * 0.5m;
            var popularityScore = CalculatePopularityScore(post);
            var contextBoost = post.PostType == Accommodation
                ? (contextMode == "planning" ? 6m : -100m)
                : 3m;

            return new ContentRecommendationItemDto
            {
                EntityId = post.Id,
                EntityType = "post",
                Title = post.Title,
                PostType = post.PostType,
                RegionId = post.RegionId,
                RegionName = post.Region?.Name,
                ImageUrl = ParseFirstImage(post.Images),
                Score = Math.Round(
                    Math.Min(tagScore, 30m) +
                    Math.Min(typeScore, 20m) +
                    Math.Min(regionScore, 10m) +
                    Math.Min(tokenScore, 15m) +
                    popularityScore +
                    contextBoost,
                    2),
                Reason = BuildPersonalizedPostReason(profile, post, matchedTags, contextMode),
                MatchedTags = matchedTags
            };
        }

        private static ContentRecommendationItemDto ScorePersonalizedRoute(
            UserPreferenceProfile profile,
            Route route)
        {
            var routeTokens = BuildRouteTokens(route);
            var tokenScore = routeTokens.Where(profile.TokenWeights.ContainsKey)
                .Sum(token => profile.TokenWeights[token]) * 0.45m;
            var regionScore = route.RegionId.HasValue && profile.RegionWeights.TryGetValue(route.RegionId.Value, out var regionWeight)
                ? regionWeight * 2m
                : 0m;
            var outdoorBoost = HasOutdoorSignals(profile) ? 8m : 0m;

            return new ContentRecommendationItemDto
            {
                EntityId = route.Id,
                EntityType = "route",
                Title = route.Name,
                PostType = "route",
                RegionId = route.RegionId,
                RegionName = route.Region?.Name,
                ImageUrl = ParseFirstImage(route.Images),
                Score = Math.Round(
                    Math.Min(tokenScore, 18m) +
                    Math.Min(regionScore, 10m) +
                    outdoorBoost +
                    CalculateRoutePopularityScore(route),
                    2),
                Reason = BuildPersonalizedRouteReason(profile, route),
                MatchedTags = routeTokens
                    .Where(profile.TagWeights.ContainsKey)
                    .Take(3)
                    .ToList()
            };
        }

        // PLAN: diversity je aktivan deo pipa vec sada.
        // Ovo sprecava da top lista bude puna samo restorana ili samo ruta.
        private static List<ContentRecommendationItemDto> DiversifyAndTake(
            IReadOnlyList<ContentRecommendationItemDto> rankedItems,
            int take)
        {
            var groups = rankedItems
                .GroupBy(item => item.PostType)
                .ToDictionary(group => group.Key, group => new Queue<ContentRecommendationItemDto>(group));

            var order = groups
                .OrderByDescending(group => group.Value.Count)
                .Select(group => group.Key)
                .ToList();

            var result = new List<ContentRecommendationItemDto>();
            while (result.Count < Math.Clamp(take, 1, 20) && order.Count > 0)
            {
                for (var i = 0; i < order.Count && result.Count < take; i++)
                {
                    var key = order[i];
                    if (!groups.TryGetValue(key, out var queue) || queue.Count == 0)
                        continue;

                    result.Add(queue.Dequeue());
                }

                order = order
                    .Where(key => groups.TryGetValue(key, out var queue) && queue.Count > 0)
                    .ToList();
            }

            return result;
        }

        private static void AddPostSignal(UserPreferenceProfile profile, Post post, decimal weight)
        {
            if (post.Status != "published")
                return;

            profile.SignalCount++;
            AddWeight(profile.PostTypeWeights, post.PostType, weight);

            if (post.RegionId.HasValue)
                AddWeight(profile.RegionWeights, post.RegionId.Value, weight);

            var tagNames = post.PostTags
                .Select(pt => pt.Tag.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .ToList();

            foreach (var tagName in tagNames)
                AddWeight(profile.TagWeights, tagName, weight);

            foreach (var token in BuildPostTokens(post, tagNames))
                AddWeight(profile.TokenWeights, token, weight * 0.35m);
        }

        private static void AddInterestSignals(UserPreferenceProfile profile, string? interestsJson)
        {
            if (string.IsNullOrWhiteSpace(interestsJson))
                return;

            foreach (var interest in ParseInterests(interestsJson))
            {
                profile.SignalCount++;

                foreach (var alias in ExpandInterestAliases(interest))
                {
                    AddWeight(profile.TagWeights, alias, 3m);
                    foreach (var token in Tokenize(alias))
                        AddWeight(profile.TokenWeights, token, 3m);
                }

                foreach (var mappedType in MapInterestToPostTypes(interest))
                    AddWeight(profile.PostTypeWeights, mappedType, 2.5m);
            }
        }

        private static IEnumerable<string> ParseInterests(string interestsJson)
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(interestsJson);
                return parsed?
                    .Where(interest => !string.IsNullOrWhiteSpace(interest))
                    .Select(interest => interest.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>();
            }
            catch (JsonException)
            {
                return Tokenize(interestsJson);
            }
        }

        // Ovde rucno mapiramo interests -> tag/token sinonime,
        // jer nazivi u tourist.interests i post tagovima nisu 1:1.
        private static IEnumerable<string> ExpandInterestAliases(string interest)
        {
            var normalized = interest.Trim().ToLowerInvariant();
            var aliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { normalized };

            switch (normalized)
            {
                case "hiking":
                case "planinarenje":
                    aliases.UnionWith(new[] { "trail", "nature", "mountain", "adventure", "route", "hike" });
                    break;
                case "food":
                case "hrana":
                case "gastronomy":
                    aliases.UnionWith(new[] { "restaurant", "cuisine", "local food", "cafe", "traditional" });
                    break;
                case "culture":
                case "kultura":
                    aliases.UnionWith(new[] { "museum", "heritage", "cultural", "monument", "history" });
                    break;
                case "nightlife":
                case "nocni zivot":
                    aliases.UnionWith(new[] { "club", "bar", "music", "party" });
                    break;
                case "wellness":
                case "spa":
                    aliases.UnionWith(new[] { "spa", "wellness", "relax", "massage" });
                    break;
                case "shopping":
                    aliases.UnionWith(new[] { "shop", "market", "local products" });
                    break;
                case "photography":
                case "fotografija":
                    aliases.UnionWith(new[] { "viewpoint", "scenic", "nature", "landscape" });
                    break;
                case "family":
                case "porodica":
                    aliases.UnionWith(new[] { "family", "kids", "park", "easy" });
                    break;
            }

            return aliases;
        }

        private static IEnumerable<string> MapInterestToPostTypes(string interest)
        {
            var normalized = interest.Trim().ToLowerInvariant();
            return normalized switch
            {
                "food" or "hrana" or "gastronomy" => new[] { "restaurant" },
                "culture" or "kultura" => new[] { "cultural_site", "monument", "attraction" },
                "nightlife" or "nocni zivot" => new[] { "club" },
                "shopping" => new[] { "shop" },
                "wellness" or "spa" => new[] { "other" },
                _ => Array.Empty<string>()
            };
        }

        private static HashSet<string> BuildPostTokens(Post post, IEnumerable<string> tagNames)
        {
            var text = string.Join(' ', post.Title, post.PostType, post.Description, post.Details, string.Join(' ', tagNames));
            return Tokenize(text);
        }

        private static HashSet<string> BuildRouteTokens(Route route)
        {
            var text = string.Join(' ', route.Name, route.Description, route.Difficulty);
            return Tokenize(text);
        }

        private static HashSet<string> Tokenize(string text)
        {
            var tokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var buffer = new List<char>();

            foreach (var character in text.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(character))
                {
                    buffer.Add(character);
                    continue;
                }

                FlushToken(tokens, buffer);
            }

            FlushToken(tokens, buffer);
            return tokens;
        }

        private static void FlushToken(HashSet<string> tokens, List<char> buffer)
        {
            if (buffer.Count >= 3)
                tokens.Add(new string(buffer.ToArray()));

            buffer.Clear();
        }

        private static string NormalizeContextMode(string? contextMode)
        {
            var value = contextMode?.Trim().ToLowerInvariant();
            return value == "planning" ? "planning" : "onsite";
        }

        private static decimal CalculatePopularityScore(Post post)
        {
            var views = Math.Min((decimal)post.ViewCount, 300m) / 300m * 3m;
            var saves = Math.Min((decimal)post.SaveCount, 100m) / 100m * 4m;
            var likes = Math.Min((decimal)post.LikeCount, 150m) / 150m * 2m;
            var rating = Math.Min(post.AvgRating ?? 0m, 5m) / 5m;
            return views + saves + likes + rating;
        }

        private static decimal CalculateRoutePopularityScore(Route route)
        {
            var views = Math.Min((decimal)route.ViewCount, 200m) / 200m * 4m;
            var saves = Math.Min((decimal)route.SaveCount, 80m) / 80m * 6m;
            return views + saves;
        }

        private static bool HasOutdoorSignals(UserPreferenceProfile profile)
        {
            return profile.TagWeights.ContainsKey("hiking")
                || profile.TagWeights.ContainsKey("planinarenje")
                || profile.TagWeights.ContainsKey("nature")
                || profile.TagWeights.ContainsKey("adventure")
                || profile.TokenWeights.ContainsKey("route")
                || profile.TokenWeights.ContainsKey("trail");
        }

        private static void AddWeight<TKey>(Dictionary<TKey, decimal> weights, TKey key, decimal weight)
            where TKey : notnull
        {
            if (weights.TryGetValue(key, out var current))
                weights[key] = current + weight;
            else
                weights[key] = weight;
        }

        private static string BuildAnonymousPostReason(Post post, string contextMode)
        {
            if (post.PostType == Accommodation && contextMode == "planning")
                return "Smestaj za planiranje puta";

            return "Popularan POI za ovu destinaciju";
        }

        private static string BuildPersonalizedPostReason(
            UserPreferenceProfile profile,
            Post post,
            IReadOnlyCollection<string> matchedTags,
            string contextMode)
        {
            if (post.PostType == Accommodation && contextMode == "planning")
                return "Smestaj ima smisla dok planiras ovu destinaciju";

            if (matchedTags.Count > 0)
                return $"Prema tvojim interesovanjima: {string.Join(", ", matchedTags.Take(3))}";

            if (profile.PostTypeWeights.ContainsKey(post.PostType))
                return $"Cesto gledas {post.PostType.Replace('_', ' ')}";

            return "Preporuceno prema tvojim signalima";
        }

        private static string BuildPersonalizedRouteReason(UserPreferenceProfile profile, Route route)
        {
            if (HasOutdoorSignals(profile))
                return "Ruta odgovara tvojim outdoor interesovanjima";

            if (!string.IsNullOrWhiteSpace(route.Difficulty))
                return $"Ruta za ovu destinaciju, tezina: {route.Difficulty}";

            return "Ruta za ovu destinaciju";
        }

        private static string? ParseFirstImage(string? images)
        {
            if (string.IsNullOrWhiteSpace(images))
                return null;

            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(images);
                return parsed?.FirstOrDefault(image => !string.IsNullOrWhiteSpace(image));
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private sealed class UserPreferenceProfile
        {
            public int SignalCount { get; set; }
            public bool HasSignals => SignalCount > 0;
            public Dictionary<string, decimal> TagWeights { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, decimal> PostTypeWeights { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<uint, decimal> RegionWeights { get; } = new();
            public Dictionary<string, decimal> TokenWeights { get; } = new(StringComparer.OrdinalIgnoreCase);
        }
    }
}
