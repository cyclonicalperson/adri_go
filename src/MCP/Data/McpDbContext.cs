using Mcp.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Mcp.Data;

internal sealed class McpDbContext : DbContext
{
    public McpDbContext(DbContextOptions<McpDbContext> options)
        : base(options)
    {
    }

    public DbSet<DestinationEntity> Destinations => Set<DestinationEntity>();
    public DbSet<RouteEntity> Routes => Set<RouteEntity>();
    public DbSet<EventEntity> Events => Set<EventEntity>();
    public DbSet<ObjectEntity> Objects => Set<ObjectEntity>();
    public DbSet<AccommodationDetailEntity> AccommodationDetails => Set<AccommodationDetailEntity>();
    public DbSet<AmenityEntity> Amenities => Set<AmenityEntity>();
    public DbSet<ObjectAmenityEntity> ObjectAmenities => Set<ObjectAmenityEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DestinationEntity>(entity =>
        {
            entity.ToTable("destinations");
            entity.HasKey(x => x.DestinationId);
            entity.Property(x => x.DestinationId).HasColumnName("destination_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(x => x.Region).HasColumnName("region").HasMaxLength(100);
            entity.Property(x => x.Latitude).HasColumnName("latitude").HasPrecision(10, 7);
            entity.Property(x => x.Longitude).HasColumnName("longitude").HasPrecision(10, 7);
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(x => x.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<RouteEntity>(entity =>
        {
            entity.ToTable("routes");
            entity.HasKey(x => x.RouteId);
            entity.Property(x => x.RouteId).HasColumnName("route_id");
            entity.Property(x => x.DestinationId).HasColumnName("destination_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.RouteType).HasColumnName("route_type").HasMaxLength(20).IsRequired();
            entity.Property(x => x.Difficulty).HasColumnName("difficulty").HasMaxLength(20).IsRequired();
            entity.Property(x => x.DistanceKm).HasColumnName("distance_km").HasPrecision(6, 2);
            entity.Property(x => x.DurationMin).HasColumnName("duration_min");
            entity.Property(x => x.ElevationGainM).HasColumnName("elevation_gain_m");
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.StartLatitude).HasColumnName("start_latitude").HasPrecision(10, 7);
            entity.Property(x => x.StartLongitude).HasColumnName("start_longitude").HasPrecision(10, 7);
            entity.Property(x => x.EndLatitude).HasColumnName("end_latitude").HasPrecision(10, 7);
            entity.Property(x => x.EndLongitude).HasColumnName("end_longitude").HasPrecision(10, 7);
            entity.Property(x => x.Geometry).HasColumnName("geometry");
            entity.Property(x => x.AvgRating).HasColumnName("avg_rating").HasPrecision(3, 2);
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(x => x.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<EventEntity>(entity =>
        {
            entity.ToTable("events");
            entity.HasKey(x => x.EventId);
            entity.Property(x => x.EventId).HasColumnName("event_id");
            entity.Property(x => x.DestinationId).HasColumnName("destination_id");
            entity.Property(x => x.ObjectId).HasColumnName("object_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Category).HasColumnName("category").HasMaxLength(80).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.StartAt).HasColumnName("start_at");
            entity.Property(x => x.EndAt).HasColumnName("end_at");
            entity.Property(x => x.TicketUrl).HasColumnName("ticket_url").HasMaxLength(255);
            entity.Property(x => x.Latitude).HasColumnName("latitude").HasPrecision(10, 7);
            entity.Property(x => x.Longitude).HasColumnName("longitude").HasPrecision(10, 7);
            entity.Property(x => x.AvgRating).HasColumnName("avg_rating").HasPrecision(3, 2);
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(x => x.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<ObjectEntity>(entity =>
        {
            entity.ToTable("objects");
            entity.HasKey(x => x.ObjectId);
            entity.Property(x => x.ObjectId).HasColumnName("object_id");
            entity.Property(x => x.DestinationId).HasColumnName("destination_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Category).HasColumnName("category").HasMaxLength(30).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.Address).HasColumnName("address").HasMaxLength(255);
            entity.Property(x => x.Latitude).HasColumnName("latitude").HasPrecision(10, 7);
            entity.Property(x => x.Longitude).HasColumnName("longitude").HasPrecision(10, 7);
            entity.Property(x => x.WorkingHours).HasColumnName("working_hours").HasMaxLength(120);
            entity.Property(x => x.AvgRating).HasColumnName("avg_rating").HasPrecision(3, 2);
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(x => x.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<AccommodationDetailEntity>(entity =>
        {
            entity.ToTable("accommodation_details");
            entity.HasKey(x => x.ObjectId);
            entity.Property(x => x.ObjectId).HasColumnName("object_id");
            entity.Property(x => x.AccommodationType).HasColumnName("accommodation_type").HasMaxLength(20).IsRequired();
            entity.Property(x => x.PricePerNight).HasColumnName("price_per_night").HasPrecision(10, 2);
            entity.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(x => x.GuestCapacity).HasColumnName("guest_capacity");
            entity.Property(x => x.RoomCount).HasColumnName("room_count");
            entity.Property(x => x.BedCount).HasColumnName("bed_count");
            entity.Property(x => x.BathroomCount).HasColumnName("bathroom_count");
            entity.Property(x => x.CheckInTime).HasColumnName("check_in_time");
            entity.Property(x => x.CheckOutTime).HasColumnName("check_out_time");
            entity.Property(x => x.BookingUrl).HasColumnName("booking_url").HasMaxLength(255);
            entity.Property(x => x.AirbnbUrl).HasColumnName("airbnb_url").HasMaxLength(255);
        });

        modelBuilder.Entity<AmenityEntity>(entity =>
        {
            entity.ToTable("amenities");
            entity.HasKey(x => x.AmenityId);
            entity.Property(x => x.AmenityId).HasColumnName("amenity_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(x => x.Category).HasColumnName("category").HasMaxLength(50);
        });

        modelBuilder.Entity<ObjectAmenityEntity>(entity =>
        {
            entity.ToTable("object_amenities");
            entity.HasKey(x => new { x.ObjectId, x.AmenityId });
            entity.Property(x => x.ObjectId).HasColumnName("object_id");
            entity.Property(x => x.AmenityId).HasColumnName("amenity_id");
        });
    }
}
