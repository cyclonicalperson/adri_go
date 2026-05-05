using Mcp.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Mcp.Data;

internal sealed class McpDbContext : DbContext
{
    public McpDbContext(DbContextOptions<McpDbContext> options) : base(options) { }

    public DbSet<RegionEntity> Regions => Set<RegionEntity>();
    public DbSet<PostEntity> Posts => Set<PostEntity>();
    public DbSet<RouteEntity> Routes => Set<RouteEntity>();
    public DbSet<TagEntity> Tags => Set<TagEntity>();
    public DbSet<PostTagEntity> PostTags => Set<PostTagEntity>();
    public DbSet<ReviewEntity> Reviews => Set<ReviewEntity>();
    public DbSet<TouristEntity> Tourists => Set<TouristEntity>();
    public DbSet<PostViewEntity> PostViews => Set<PostViewEntity>();
    public DbSet<PostLikeEntity> PostLikes => Set<PostLikeEntity>();
    public DbSet<ContentShareEntity> ContentShares => Set<ContentShareEntity>();
    public DbSet<SavedPostEntity> SavedPosts => Set<SavedPostEntity>();
    public DbSet<VisitPlannerEntity> VisitPlanners => Set<VisitPlannerEntity>();
    public DbSet<PlannerItemEntity> PlannerItems => Set<PlannerItemEntity>();
    public DbSet<TouristFavoriteEntity> TouristFavorites => Set<TouristFavoriteEntity>();
    public DbSet<ExternalClickEntity> ExternalClicks => Set<ExternalClickEntity>();
    public DbSet<DirectionRequestEntity> DirectionRequests => Set<DirectionRequestEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RegionEntity>(e =>
        {
            e.ToTable("region");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Type).HasColumnName("type");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Country).HasColumnName("country");
            e.Property(x => x.Lat).HasColumnName("lat");
            e.Property(x => x.Lng).HasColumnName("lng");
            e.Property(x => x.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<PostEntity>(e =>
        {
            e.ToTable("post");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RegionId).HasColumnName("region_id");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.PostType).HasColumnName("post_type");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Lat).HasColumnName("lat");
            e.Property(x => x.Lng).HasColumnName("lng");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.ExternalUrl).HasColumnName("external_url");
            e.Property(x => x.OpeningHours).HasColumnName("opening_hours");
            e.Property(x => x.Details).HasColumnName("details");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.AvgRating).HasColumnName("avg_rating");
            e.Property(x => x.ReviewCount).HasColumnName("review_count");
            e.Property(x => x.PublishedAt).HasColumnName("published_at");

            e.HasMany(x => x.PostTags)
             .WithOne()
             .HasForeignKey(x => x.PostId);
        });

        modelBuilder.Entity<RouteEntity>(e =>
        {
            e.ToTable("route");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RegionId).HasColumnName("region_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Difficulty).HasColumnName("difficulty");
            e.Property(x => x.DistanceKm).HasColumnName("distance_km");
            e.Property(x => x.DurationMin).HasColumnName("duration_min");
            e.Property(x => x.ElevationGain).HasColumnName("elevation_gain");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Waypoints).HasColumnName("waypoints");       
            e.Property(x => x.GpxFilePath).HasColumnName("gpx_file_path"); 
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.ViewCount).HasColumnName("view_count");
            e.Property(x => x.SaveCount).HasColumnName("save_count");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<TagEntity>(e =>
        {
            e.ToTable("tag");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Category).HasColumnName("category");
            e.Property(x => x.Color).HasColumnName("color");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Duration).HasColumnName("duration");
            e.Property(x => x.Difficulty).HasColumnName("difficulty");
            e.Property(x => x.MaxCapacity).HasColumnName("max_capacity");
        });

        modelBuilder.Entity<PostTagEntity>(e =>
        {
            e.ToTable("post_tag");
            e.HasKey(x => new { x.PostId, x.TagId });
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.TagId).HasColumnName("tag_id");
            e.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId);
        });

        modelBuilder.Entity<ReviewEntity>(e =>
        {
            e.ToTable("review");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.RouteId).HasColumnName("route_id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.Rating).HasColumnName("rating");
            e.Property(x => x.Comment).HasColumnName("comment");
            e.Property(x => x.IsApproved).HasColumnName("is_approved");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Tourist).WithMany().HasForeignKey(x => x.TouristId);
        });

        modelBuilder.Entity<TouristEntity>(e =>
        {
            e.ToTable("tourist");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Language).HasColumnName("language");
            e.Property(x => x.Interests).HasColumnName("interests");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.IsEmailVerified).HasColumnName("is_email_verified");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<PostViewEntity>(e =>
        {
            e.ToTable("post_view");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.ViewedAt).HasColumnName("viewed_at");
            e.Property(x => x.DurationSec).HasColumnName("duration_sec");
        });

        modelBuilder.Entity<PostLikeEntity>(e =>
        {
            e.ToTable("post_like");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.LikedAt).HasColumnName("liked_at");
        });

        modelBuilder.Entity<ContentShareEntity>(e =>
        {
            e.ToTable("content_share");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.RouteId).HasColumnName("route_id");
            e.Property(x => x.Platform).HasColumnName("platform");
            e.Property(x => x.SharedAt).HasColumnName("shared_at");
        });

        modelBuilder.Entity<SavedPostEntity>(e =>
        {
            e.ToTable("saved_post");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId);
        });

        modelBuilder.Entity<VisitPlannerEntity>(e =>
        {
            e.ToTable("visit_planner");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.StartDate).HasColumnName("start_date");
            e.Property(x => x.EndDate).HasColumnName("end_date");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.IsPublic).HasColumnName("is_public");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.PlannerId);
        });

        modelBuilder.Entity<PlannerItemEntity>(e =>
        {
            e.ToTable("planner_item");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PlannerId).HasColumnName("planner_id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.RouteId).HasColumnName("route_id");
            e.Property(x => x.DayNumber).HasColumnName("day_number");
            e.Property(x => x.OrderInDay).HasColumnName("order_in_day");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.ScheduledTime).HasColumnName("scheduled_time");
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId);
            e.HasOne(x => x.Route).WithMany().HasForeignKey(x => x.RouteId);
        });

        modelBuilder.Entity<TouristFavoriteEntity>(e =>
        {
            e.ToTable("tourist_favorite");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.RouteId).HasColumnName("route_id");
            e.Property(x => x.SavedAt).HasColumnName("saved_at");
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId).IsRequired(false);
            e.HasOne(x => x.Route).WithMany().HasForeignKey(x => x.RouteId).IsRequired(false);
        });

        modelBuilder.Entity<ExternalClickEntity>(e =>
        {
            e.ToTable("external_click");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.Url).HasColumnName("url");
            e.Property(x => x.ClickedAt).HasColumnName("clicked_at");
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId);
        });

        modelBuilder.Entity<DirectionRequestEntity>(e =>
        {
            e.ToTable("direction_request");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TouristId).HasColumnName("tourist_id");
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.FromLat).HasColumnName("from_lat");
            e.Property(x => x.FromLng).HasColumnName("from_lng");
            e.Property(x => x.RequestedAt).HasColumnName("requested_at");
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId);
        });
    }
}