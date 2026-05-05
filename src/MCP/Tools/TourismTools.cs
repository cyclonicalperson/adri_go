using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
    internal static class TourismTools
    {
        // ── Regije ────────────────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_search_regions", Title = "Search Regions", ReadOnly = true, Idempotent = true)]
        [Description("Search tourist regions and destinations such as cities, mountains, lakes, and national parks. Returns paged results with total count.")]
        public static Task<PagedResult<RegionSummary>> SearchRegions(
            [Description("Optional free-text query, e.g. Zabljak, Budva, Durmitor.")] string? query,
            [Description("Optional type filter: city, mountain, lake, national_park, coast, village, other.")] string? type,
            [Description("Optional country filter, e.g. Montenegro.")] string? country,
            [Description("If true, returns only regions with GPS coordinates.")] bool? hasCoordinates,
            [Description("Maximum number of results (default 10).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.SearchRegionsAsync(
                new SearchRegionsRequest(query, type, country, hasCoordinates, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_region_summary", Title = "Get Region Summary", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get a full overview of a specific region including total post count, total route count,
        average rating, and breakdown of posts by type (accommodation, restaurant, etc.).
        Use this when the user asks 'what does region X offer' or 'tell me about destination Y'.
        Requires a region ID — use tourism_search_regions first if you don't have one.
        """)]
        public static Task<RegionFullSummary?> GetRegionSummary(
            [Description("The ID of the region to summarize.")] uint regionId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetRegionSummaryAsync(new GetRegionSummaryRequest(regionId), cancellationToken);
        }

        // ── Objekti / Lokacije ────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_search_posts", Title = "Search Locations", ReadOnly = true, Idempotent = true)]
        [Description("""
        Search published locations and points of interest. Returns paged results with total count.
        Post types: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.
        Use tags[] to filter by activity or amenity (e.g. 'hiking', 'wifi', 'pool').
        Provide userLatitude + userLongitude + radiusKm to restrict results by proximity.
        SortBy options: rating (default), distance (requires coordinates), title.
        Workflow: for detailed info on a result, call tourism_get_post_detail with the returned ID.
        """)]
        public static Task<PagedResult<PostSummary>> SearchPosts(
            [Description("Optional region ID to scope the search.")] uint? regionId,
            [Description("Optional free-text query matching title, description, or address.")] string? query,
            [Description("Optional post type list: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.")] IReadOnlyList<string>? postTypes,
            [Description("Optional minimum average rating (0–5).")] double? minRating,
            [Description("Optional maximum average rating (0–5).")] double? maxRating,
            [Description("Optional tag names to filter by (e.g. 'hiking', 'pool', 'family_friendly').")] IReadOnlyList<string>? tags,
            [Description("If true, only returns locations that have an external booking/info URL.")] bool? hasExternalUrl,
            [Description("If true, only returns locations with opening hours defined.")] bool? hasOpeningHours,
            [Description("User latitude for proximity sorting and radius filtering.")] double? userLatitude,
            [Description("User longitude for proximity sorting and radius filtering.")] double? userLongitude,
            [Description("Only return results within this many km from the user location.")] double? radiusKm,
            [Description("Sort order: rating, distance, title.")] string? sortBy,
            [Description("Maximum number of results (default 10).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.SearchPostsAsync(
                new SearchPostsRequest(regionId, query, postTypes, minRating, maxRating,
                    userLatitude, userLongitude, radiusKm, tags,
                    hasExternalUrl, hasOpeningHours, sortBy, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_post_detail", Title = "Get Location Detail", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get full details for a specific location by ID: description, opening hours, rating,
        view count, likes, review count, all tags, and external booking URL.
        Use after tourism_search_posts when the user wants more information about a specific result.
        """)]
        public static Task<PostDetail?> GetPostDetail(
            [Description("The ID of the location to retrieve (from tourism_search_posts results).")] uint postId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetPostDetailAsync(new PostDetailRequest(postId), cancellationToken);
        }

        // ── Rute ──────────────────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_search_routes", Title = "Search Routes", ReadOnly = true, Idempotent = true)]
        [Description("""
        Search published tourist routes (hiking, cycling, walking...). Returns paged results with total count.
        Difficulty levels: easy, moderate, hard, expert.
        SortBy options: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc.
        Use maxElevationGain to find flat routes suitable for beginners or families.
        Workflow: for full route info (waypoints, GPX), call tourism_get_route_detail with the returned ID.
        """)]
        public static Task<PagedResult<RouteSummary>> SearchRoutes(
            [Description("Optional region ID.")] uint? regionId,
            [Description("Optional free-text query matching route name or description.")] string? query,
            [Description("Optional difficulty list: easy, moderate, hard, expert.")] IReadOnlyList<string>? difficulties,
            [Description("Optional maximum route distance in kilometers.")] decimal? maxDistanceKm,
            [Description("Optional minimum route distance in kilometers.")] decimal? minDistanceKm,
            [Description("Optional maximum duration in minutes.")] int? maxDurationMinutes,
            [Description("Optional minimum duration in minutes.")] int? minDurationMinutes,
            [Description("Optional maximum elevation gain in meters — use to find flat routes.")] uint? maxElevationGain,
            [Description("Sort order: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc.")] string? sortBy,
            [Description("Maximum number of results (default 10).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.SearchRoutesAsync(
                new SearchRoutesRequest(regionId, query, difficulties,
                    maxDistanceKm, minDistanceKm,
                    maxDurationMinutes, minDurationMinutes,
                    maxElevationGain, null, sortBy, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_route_detail", Title = "Get Route Detail", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get full details for a specific route by ID: waypoints, GPX file path, view count, and save count.
        Use after tourism_search_routes when the user wants more information about a specific route.
        """)]
        public static Task<RouteDetail?> GetRouteDetail(
            [Description("The ID of the route to retrieve (from tourism_search_routes results).")] uint routeId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetRouteDetailAsync(new RouteDetailRequest(routeId), cancellationToken);
        }

        // ── Recenzije ─────────────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_reviews", Title = "Get Location Reviews", ReadOnly = true, Idempotent = true)]
        [Description("Get visitor reviews for a specific location by post ID. Returns paged results. Filter by rating range or sort by date or rating to understand visitor experiences.")]
        public static Task<PagedResult<ReviewSummary>> GetReviews(
            [Description("The ID of the location to get reviews for (from tourism_search_posts results).")] uint postId,
            [Description("If true, returns only approved reviews (default true).")] bool? onlyApproved,
            [Description("Optional minimum rating filter (1–5).")] int? minRating,
            [Description("Optional maximum rating filter (1–5).")] int? maxRating,
            [Description("Sort order: rating_asc, rating_desc, or newest (default).")] string? sortBy,
            [Description("Maximum number of results (default 20).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetReviewsAsync(
                new GetReviewsRequest(postId, onlyApproved ?? true, minRating, maxRating, sortBy, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

        // ── Tagovi / Aktivnosti ───────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_search_tags", Title = "Search Tags and Activities", ReadOnly = true, Idempotent = true)]
        [Description("""
        Search available tags and activity categories.
        Useful to discover what activities or amenities exist before filtering tourism_search_posts.
        Categories: aktivnost (activity), amenity, stil (style), cijena (price), tip (type), oznaka (label).
        Difficulty (for activities only): EASY, MEDIUM, HARD.
        """)]
        public static Task<IReadOnlyList<TagSummary>> SearchTags(
            [Description("Optional free-text search on tag name or description.")] string? query,
            [Description("Optional category filter: aktivnost, amenity, stil, cijena, tip, oznaka.")] string? category,
            [Description("Optional difficulty filter for activity tags: EASY, MEDIUM, HARD.")] string? difficulty,
            [Description("If true, only returns activity tags with a defined max capacity.")] bool? hasCapacity,
            [Description("Maximum number of results (default 50).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.SearchTagsAsync(
                new SearchTagsRequest(query, category, difficulty, hasCapacity, limit ?? 50),
                cancellationToken);
        }

        // ── Proximity / Preporuke ─────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_nearby", Title = "Get Nearby Locations", ReadOnly = true, Idempotent = true)]
        [Description("""
        Find locations near a specific GPS coordinate within a given radius.
        Results are sorted by distance (closest first).
        Ideal for: 'what is near me', 'what can I visit near this hotel', 'restaurants within 2km'.
        """)]
        public static Task<IReadOnlyList<PostSummary>> GetNearby(
            [Description("Latitude of the center point.")] double latitude,
            [Description("Longitude of the center point.")] double longitude,
            [Description("Search radius in kilometers (default 5).")] double? radiusKm,
            [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] IReadOnlyList<string>? postTypes,
            [Description("Optional minimum rating filter.")] double? minRating,
            [Description("Maximum number of results (default 10).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetNearbyAsync(
                new GetNearbyRequest(latitude, longitude, radiusKm ?? 5.0, postTypes, minRating, limit ?? 10),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_similar_posts", Title = "Get Similar Locations", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get locations similar to a given location, matched by shared tags, same type, and same region.
        Ranked by number of shared tags, then by rating.
        Use for: 'show me more like this', 'are there alternatives', 'similar accommodation'.
        """)]
        public static Task<IReadOnlyList<PostSummary>> GetSimilarPosts(
            [Description("The ID of the reference location (from tourism_search_posts results).")] uint postId,
            [Description("Maximum number of similar results (default 5).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetSimilarPostsAsync(
                new GetSimilarPostsRequest(postId, limit ?? 5),
                cancellationToken);
        }

        // ── Analitika ─────────────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_post_analytics", Title = "Get Location Analytics", ReadOnly = true, Idempotent = true)]
        [Description("Get engagement analytics for one or more locations: total views, unique views, likes, shares, and review count. Use for questions about popularity or engagement.")]
        public static Task<IReadOnlyList<PostAnalyticsSummary>> GetPostAnalytics(
            [Description("Optional specific post ID to get analytics for.")] uint? postId,
            [Description("Optional region ID to get analytics for all posts in a region.")] uint? regionId,
            [Description("Maximum number of results (default 10).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetPostAnalyticsAsync(
                new GetPostAnalyticsRequest(postId, regionId, limit ?? 10),
                cancellationToken);
        }

        [McpServerTool(Name = "tourism_get_top_content", Title = "Get Top / Most Popular Locations", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get the most popular locations ranked by a specific metric.
        SortBy values: views (default), likes, shares, rating, review_count.
        Use for: 'most visited restaurants', 'top rated attractions in region X', 'what do tourists like most'.
        """)]
        public static Task<IReadOnlyList<PostAnalyticsSummary>> GetTopContent(
            [Description("Sort metric: views, likes, shares, rating, review_count.")] string sortBy,
            [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] string? postType,
            [Description("Optional region ID to narrow results.")] uint? regionId,
            [Description("Maximum number of results (default 10).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetTopContentAsync(
                new GetTopContentRequest(sortBy, postType, regionId, limit ?? 10),
                cancellationToken);
        }

        // ── Turisti ───────────────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_tourist_stats", Title = "Get Tourist Statistics", ReadOnly = true, Idempotent = true)]
        [Description("Get aggregate statistics about registered tourists: total count, active users, email verification rate, new registrations in last 30 days, and breakdown by language.")]
        public static Task<TouristStats> GetTouristStats(
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetTouristStatsAsync(new GetTouristStatsRequest(), cancellationToken);
        }

        [McpServerTool(Name = "tourism_search_tourists", Title = "Search Tourists", ReadOnly = true, Idempotent = true)]
        [Description("Search registered tourists by name, email, or language. Returns paged results with basic profile info (no sensitive data). Filter by active status or email verification.")]
        public static Task<PagedResult<TouristSummary>> SearchTourists(
            [Description("Optional free-text search on name or email.")] string? query,
            [Description("Optional filter for active/inactive tourists.")] bool? isActive,
            [Description("Optional filter for email-verified tourists.")] bool? isEmailVerified,
            [Description("Optional language filter, e.g. 'en', 'sr', 'de'.")] string? language,
            [Description("Maximum number of results (default 20).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.SearchTouristsAsync(
                new SearchTouristsRequest(query, isActive, isEmailVerified, language, limit ?? 20, offset ?? 0),
                cancellationToken);
        }


        // ── Događaji ──────────────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_search_events", Title = "Search Events", ReadOnly = true, Idempotent = true)]
        [Description("""
        Search published events (concerts, sports, theatre, festivals, tours...). Returns paged results sorted by start date ascending by default.
        Categories: CONCERT, SPORT, THEATER, FESTIVAL, OTHER.
        SortBy options: start_date_asc (default), start_date_desc, rating, title.
        Use startFrom and startTo to find events in a specific date range.
        Use hasTicketUrl=true to find only events where tickets can be purchased online.
        Workflow: for full location details, call tourism_get_post_detail with the returned ID.
        """)]
        public static Task<PagedResult<EventSummary>> SearchEvents(
            [Description("Optional region ID to scope the search.")] uint? regionId,
            [Description("Optional free-text query matching event title or description.")] string? query,
            [Description("Optional start of date range — return events starting on or after this date (ISO 8601, e.g. 2025-07-01T00:00:00).")] DateTime? startFrom,
            [Description("Optional end of date range — return events starting on or before this date (ISO 8601, e.g. 2025-07-31T23:59:59).")] DateTime? startTo,
            [Description("Optional category filter: CONCERT, SPORT, THEATER, FESTIVAL, OTHER.")] string? category,
            [Description("If true, returns only events with an online ticket purchase URL.")] bool? hasTicketUrl,
            [Description("Sort order: start_date_asc (default), start_date_desc, rating, title.")] string? sortBy,
            [Description("Maximum number of results (default 10).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.SearchEventsAsync(
                new SearchEventsRequest(regionId, query, startFrom, startTo,
                    category, hasTicketUrl, sortBy, limit ?? 10, offset ?? 0),
                cancellationToken);
        }

        // ── Personalizovane preporuke ──────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_recommendations", Title = "Get Personalized Recommendations", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get personalized content recommendations for a specific region.
        If touristId is provided, recommendations are personalized based on the tourist's likes, reviews, viewed posts, and declared interests.
        Without touristId, returns popularity-based recommendations with content diversity (mix of post types and routes).

        contextMode controls what content is shown:
          - onsite (default): tourist is already at the destination — excludes accommodation, focuses on activities and attractions.
          - planning: tourist is planning a visit — includes accommodation suggestions.

        Results are diversified to avoid showing only one content type (e.g. not 10 restaurants in a row).
        Use tourism_get_post_detail or tourism_get_route_detail for full details on any returned item.
        """)]
        public static Task<IReadOnlyList<RecommendationItem>> GetRecommendations(
            [Description("The ID of the region to get recommendations for. Use tourism_search_regions to find it.")] uint regionId,
            [Description("Optional tourist ID for personalized recommendations. Without this, returns popularity-based results.")] uint? touristId,
            [Description("Context mode: 'onsite' (default, tourist is at destination) or 'planning' (tourist is planning a visit, includes accommodation).")] string? contextMode,
            [Description("Maximum number of results (default 10, max 20).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetRecommendationsAsync(
                new GetRecommendationsRequest(regionId, touristId, contextMode ?? "onsite", Math.Clamp(limit ?? 10, 1, 20)),
                cancellationToken);
        }

        // ── Recenzije ruta ───────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_route_reviews", Title = "Get Route Reviews", ReadOnly = true, Idempotent = true)]
        [Description("Get visitor reviews for a specific route by route ID. Returns paged results. Filter by rating range or sort by date or rating.")]
        public static Task<PagedResult<ReviewSummary>> GetRouteReviews(
            [Description("The ID of the route to get reviews for (from tourism_search_routes results).")] uint routeId,
            [Description("If true, returns only approved reviews (default true).")] bool? onlyApproved,
            [Description("Optional minimum rating filter (1–5).")] int? minRating,
            [Description("Optional maximum rating filter (1–5).")] int? maxRating,
            [Description("Sort order: rating_asc, rating_desc, or newest (default).")] string? sortBy,
            [Description("Maximum number of results (default 20).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetRouteReviewsAsync(
                new GetRouteReviewsRequest(routeId, onlyApproved ?? true, minRating, maxRating, sortBy, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

        // ── Analitika regija ───────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_region_analytics", Title = "Get Region Analytics", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get detailed analytics for a specific region: total posts, routes, views, likes, shares, average rating, and breakdown by content type.
        Use for: 'which region is most popular', 'how many visitors does Zabljak get', 'what is the average rating in this region'.
        Requires a region ID — use tourism_search_regions first.
        """)]
        public static Task<RegionAnalyticsSummary?> GetRegionAnalytics(
            [Description("The ID of the region to get analytics for.")] uint regionId,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetRegionAnalyticsAsync(
                new GetRegionAnalyticsRequest(regionId), cancellationToken);
        }

        // ── Novi sadržaj ─────────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_new_content", Title = "Get Recently Published Content", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get recently published locations and routes, ordered by publish date.
        Use for: 'what is new in Zabljak', 'what was published this month', 'latest additions to the guide'.
        daysBack controls how far back to look (default 30 days).
        """)]
        public static Task<IReadOnlyList<NewContentItem>> GetNewContent(
            [Description("Optional region ID to filter by destination.")] uint? regionId,
            [Description("How many days back to look for new content (default 30).")] int? daysBack,
            [Description("Maximum number of results (default 20).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetNewContentAsync(
                new GetNewContentRequest(regionId, daysBack ?? 30, limit ?? 20),
                cancellationToken);
        }

        // ── Specijalizovani alat za aktivnosti ───────────────────────────────

        [McpServerTool(Name = "tourism_search_activities", Title = "Search Activities", ReadOnly = true, Idempotent = true)]
        [Description("""
        Search activities and things to do. Specialized view of tags filtered to category 'aktivnost'.
        Categories: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER.
        Difficulty: EASY, MEDIUM, HARD.
        Use minCapacity/maxCapacity to find activities suitable for groups of a specific size.
        Example: 'wellness activities for groups of 10' → category=WELLNESS, minCapacity=10.
        """)]
        public static Task<IReadOnlyList<TagSummary>> SearchActivities(
            [Description("Optional free-text search on activity name or description.")] string? query,
            [Description("Optional category: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER.")] string? category,
            [Description("Optional difficulty: EASY, MEDIUM, HARD.")] string? difficulty,
            [Description("Minimum group capacity (e.g. 10 = at least 10 people can participate).")] int? minCapacity,
            [Description("Maximum group capacity.")] int? maxCapacity,
            [Description("Maximum number of results (default 50).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.SearchActivitiesAsync(
                new SearchActivitiesRequest(query, category, difficulty, minCapacity, maxCapacity, limit ?? 50),
                cancellationToken);
        }

        // ── Trend poseta ───────────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_visit_trends", Title = "Get Visit Trends", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get daily visit counts over a time period to identify peak tourist seasons.
        Use for: 'when was the busiest month', 'show summer visit trends', 'how did visits change over time'.
        fromDate and toDate default to the last 30 days if not provided.
        """)]
        public static Task<IReadOnlyList<VisitTrendPoint>> GetVisitTrends(
            [Description("Optional region ID to scope trends to a specific destination.")] uint? regionId,
            [Description("Start of date range (ISO 8601, e.g. 2025-06-01T00:00:00). Defaults to 30 days ago.")] DateTime? fromDate,
            [Description("End of date range (ISO 8601). Defaults to now.")] DateTime? toDate,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetVisitTrendsAsync(
                new GetVisitTrendsRequest(regionId, fromDate, toDate),
                cancellationToken);
        }

        // ── Sačuvane lokacije ─────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_saved_posts", Title = "Get Saved Locations", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get locations that tourists have bookmarked/saved. Filter by touristId for a specific tourist's list.
        Without touristId, returns the most recently saved locations across all tourists.
        Use for: 'what did tourist X save', 'what are tourists bookmarking most', 'show my saved places'.
        """)]
        public static Task<PagedResult<SavedPostSummary>> GetSavedPosts(
            [Description("Optional tourist ID to get a specific tourist's saved locations.")] uint? touristId,
            [Description("Maximum number of results (default 20).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetSavedPostsAsync(
                new GetSavedPostsRequest(touristId, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

        // ── Planeri putovanja ─────────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_tourist_planner", Title = "Get Tourist Visit Planner", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get visit planners for a specific tourist — multi-day itineraries with locations and routes organized by day.
        Use for: 'show me tourist X planned itinerary', 'what is planned for day 2', 'what is on the trip schedule'.
        Set onlyPublic=true to see only publicly shared planners.
        """)]
        public static Task<IReadOnlyList<PlannerSummary>> GetTouristPlanner(
            [Description("The ID of the tourist whose planners to retrieve.")] uint touristId,
            [Description("If true, returns only publicly shared planners (default false).")] bool? onlyPublic,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetTouristPlannersAsync(
                new GetTouristPlannerRequest(touristId, onlyPublic ?? false),
                cancellationToken);
        }

        // ── Omiljene lokacije i rute ────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_tourist_favorites", Title = "Get Tourist Favorites", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get locations and routes that a tourist has marked as favorites.
        Unlike tourism_get_saved_posts (which covers the saved_post table),
        this tool covers the tourist_favorite table which includes BOTH posts and routes.
        Use for: 'what has tourist X favorited', 'which routes did this tourist save',
        'show me my favorite locations and routes'.
        entityType filter: 'post' (locations only), 'route' (routes only), or omit for both.
        """)]
        public static Task<PagedResult<TouristFavoriteSummary>> GetTouristFavorites(
            [Description("Optional tourist ID to filter by a specific tourist.")] uint? touristId,
            [Description("Optional entity type filter: 'post' for locations only, 'route' for routes only.")] string? entityType,
            [Description("Maximum number of results (default 20).")] int? limit,
            [Description("Number of results to skip for pagination (default 0).")] int? offset,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetTouristFavoritesAsync(
                new GetTouristFavoritesRequest(touristId, entityType, limit ?? 20, offset ?? 0),
                cancellationToken);
        }

        // ── Klikovi na external URL ───────────────────────────────────────

        [McpServerTool(Name = "tourism_get_external_click_stats", Title = "Get External Link Click Stats", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get statistics on how many times tourists clicked external booking or info links for each location.
        Useful for understanding which locations drive the most bookings or external interest.
        Use for: 'which locations get the most booking clicks', 'what are tourists trying to book',
        'which Booking.com or Airbnb links are most clicked', 'most commercially interesting locations'.
        Results are sorted by total clicks descending.
        """)]
        public static Task<IReadOnlyList<ExternalClickSummary>> GetExternalClickStats(
            [Description("Optional specific post ID to get click stats for one location.")] uint? postId,
            [Description("Optional region ID to scope results to a specific destination.")] uint? regionId,
            [Description("Maximum number of results (default 20).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetExternalClickStatsAsync(
                new GetExternalClickStatsRequest(postId, regionId, limit ?? 20),
                cancellationToken);
        }

        // ── Zahtevi za pravac ─────────────────────────────────────────

        [McpServerTool(Name = "tourism_get_direction_stats", Title = "Get Navigation Request Stats", ReadOnly = true, Idempotent = true)]
        [Description("""
        Get statistics on how many times tourists requested navigation directions to each location.
        High direction request counts indicate locations that are hard to find or very popular destinations.
        Use for: 'which locations do tourists navigate to most', 'what are the most visited physical spots',
        'which locations need better signage or directions', 'where do tourists actually go'.
        Results are sorted by total navigation requests descending.
        """)]
        public static Task<IReadOnlyList<DirectionRequestSummary>> GetDirectionStats(
            [Description("Optional region ID to scope results to a specific destination.")] uint? regionId,
            [Description("Maximum number of results (default 20).")] int? limit,
            ITourismQueryService tourismService,
            CancellationToken cancellationToken)
        {
            return tourismService.GetDirectionStatsAsync(
                new GetDirectionStatsRequest(regionId, limit ?? 20),
                cancellationToken);
        }
    }