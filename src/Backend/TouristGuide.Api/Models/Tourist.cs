using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("tourist")]
    public class Tourist
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("name")]
        [MaxLength(200)]
        public string? Name { get; set; }

        [Column("email")]
        [MaxLength(255)]
        public string? Email { get; set; }

        [Column("pending_email")]
        [MaxLength(255)]
        public string? PendingEmail { get; set; }

        /// <summary>NULL ako je guest korisnik bez naloga</summary>
        [Column("password_hash")]
        [MaxLength(255)]
        public string? PasswordHash { get; set; }

        [Required]
        [Column("language")]
        [MaxLength(5)]
        public string Language { get; set; } = "en";

        /// <summary>JSON: ["hiking", "culture", "food", ...]</summary>
        [Column("interests")]
        public string? Interests { get; set; }

        [Column("bio")]
        public string? Bio { get; set; }

        [Column("location")]
        [MaxLength(200)]
        public string? Location { get; set; }

        [Column("home_lat")]
        public decimal? HomeLat { get; set; }

        [Column("home_lng")]
        public decimal? HomeLng { get; set; }

        [Column("profile_image")]
        [MaxLength(500)]
        public string? ProfileImage { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        /// <summary>Da li je email potvrđen</summary>
        [Column("is_email_verified")]
        public bool IsEmailVerified { get; set; } = false;

        /// <summary>Token koji se šalje na email za verifikaciju (UUID)</summary>
        [Column("email_verification_token")]
        [MaxLength(100)]
        public string? EmailVerificationToken { get; set; }

        /// <summary>Vreme isteka verifikacionog tokena</summary>
        [Column("email_verification_token_expires_at")]
        public DateTime? EmailVerificationTokenExpiresAt { get; set; }

        [Column("pending_email_verification_token")]
        [MaxLength(100)]
        public string? PendingEmailVerificationToken { get; set; }

        [Column("pending_email_verification_token_expires_at")]
        public DateTime? PendingEmailVerificationTokenExpiresAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
        public ICollection<SavedPost> SavedPosts { get; set; } = new List<SavedPost>();
        public ICollection<PostView> Views { get; set; } = new List<PostView>();
        public ICollection<TouristFavorite> Favorites { get; set; } = new List<TouristFavorite>();
        public ICollection<ExternalClick> ExternalClicks { get; set; } = new List<ExternalClick>();
        public ICollection<DirectionRequest> DirectionRequests { get; set; } = new List<DirectionRequest>();
        public ICollection<ContentShare> Shares { get; set; } = new List<ContentShare>();
        public ICollection<VisitPlanner> Planners { get; set; } = new List<VisitPlanner>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<TouristNotificationPreference> NotificationPreferences { get; set; } = new List<TouristNotificationPreference>();
        public ICollection<MailingList> MailingListEntries { get; set; } = new List<MailingList>();
    }
}
