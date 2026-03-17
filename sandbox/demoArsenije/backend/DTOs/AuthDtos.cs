namespace LoginApp.Api.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(
    string Token,
    string Username,
    string FullName,
    string Email,
    string Role,
    DateTime ExpiresAt
);

public record RegisterRequest(
    string Username,
    string Email,
    string Password,
    string FullName
);

public record UserDto(
    int Id,
    string Username,
    string Email,
    string FullName,
    string Role,
    DateTime CreatedAt,
    bool IsActive
);
