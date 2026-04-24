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

    // Novo
    public DbSet<ReviewEntity> Reviews => Set<ReviewEntity>();
    public DbSet<TouristEntity> Tourists => Set<TouristEntity>();
    public DbSet<PostViewEntity> PostViews => Set<PostViewEntity>();
    public DbSet<PostLikeEntity> PostLikes => Set<PostLikeEntity>();
    public DbSet<ContentShareEntity> ContentShares => Set<ContentShareEntity>();

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
            e.Property(x => x.Status).HasColumnName("status");
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
    }
}