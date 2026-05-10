using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
    internal static class TourismTools
    {
        [McpServerTool(Name = "tourism_search_regions", Title = "Search Regions", ReadOnly = true, Idempotent = true)]
        [Description("Search tourist regions and destinations such as cities, mountains, lakes, and national parks. Returns paged results with total count.")]
        public static Task<PagedResult<RegionSummary>> SearchRegions(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional free-text query, e.g. Zabljak, Budva, Durmitor.")] string? query = null,
            [Description("Optional type filter: city, mountain, lake, national_park, coast, village, other.")] string? type = null,
            [Description("Optional country filter, e.g. Montenegro.")] string? country = null,
            [Description("If true, returns only regions with GPS coordinates.")] bool? hasCoordinates = null,
            [Description("Maximum number of results (default 10).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            return tourismService.SearchRegionsAsync(
                new SearchRegionsRequest(query, type, country, hasCoordinates, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_region_summary", Title = "Get Region Summary", ReadOnly = true, Idempotent = true)]
        [Description("Get a full overview of a specific region including total post count, total route count, average rating, and breakdown of posts by type.")]
        public static Task<RegionFullSummary?> GetRegionSummary(
            [Description("The ID of the region to summarize.")] uint regionId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetRegionSummaryAsync(new GetRegionSummaryRequest(regionId), cancellationToken);
        }

        [McpServerTool(Name = "tourism_search_posts", Title = "Search Locations", ReadOnly = true, Idempotent = true)]
        [Description("Search published locations and points of interest. Post types: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other. Sort options: rating (default), distance (requires coordinates), title, newest.")]
        public static Task<PagedResult<PostSummary>> SearchPosts(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional region ID to scope the search.")] uint? regionId = null,
            [Description("Optional free-text query matching title, description, or address.")] string? query = null,
            [Description("Optional post type list: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.")] IReadOnlyList<string>? postTypes = null,
            [Description("Optional minimum average rating (0-5).")] double? minRating = null,
            [Description("Optional maximum average rating (0-5).")] double? maxRating = null,
            [Description("Optional tag names to filter by.")] IReadOnlyList<string>? tags = null,
            [Description("If true, only returns locations that have an external booking/info URL.")] bool? hasExternalUrl = null,
            [Description("If true, only returns locations with opening hours defined.")] bool? hasOpeningHours = null,
            [Description("User latitude for proximity sorting and radius filtering.")] double? userLatitude = null,
            [Description("User longitude for proximity sorting and radius filtering.")] double? userLongitude = null,
            [Description("Only return results within this many km from the user location.")] double? radiusKm = null,
            [Description("Sort order: rating (default), distance (requires userLatitude/userLongitude), title, newest.")] string? sortBy = null,
            [Description("Maximum number of results (default 10).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            return tourismService.SearchPostsAsync(
                new SearchPostsRequest(regionId, query, postTypes, minRating, maxRating,
                    userLatitude, userLongitude, radiusKm, tags,
                    hasExternalUrl, hasOpeningHours, sortBy, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_post_detail", Title = "Get Location Detail", ReadOnly = true, Idempotent = true)]
        [Description("Get full details for a specific location by ID: description, opening hours, rating, view count, likes, review count, all tags, external booking URL, and image URLs.")]
        public static Task<PostDetail?> GetPostDetail(
            [Description("The ID of the location to retrieve.")] uint postId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetPostDetailAsync(new PostDetailRequest(postId), cancellationToken);
        }

        [McpServerTool(Name = "tourism_search_routes", Title = "Search Routes", ReadOnly = true, Idempotent = true)]
        [Description("Search published tourist routes (hiking, cycling, walking...). Difficulty levels: easy, moderate, hard, expert.")]
        public static Task<PagedResult<RouteSummary>> SearchRoutes(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional region ID.")] uint? regionId = null,
            [Description("Optional free-text query matching route name or description.")] string? query = null,
            [Description("Optional difficulty list: easy, moderate, hard, expert.")] IReadOnlyList<string>? difficulties = null,
            [Description("Optional maximum route distance in kilometers.")] decimal? maxDistanceKm = null,
            [Description("Optional minimum route distance in kilometers.")] decimal? minDistanceKm = null,
            [Description("Optional maximum duration in minutes.")] int? maxDurationMinutes = null,
            [Description("Optional minimum duration in minutes.")] int? minDurationMinutes = null,
            [Description("Optional maximum elevation gain in meters.")] uint? maxElevationGain = null,
            [Description("Sort order: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc.")] string? sortBy = null,
            [Description("Maximum number of results (default 10).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            return tourismService.SearchRoutesAsync(
                new SearchRoutesRequest(regionId, query, difficulties,
                    maxDistanceKm, minDistanceKm,
                    maxDurationMinutes, minDurationMinutes,
                    maxElevationGain, null, sortBy, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_route_detail", Title = "Get Route Detail", ReadOnly = true, Idempotent = true)]
        [Description("Get full details for a specific route by ID: waypoints, GPX file path, view count, and save count.")]
        public static Task<RouteDetail?> GetRouteDetail(
            [Description("The ID of the route to retrieve.")] uint routeId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetRouteDetailAsync(new RouteDetailRequest(routeId), cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_reviews", Title = "Get Location Reviews", ReadOnly = true, Idempotent = true)]
        [Description("Get visitor reviews for a specific location by post ID.")]
        public static Task<PagedResult<ReviewSummary>> GetReviews(
            [Description("The ID of the location to get reviews for.")] uint postId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("If true, returns only approved reviews (default true).")] bool? onlyApproved = null,
            [Description("Optional minimum rating filter (1-5).")] int? minRating = null,
            [Description("Optional maximum rating filter (1-5).")] int? maxRating = null,
            [Description("Sort order: rating_asc, rating_desc, or newest (default).")] string? sortBy = null,
            [Description("Maximum number of results (default 20).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            return tourismService.GetReviewsAsync(
                new GetReviewsRequest(postId, onlyApproved ?? true, minRating, maxRating, sortBy, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_search_tags", Title = "Search Tags and Activities", ReadOnly = true, Idempotent = true)]
        [Description("Search available tags by category. Categories in database: aktivnost (activities), amenity, stil (style/vibe), cijena (price), tip (type), oznaka (label). Use tourism_search_activities for activity-specific filtering by difficulty and capacity.")]
        public static Task<IReadOnlyList<TagSummary>> SearchTags(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional free-text search on tag name or description.")] string? query = null,
            [Description("Optional category filter: aktivnost, amenity, stil, cijena, tip, oznaka.")] string? category = null,
            [Description("Optional difficulty filter for activity tags: EASY, MEDIUM, HARD.")] string? difficulty = null,
            [Description("If true, only returns activity tags with a defined max capacity.")] bool? hasCapacity = null,
            [Description("Maximum number of results (default 50).")] int? limit = null)
        {
            return tourismService.SearchTagsAsync(
                new SearchTagsRequest(query, category, difficulty, hasCapacity, limit ?? 50),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_nearby", Title = "Get Nearby Locations", ReadOnly = true, Idempotent = true)]
        [Description("Find locations near a specific GPS coordinate within a given radius. Results are sorted by distance.")]
        public static Task<IReadOnlyList<PostSummary>> GetNearby(
            [Description("Latitude of the center point.")] double latitude,
            [Description("Longitude of the center point.")] double longitude,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Search radius in kilometers (default 5).")] double? radiusKm = null,
            [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] IReadOnlyList<string>? postTypes = null,
            [Description("Optional minimum rating filter.")] double? minRating = null,
            [Description("Maximum number of results (default 10).")] int? limit = null)
        {
            return tourismService.GetNearbyAsync(
                new GetNearbyRequest(latitude, longitude, radiusKm ?? 5.0, postTypes, minRating, limit ?? 10),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_similar_posts", Title = "Get Similar Locations", ReadOnly = true, Idempotent = true)]
        [Description("Get locations similar to a given location, matched by shared tags, same type, and same region.")]
        public static Task<IReadOnlyList<PostSummary>> GetSimilarPosts(
            [Description("The ID of the reference location.")] uint postId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Maximum number of similar results (default 5).")] int? limit = null)
        {
            return tourismService.GetSimilarPostsAsync(
                new GetSimilarPostsRequest(postId, limit ?? 5),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_top_content", Title = "Get Top / Most Popular Locations", ReadOnly = true, Idempotent = true)]
        [Description("Get the most popular locations ranked by a specific metric. SortBy values: views, likes, shares, rating, review_count.")]
        public static Task<IReadOnlyList<PostAnalyticsSummary>> GetTopContent(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Sort metric: views, likes, shares, rating, review_count.")] string sortBy = "views",
            [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] string? postType = null,
            [Description("Optional region ID to narrow results.")] uint? regionId = null,
            [Description("Maximum number of results (default 10).")] int? limit = null)
        {
            return tourismService.GetTopContentAsync(
                new GetTopContentRequest(sortBy, postType, regionId, limit ?? 10),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_search_events", Title = "Search Events", ReadOnly = true, Idempotent = true)]
        [Description("Search published events (concerts, festivals, sports, theatre, tours...). Returns all upcoming and past events when no date filter is applied. Categories: CONCERT, SPORT, THEATER, FESTIVAL, OTHER. Date filters are optional — omit them to see all events.")]
        public static Task<PagedResult<EventSummary>> SearchEvents(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional region ID to scope the search.")] uint? regionId = null,
            [Description("Optional free-text query matching event title or description.")] string? query = null,
            [Description("Optional start of date range (ISO 8601, e.g. 2025-07-01T00:00:00).")] DateTime? startFrom = null,
            [Description("Optional end of date range (ISO 8601, e.g. 2025-07-31T23:59:59).")] DateTime? startTo = null,
            [Description("Optional category filter: CONCERT, SPORT, THEATER, FESTIVAL, OTHER.")] string? category = null,
            [Description("If true, returns only events with an online ticket purchase URL.")] bool? hasTicketUrl = null,
            [Description("Sort order: start_date_asc (default), start_date_desc, rating, title.")] string? sortBy = null,
            [Description("Maximum number of results (default 10).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            return tourismService.SearchEventsAsync(
                new SearchEventsRequest(regionId, query, startFrom, startTo,
                    category, hasTicketUrl, sortBy, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_recommendations", Title = "Get Personalized Recommendations", ReadOnly = true, Idempotent = true)]
        [Description("Get personalized content recommendations for a specific region. contextMode: onsite (default) or planning.")]
        public static Task<IReadOnlyList<RecommendationItem>> GetRecommendations(
            [Description("The ID of the region to get recommendations for.")] uint regionId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional tourist ID for personalized recommendations.")] uint? touristId = null,
            [Description("Context mode: onsite (default) or planning.")] string? contextMode = null,
            [Description("Maximum number of results (default 10, max 20).")] int? limit = null)
        {
            return tourismService.GetRecommendationsAsync(
                new GetRecommendationsRequest(regionId, touristId, contextMode ?? "onsite", Math.Clamp(limit ?? 10, 1, 20)),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_route_reviews", Title = "Get Route Reviews", ReadOnly = true, Idempotent = true)]
        [Description("Get visitor reviews for a specific route by route ID.")]
        public static Task<PagedResult<ReviewSummary>> GetRouteReviews(
            [Description("The ID of the route to get reviews for.")] uint routeId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("If true, returns only approved reviews (default true).")] bool? onlyApproved = null,
            [Description("Optional minimum rating filter (1-5).")] int? minRating = null,
            [Description("Optional maximum rating filter (1-5).")] int? maxRating = null,
            [Description("Sort order: rating_asc, rating_desc, or newest (default).")] string? sortBy = null,
            [Description("Maximum number of results (default 20).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            return tourismService.GetRouteReviewsAsync(
                new GetRouteReviewsRequest(routeId, onlyApproved ?? true, minRating, maxRating, sortBy, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_new_content", Title = "Get Recently Published Content", ReadOnly = true, Idempotent = true)]
        [Description("Get recently published locations and routes, ordered by publish date.")]
        public static Task<IReadOnlyList<NewContentItem>> GetNewContent(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional region ID to filter by destination.")] uint? regionId = null,
            [Description("How many days back to look for new content (default 30).")] int? daysBack = null,
            [Description("Maximum number of results (default 20).")] int? limit = null)
        {
            return tourismService.GetNewContentAsync(
                new GetNewContentRequest(regionId, daysBack ?? 30, limit ?? 20),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_search_activities", Title = "Search Activities", ReadOnly = true, Idempotent = true)]
        [Description("Search activities and things to do (tags with category=aktivnost). Use 'category' to filter by subcategory encoded in color field: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER. Omit category to get all activities.")]
        public static Task<IReadOnlyList<TagSummary>> SearchActivities(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional free-text search on activity name or description.")] string? query = null,
            [Description("Optional category: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER.")] string? category = null,
            [Description("Optional difficulty: EASY, MEDIUM, HARD.")] string? difficulty = null,
            [Description("Minimum group capacity.")] int? minCapacity = null,
            [Description("Maximum group capacity.")] int? maxCapacity = null,
            [Description("Maximum number of results (default 50).")] int? limit = null)
        {
            return tourismService.SearchActivitiesAsync(
                new SearchActivitiesRequest(query, category, difficulty, minCapacity, maxCapacity, limit ?? 50),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_visit_trends", Title = "Get Visit Trends", ReadOnly = true, Idempotent = true)]
        [Description("Get daily visit counts over a time period to identify peak tourist seasons.")]
        public static Task<IReadOnlyList<VisitTrendPoint>> GetVisitTrends(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional region ID to scope trends to a specific destination.")] uint? regionId = null,
            [Description("Start of date range (ISO 8601). Defaults to 30 days ago.")] DateTime? fromDate = null,
            [Description("End of date range (ISO 8601). Defaults to now.")] DateTime? toDate = null)
        {
            return tourismService.GetVisitTrendsAsync(
                new GetVisitTrendsRequest(regionId, fromDate, toDate),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_my_saved", Title = "Get My Saved Locations", ReadOnly = true, Idempotent = true)]
        [Description("Get the locations bookmarked/saved by the currently logged-in tourist. Requires authentication.")]
        public static Task<PagedResult<SavedPostSummary>> GetMySaved(
            ICurrentTouristContext currentTourist,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Maximum number of results (default 20).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            if (!currentTourist.IsAuthenticated)
                return Task.FromResult(new PagedResult<SavedPostSummary>([], 0, false));

            return tourismService.GetSavedPostsAsync(
                new GetSavedPostsRequest(currentTourist.TouristId, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_my_planner", Title = "Get My Visit Planner", ReadOnly = true, Idempotent = true)]
        [Description("Get the visit planners of the currently logged-in tourist — multi-day itineraries with locations and routes organized by day. Requires authentication.")]
        public static Task<IReadOnlyList<PlannerSummary>> GetMyPlanner(
            ICurrentTouristContext currentTourist,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("If true, returns only publicly shared planners (default false).")] bool? onlyPublic = null)
        {
            if (!currentTourist.IsAuthenticated)
                return Task.FromResult<IReadOnlyList<PlannerSummary>>([]);

            return tourismService.GetTouristPlannersAsync(
                new GetTouristPlannerRequest(currentTourist.TouristId!.Value, onlyPublic ?? false),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_my_favorites", Title = "Get My Favorite Locations and Routes", ReadOnly = true, Idempotent = true)]
        [Description("Get the locations and routes marked as favorites by the currently logged-in tourist. entityType: 'post', 'route', or omit for both. Requires authentication.")]
        public static Task<PagedResult<TouristFavoriteSummary>> GetMyFavorites(
            ICurrentTouristContext currentTourist,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken,
            [Description("Optional entity type filter: 'post' for locations only, 'route' for routes only.")] string? entityType = null,
            [Description("Maximum number of results (default 20).")] int? limit = null,
            [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
        {
            if (!currentTourist.IsAuthenticated)
                return Task.FromResult(new PagedResult<TouristFavoriteSummary>([], 0, false));

            return tourismService.GetTouristFavoritesAsync(
                new GetTouristFavoritesRequest(currentTourist.TouristId, entityType, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

    }
