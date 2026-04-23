using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace TouristGuide.Api.DTOs
{
    public class AdminRegistrationSubmitRequestDto
    {
        [Required]
        [FromForm(Name = "fullName")]
        [MaxLength(200)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [FromForm(Name = "email")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [FromForm(Name = "password")]
        [MinLength(8)]
        public string Password { get; set; } = string.Empty;

        [FromForm(Name = "orgName")]
        [MaxLength(200)]
        public string? OrganizationName { get; set; }

        [Required]
        [FromForm(Name = "document")]
        public IFormFile Document { get; set; } = null!;
    }

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

    public class AdminRegistrationListItemDto
    {
        public uint Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsOrganization { get; set; }
        public bool IsIndividual { get; set; }
        public string? OrganizationName { get; set; }
        public string? OrganizationEmail { get; set; }
        public DateTime? EmailVerifiedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public uint? ReviewedBy { get; set; }
        public string? DocumentUrl { get; set; }
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
