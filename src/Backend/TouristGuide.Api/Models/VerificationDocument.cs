using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("verification_document")]
    public class VerificationDocument
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("registration_request_id")]
        public uint RegistrationRequestId { get; set; }

        [Required]
        [Column("file_path")]
        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;

        [Required]
        [Column("file_name")]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        /// <summary>pdf | jpg | png</summary>
        [Required]
        [Column("file_type")]
        public string FileType { get; set; } = string.Empty;

        [Column("file_size_kb")]
        public uint FileSizeKb { get; set; }

        [Column("uploaded_at")]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public AdminRegistrationRequest RegistrationRequest { get; set; } = null!;
    }
}
