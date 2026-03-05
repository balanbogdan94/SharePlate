using System.ComponentModel.DataAnnotations;

namespace SharePlate.API.Contracts.Auth;

public record RegisterRequest(
    [property: Required, StringLength(100, MinimumLength = 2)]
    string Name,

    [property: Required, EmailAddress, StringLength(256)]
    string Email,

    [property: Required]
    [property: StringLength(128, MinimumLength = 8)]
    [property: RegularExpression(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,128}$",
        ErrorMessage = "Password must contain upper, lower, digit, and special character."
    )]
    string Password
);

public record LoginRequest(
    [property: Required, EmailAddress]
    string Email,

    [property: Required]
    string Password
);

public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);
public record ResetPasswordInitiateRequest(string Email);
public record ResetPasswordCompleteRequest(string ResetToken, string NewPassword);
public record ResetPasswordInitiateResponse(string ResetToken, DateTime ExpiresAtUtc);
public record RegisterResponse(Guid Id, string Name, string Email);
public record AuthErrorResponse(string Code, string Message);
public record TokenResponse(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc);
