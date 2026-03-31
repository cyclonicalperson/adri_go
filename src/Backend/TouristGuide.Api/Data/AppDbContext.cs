using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Organization> Organizations { get; set; }
        public DbSet<AdminUser> AdminUsers { get; set; }
        public DbSet<AdminPermission> AdminPermissions { get; set; }
        public DbSet<AdminUserPermission> AdminUserPermissions { get; set; }
        public DbSet<AdminRegistrationRequest> AdminRegistrationRequests { get; set; }
        public DbSet<Region> Regions { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<Tourist> Tourists { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // AdminUserPermission — kompozitni unique key
            modelBuilder.Entity<AdminUserPermission>()
                .HasIndex(x => new { x.AdminUserId, x.PermissionId })
                .IsUnique();

            // AdminUser -> Organization (nullable FK)
            modelBuilder.Entity<AdminUser>()
                .HasOne(a => a.Organization)
                .WithMany(o => o.AdminUsers)
                .HasForeignKey(a => a.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);

            // AdminUserPermission -> AdminUser
            modelBuilder.Entity<AdminUserPermission>()
                .HasOne(x => x.AdminUser)
                .WithMany(u => u.UserPermissions)
                .HasForeignKey(x => x.AdminUserId)
                .OnDelete(DeleteBehavior.Cascade);

            // AdminUserPermission -> AdminPermission
            modelBuilder.Entity<AdminUserPermission>()
                .HasOne(x => x.Permission)
                .WithMany(p => p.UserPermissions)
                .HasForeignKey(x => x.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // AdminRegistrationRequest -> AdminUser (reviewed_by)
            modelBuilder.Entity<AdminRegistrationRequest>()
                .HasOne(r => r.ReviewedByAdmin)
                .WithMany()
                .HasForeignKey(r => r.ReviewedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // Post -> AdminUser
            modelBuilder.Entity<Post>()
                .HasOne(p => p.Admin)
                .WithMany(a => a.Posts)
                .HasForeignKey(p => p.AdminId)
                .OnDelete(DeleteBehavior.Restrict);

            // Post -> Region (nullable)
            modelBuilder.Entity<Post>()
                .HasOne(p => p.Region)
                .WithMany(r => r.Posts)
                .HasForeignKey(p => p.RegionId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}