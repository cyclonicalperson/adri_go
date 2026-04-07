using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO za prikaz pending admin registration request-ova.
    /// </summary>
    public class PendingAdminRegistrationDto
    {
        public uint Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsOrganization { get; set; }
        public string? OrganizationName { get; set; }
        public string? OrganizationEmail { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
    }

    /// <summary>
    /// DTO koji superadmin šalje pri approve/reject akciji.
    /// </summary>
    public class AdminRegistrationDecisionDto
    {
        public uint? ReviewedBy { get; set; }
        public string? RejectionReason { get; set; }
    }

    /// <summary>
    /// DTO koji backend vraća nakon obrade registration request-a.
    /// </summary>
    public class AdminRegistrationActionResponseDto
    {
        public uint RequestId { get; set; }
        public string Status { get; set; } = string.Empty;
        public uint? AdminUserId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
