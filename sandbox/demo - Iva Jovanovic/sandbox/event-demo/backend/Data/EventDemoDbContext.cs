using EventDemo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EventDemo.Api.Data;

public class EventDemoDbContext(DbContextOptions<EventDemoDbContext> options) : DbContext(options)
{
    public DbSet<Admin> Admins => Set<Admin>();

    public DbSet<Event> Events => Set<Event>();

    public DbSet<Registration> Registrations => Set<Registration>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Admin>(entity =>
        {
            entity.ToTable("admins");

            entity.HasKey(admin => admin.Id);

            entity.Property(admin => admin.Id)
                .HasColumnName("id");

            entity.Property(admin => admin.Username)
                .HasColumnName("username")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(admin => admin.Password)
                .HasColumnName("password")
                .HasMaxLength(255)
                .IsRequired();

            entity.HasIndex(admin => admin.Username)
                .IsUnique();
        });

        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("events");

            entity.HasKey(eventEntity => eventEntity.Id);

            entity.Property(eventEntity => eventEntity.Id)
                .HasColumnName("id");

            entity.Property(eventEntity => eventEntity.Title)
                .HasColumnName("title")
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(eventEntity => eventEntity.Description)
                .HasColumnName("description")
                .IsRequired();

            entity.Property(eventEntity => eventEntity.EventDate)
                .HasColumnName("event_date")
                .HasColumnType("date")
                .IsRequired();

            entity.Property(eventEntity => eventEntity.EventTime)
                .HasColumnName("event_time")
                .HasColumnType("time")
                .IsRequired();

            entity.Property(eventEntity => eventEntity.Location)
                .HasColumnName("location")
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(eventEntity => eventEntity.MaxParticipants)
                .HasColumnName("max_participants")
                .IsRequired();

            entity.Property(eventEntity => eventEntity.IsRegistrationOpen)
                .HasColumnName("is_registration_open")
                .IsRequired();

            entity.Property(eventEntity => eventEntity.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("datetime")
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .IsRequired();

            entity.HasMany(eventEntity => eventEntity.Registrations)
                .WithOne(registration => registration.Event)
                .HasForeignKey(registration => registration.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Registration>(entity =>
        {
            entity.ToTable("registrations");

            entity.HasKey(registration => registration.Id);

            entity.Property(registration => registration.Id)
                .HasColumnName("id");

            entity.Property(registration => registration.EventId)
                .HasColumnName("event_id")
                .IsRequired();

            entity.Property(registration => registration.FullName)
                .HasColumnName("full_name")
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(registration => registration.Email)
                .HasColumnName("email")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(registration => registration.RegistrationDate)
                .HasColumnName("registration_date")
                .HasColumnType("datetime")
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .IsRequired();

            entity.HasIndex(registration => new { registration.EventId, registration.Email })
                .IsUnique();
        });
    }
}
