namespace EventDemo.Api.DTOs.Registrations;

public class RegistrationItemDto
{
    public int Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string RegistrationDate { get; set; } = string.Empty;
}
