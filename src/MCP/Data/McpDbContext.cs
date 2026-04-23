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
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Difficulty).HasColumnName("difficulty");
            e.Property(x => x.Duration).HasColumnName("duration");
        });

        modelBuilder.Entity<PostTagEntity>(e =>
        {
            e.ToTable("post_tag");
            e.HasKey(x => new { x.PostId, x.TagId });
            e.Property(x => x.PostId).HasColumnName("post_id");
            e.Property(x => x.TagId).HasColumnName("tag_id");
            e.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId);
        });
    }
}