using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Models;

namespace TaskManager.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.ToTable("tasks");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedOnAdd();
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(120).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
            entity.Property(x => x.DueDateUtc).HasColumnName("due_date_utc");
        });

        modelBuilder.Entity<TaskItem>().HasData(
            new TaskItem
            {
                Id = 1,
                Title = "Napraviti backend",
                Description = "Podesiti API, EF Core i MySQL konekciju.",
                Status = TaskItemStatus.InProgress,
                CreatedAtUtc = new DateTime(2026, 3, 14, 8, 0, 0, DateTimeKind.Utc)
            },
            new TaskItem
            {
                Id = 2,
                Title = "Napraviti Angular frontend",
                Description = "Lista zadataka, forma i filter po statusu.",
                Status = TaskItemStatus.Todo,
                CreatedAtUtc = new DateTime(2026, 3, 14, 8, 5, 0, DateTimeKind.Utc)
            },
            new TaskItem
            {
                Id = 3,
                Title = "Povezati MCP server",
                Description = "Dodati alat koji vraća sažetak i statistiku zadataka.",
                Status = TaskItemStatus.Done,
                CreatedAtUtc = new DateTime(2026, 3, 14, 8, 10, 0, DateTimeKind.Utc)
            }
        );
    }
}
