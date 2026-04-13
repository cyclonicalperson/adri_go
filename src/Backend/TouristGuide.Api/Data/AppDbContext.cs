using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // ── DbSet-ovi ────────────────────────────────────────────────────────

        // Organizacije i korisnici
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<AdminUser> AdminUsers { get; set; }
        public DbSet<AdminPermission> AdminPermissions { get; set; }
        public DbSet<AdminUserPermission> AdminUserPermissions { get; set; }
        public DbSet<AdminRegistrationRequest> AdminRegistrationRequests { get; set; }
        public DbSet<VerificationDocument> VerificationDocuments { get; set; }
        public DbSet<TermsAcceptance> TermsAcceptances { get; set; }
        public DbSet<AdminNotification> AdminNotifications { get; set; }
        public DbSet<AdminAuditLog> AdminAuditLogs { get; set; }

        // Sadržaj
        public DbSet<Region> Regions { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<PostTranslation> PostTranslations { get; set; }
        public DbSet<Tag> Tags { get; set; }
        public DbSet<PostTag> PostTags { get; set; }
        public DbSet<Route> Routes { get; set; }

        // Turisti
        public DbSet<Tourist> Tourists { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<PostLike> PostLikes { get; set; }
        public DbSet<SavedPost> SavedPosts { get; set; }
        public DbSet<PostView> PostViews { get; set; }
        public DbSet<ExternalClick> ExternalClicks { get; set; }
        public DbSet<DirectionRequest> DirectionRequests { get; set; }
        public DbSet<ContentShare> ContentShares { get; set; }
        public DbSet<TouristFavorite> TouristFavorites { get; set; }

        // Planer i karte
        public DbSet<VisitPlanner> VisitPlanners { get; set; }
        public DbSet<PlannerItem> PlannerItems { get; set; }
        public DbSet<Ticket> Tickets { get; set; }

        // Komunikacija
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<MailingList> MailingList { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ════════════════════════════════════════════════════════════════
            //  UNIQUE INDEX-i
            // ════════════════════════════════════════════════════════════════

            // AdminUser — jedinstven email
            modelBuilder.Entity<AdminUser>()
                .HasIndex(x => x.Email)
                .IsUnique();

            // AdminUserPermission — kompozitni unique (user_id, permission_id)
            modelBuilder.Entity<AdminUserPermission>()
                .HasIndex(x => new { x.AdminUserId, x.PermissionId })
                .IsUnique();

            // Tourist — jedinstven email
            modelBuilder.Entity<Tourist>()
                .HasIndex(x => x.Email)
                .IsUnique();

            // PostLike — unique (tourist_id, post_id)
            modelBuilder.Entity<PostLike>()
                .HasIndex(x => new { x.TouristId, x.PostId })
                .IsUnique();

            // SavedPost (post_save) — unique (tourist_id, post_id)
            modelBuilder.Entity<SavedPost>()
                .HasIndex(x => new { x.TouristId, x.PostId })
                .IsUnique();

            // PostTranslation — unique (post_id, lang_code)
            modelBuilder.Entity<PostTranslation>()
                .HasIndex(x => new { x.PostId, x.LangCode })
                .IsUnique();

            // Tag — jedinstven naziv
            modelBuilder.Entity<Tag>()
                .HasIndex(x => x.Name)
                .IsUnique();

            // Ticket — jedinstven ticket_code
            modelBuilder.Entity<Ticket>()
                .HasIndex(x => x.TicketCode)
                .IsUnique();

            // ════════════════════════════════════════════════════════════════
            //  PostTag — kompozitni PK (bez surrogate ključa)
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<PostTag>()
                .HasKey(x => new { x.PostId, x.TagId });

            modelBuilder.Entity<PostTag>()
                .HasOne(x => x.Post)
                .WithMany(p => p.PostTags)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PostTag>()
                .HasOne(x => x.Tag)
                .WithMany(t => t.PostTags)
                .HasForeignKey(x => x.TagId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  AdminUser relacije
            // ════════════════════════════════════════════════════════════════

            // AdminUser -> Organization (nullable, ON DELETE SET NULL)
            modelBuilder.Entity<AdminUser>()
                .HasOne(a => a.Organization)
                .WithMany(o => o.AdminUsers)
                .HasForeignKey(a => a.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  AdminUserPermission relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<AdminUserPermission>()
                .HasOne(x => x.AdminUser)
                .WithMany(u => u.UserPermissions)
                .HasForeignKey(x => x.AdminUserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AdminUserPermission>()
                .HasOne(x => x.Permission)
                .WithMany(p => p.UserPermissions)
                .HasForeignKey(x => x.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // AdminUserPermission -> Region (nullable scope, ON DELETE SET NULL)
            modelBuilder.Entity<AdminUserPermission>()
                .HasOne(x => x.Region)
                .WithMany(r => r.ScopedPermissions)
                .HasForeignKey(x => x.RegionId)
                .OnDelete(DeleteBehavior.SetNull);

            // AdminUserPermission -> AdminUser (granted_by) — bez kaskadnog brisanja
            modelBuilder.Entity<AdminUserPermission>()
                .HasOne(x => x.GrantedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.GrantedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // ════════════════════════════════════════════════════════════════
            //  AdminRegistrationRequest relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<AdminRegistrationRequest>()
                .HasOne(r => r.ReviewedByAdmin)
                .WithMany()
                .HasForeignKey(r => r.ReviewedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // VerificationDocument -> AdminRegistrationRequest (ON DELETE CASCADE)
            modelBuilder.Entity<VerificationDocument>()
                .HasOne(v => v.RegistrationRequest)
                .WithMany(r => r.VerificationDocuments)
                .HasForeignKey(v => v.RegistrationRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            // TermsAcceptance -> AdminUser (nullable, ON DELETE SET NULL)
            modelBuilder.Entity<TermsAcceptance>()
                .HasOne(t => t.AdminUser)
                .WithMany()
                .HasForeignKey(t => t.AdminUserId)
                .OnDelete(DeleteBehavior.SetNull);

            // TermsAcceptance -> AdminRegistrationRequest (nullable, ON DELETE SET NULL)
            modelBuilder.Entity<TermsAcceptance>()
                .HasOne(t => t.RegistrationRequest)
                .WithMany(r => r.TermsAcceptances)
                .HasForeignKey(t => t.RegistrationRequestId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  AdminNotification relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<AdminNotification>()
                .HasOne(n => n.AdminUser)
                .WithMany(a => a.Notifications)
                .HasForeignKey(n => n.AdminUserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  AdminAuditLog relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<AdminAuditLog>()
                .HasOne(l => l.AdminUser)
                .WithMany()
                .HasForeignKey(l => l.AdminUserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<AdminAuditLog>()
                .HasOne(l => l.PerformedByAdmin)
                .WithMany()
                .HasForeignKey(l => l.PerformedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  Post relacije
            // ════════════════════════════════════════════════════════════════

            // Post -> AdminUser (bez kaskadnog brisanja — admin ne smije biti obrisan dok ima objave)
            modelBuilder.Entity<Post>()
                .HasOne(p => p.Admin)
                .WithMany(a => a.Posts)
                .HasForeignKey(p => p.AdminId)
                .OnDelete(DeleteBehavior.Restrict);

            // Post -> Region (nullable, ON DELETE SET NULL)
            modelBuilder.Entity<Post>()
                .HasOne(p => p.Region)
                .WithMany(r => r.Posts)
                .HasForeignKey(p => p.RegionId)
                .OnDelete(DeleteBehavior.SetNull);

            // PostTranslation -> Post (ON DELETE CASCADE)
            modelBuilder.Entity<PostTranslation>()
                .HasOne(t => t.Post)
                .WithMany(p => p.Translations)
                .HasForeignKey(t => t.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  Route relacije
            // ════════════════════════════════════════════════════════════════

            // Route -> AdminUser (Restrict — admin ne smije biti obrisan dok ima rute)
            modelBuilder.Entity<Route>()
                .HasOne(r => r.Admin)
                .WithMany(a => a.Routes)
                .HasForeignKey(r => r.AdminId)
                .OnDelete(DeleteBehavior.Restrict);

            // Route -> Region (nullable, ON DELETE SET NULL)
            modelBuilder.Entity<Route>()
                .HasOne(r => r.Region)
                .WithMany(reg => reg.Routes)
                .HasForeignKey(r => r.RegionId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  Review relacije
            // ════════════════════════════════════════════════════════════════

            // Review -> Tourist (nullable, ON DELETE SET NULL)
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Tourist)
                .WithMany(t => t.Reviews)
                .HasForeignKey(r => r.TouristId)
                .OnDelete(DeleteBehavior.SetNull);

            // Review -> Post (nullable, ON DELETE CASCADE)
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Post)
                .WithMany(p => p.Reviews)
                .HasForeignKey(r => r.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            // Review -> Route (nullable, ON DELETE CASCADE)
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Route)
                .WithMany(ro => ro.Reviews)
                .HasForeignKey(r => r.RouteId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  PostLike relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<PostLike>()
                .HasOne(x => x.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PostLike>()
                .HasOne(x => x.Tourist)
                .WithMany(t => t.Likes)
                .HasForeignKey(x => x.TouristId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  SavedPost (post_save) relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<SavedPost>()
                .HasOne(x => x.Post)
                .WithMany(p => p.SavedPosts)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SavedPost>()
                .HasOne(x => x.Tourist)
                .WithMany(t => t.SavedPosts)
                .HasForeignKey(x => x.TouristId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  PostView relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<PostView>()
                .HasOne(x => x.Post)
                .WithMany(p => p.Views)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            // PostView -> Tourist (nullable — anonimni korisnici, ON DELETE SET NULL)
            modelBuilder.Entity<PostView>()
                .HasOne(x => x.Tourist)
                .WithMany(t => t.Views)
                .HasForeignKey(x => x.TouristId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  ExternalClick relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<ExternalClick>()
                .HasOne(x => x.Post)
                .WithMany(p => p.ExternalClicks)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ExternalClick>()
                .HasOne(x => x.Tourist)
                .WithMany(t => t.ExternalClicks)
                .HasForeignKey(x => x.TouristId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  DirectionRequest relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<DirectionRequest>()
                .HasOne(x => x.Post)
                .WithMany(p => p.DirectionRequests)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DirectionRequest>()
                .HasOne(x => x.Tourist)
                .WithMany(t => t.DirectionRequests)
                .HasForeignKey(x => x.TouristId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  ContentShare relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<ContentShare>()
                .HasOne(x => x.Tourist)
                .WithMany(t => t.Shares)
                .HasForeignKey(x => x.TouristId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ContentShare>()
                .HasOne(x => x.Post)
                .WithMany(p => p.Shares)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ContentShare>()
                .HasOne(x => x.Route)
                .WithMany(r => r.Shares)
                .HasForeignKey(x => x.RouteId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  TouristFavorite relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<TouristFavorite>()
                .HasOne(x => x.Tourist)
                .WithMany(t => t.Favorites)
                .HasForeignKey(x => x.TouristId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TouristFavorite>()
                .HasOne(x => x.Post)
                .WithMany(p => p.Favorites)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TouristFavorite>()
                .HasOne(x => x.Route)
                .WithMany(r => r.Favorites)
                .HasForeignKey(x => x.RouteId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  VisitPlanner i PlannerItem relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<VisitPlanner>()
                .HasOne(v => v.Tourist)
                .WithMany(t => t.Planners)
                .HasForeignKey(v => v.TouristId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PlannerItem>()
                .HasOne(i => i.Planner)
                .WithMany(v => v.Items)
                .HasForeignKey(i => i.PlannerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PlannerItem>()
                .HasOne(i => i.Post)
                .WithMany(p => p.PlannerItems)
                .HasForeignKey(i => i.PostId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<PlannerItem>()
                .HasOne(i => i.Route)
                .WithMany(r => r.PlannerItems)
                .HasForeignKey(i => i.RouteId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  Ticket relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Post)
                .WithMany(p => p.Tickets)
                .HasForeignKey(t => t.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Tourist)
                .WithMany(tu => tu.Tickets)
                .HasForeignKey(t => t.TouristId)
                .OnDelete(DeleteBehavior.SetNull);

            // ════════════════════════════════════════════════════════════════
            //  Notification relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Tourist)
                .WithMany(t => t.Notifications)
                .HasForeignKey(n => n.TouristId)
                .OnDelete(DeleteBehavior.Cascade);

            // ════════════════════════════════════════════════════════════════
            //  MailingList relacije
            // ════════════════════════════════════════════════════════════════

            modelBuilder.Entity<MailingList>()
                .HasOne(m => m.Tourist)
                .WithMany(t => t.MailingListEntries)
                .HasForeignKey(m => m.TouristId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
