namespace EventDemo.Api.DTOs.Auth;

public class AdminLoginResponseDto
{
    public string Username { get; set; } = string.Empty;

    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }
}
