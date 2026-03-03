using SharePlate.Core.Constants.Auth;
using SharePlate.API.Services;
using System.ComponentModel.DataAnnotations;

namespace SharePlate.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth");




        // POST /api/auth/register
        group
        .WithName("Register")
        .WithSummary("Register a new account")
        .MapPost("/register", async (RegisterRequest req, IAuthService authService, CancellationToken ct) =>
        {
            var registrationResult = await authService.RegisterAsync(req.Name, req.Email, req.Password, ct);

            if (!registrationResult.Succeeded || registrationResult.UserId is null)
            {
                return Results.Conflict(new AuthErrorResponse(
                    registrationResult.ErrorCode ?? AuthErrorCodes.InvalidCredentials,
                    registrationResult.ErrorMessage ?? "Unable to register user."));
            }

            return Results.Created($"/api/users/{registrationResult.UserId}", new RegisterResponse(registrationResult.UserId.Value, req.Name, req.Email));
        });





        // POST /api/auth/login
        group
        .WithName("Login")
        .WithSummary("Authenticate user and issue tokens")
        .MapPost("/login", async (LoginRequest req, IAuthService authService, ITokenService tokenService, CancellationToken ct) =>
        {
            var validationResult = await authService.ValidateCredentialsAsync(req.Email, req.Password, ct);

            if (!validationResult.Succeeded)
            {
                if (validationResult.ErrorCode == AuthErrorCodes.PasswordResetRequired)
                {
                    return Results.BadRequest(new AuthErrorResponse(
                        AuthErrorCodes.PasswordResetRequired,
                        validationResult.ErrorMessage ?? "Password reset is required for this account."));
                }

                return Results.Unauthorized();
            }

            var tokenResult = await tokenService.IssueTokensAsync(validationResult.User!, ct);
            if (!tokenResult.Succeeded)
            {
                return Results.BadRequest(new AuthErrorResponse(
                    tokenResult.ErrorCode ?? AuthErrorCodes.InvalidCredentials,
                    tokenResult.ErrorMessage ?? "Could not issue tokens."));
            }

            return Results.Ok(new TokenResponse(
                tokenResult.AccessToken!,
                tokenResult.RefreshToken!,
                tokenResult.AccessTokenExpiresAtUtc!.Value));
        });


        // POST /api/auth/refresh
        group.MapPost("/refresh", async (RefreshTokenRequest req, ITokenService tokenService, CancellationToken ct) =>
        {
            var tokenResult = await tokenService.RefreshTokensAsync(req.RefreshToken, ct);
            if (!tokenResult.Succeeded)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(new TokenResponse(
                tokenResult.AccessToken!,
                tokenResult.RefreshToken!,
                tokenResult.AccessTokenExpiresAtUtc!.Value));
        })
        .WithName("RefreshTokens")
        .WithSummary("Rotate refresh token and issue a new access token");

        // POST /api/auth/logout
        group.MapPost("/logout", async (LogoutRequest req, ITokenService tokenService, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.RefreshToken))
                return Results.NoContent();

            await tokenService.RevokeRefreshTokenAsync(req.RefreshToken, ct);
            return Results.NoContent();
        })
        .WithName("Logout")
        .WithSummary("Revoke refresh token(s) and log out");

        // POST /api/auth/reset-password/initiate
        group.MapPost("/reset-password/initiate", async (ResetPasswordInitiateRequest req, IAuthService authService, CancellationToken ct) =>
        {
            var resetResult = await authService.InitiatePasswordResetAsync(req.Email, ct);
            if (!resetResult.Succeeded)
            {
                return Results.BadRequest(new AuthErrorResponse(
                    resetResult.ErrorCode ?? AuthErrorCodes.InvalidCredentials,
                    resetResult.ErrorMessage ?? "Unable to initiate password reset."));
            }

            if (string.IsNullOrWhiteSpace(resetResult.ResetToken) || resetResult.ExpiresAtUtc is null)
            {
                return Results.NoContent();
            }

            return Results.Ok(new ResetPasswordInitiateResponse(resetResult.ResetToken, resetResult.ExpiresAtUtc.Value));
        })
        .WithName("InitiatePasswordReset")
        .WithSummary("Initiate password reset flow");

        // POST /api/auth/reset-password/complete
        group.MapPost("/reset-password/complete", async (ResetPasswordCompleteRequest req, IAuthService authService, CancellationToken ct) =>
        {
            var completionResult = await authService.CompletePasswordResetAsync(req.ResetToken, req.NewPassword, ct);
            if (!completionResult.Succeeded)
            {
                return Results.BadRequest(new AuthErrorResponse(
                    completionResult.ErrorCode ?? AuthErrorCodes.InvalidPasswordResetToken,
                    completionResult.ErrorMessage ?? "Could not reset password."));
            }

            return Results.NoContent();
        })
        .WithName("CompletePasswordReset")
        .WithSummary("Complete password reset with reset token");
    }
}

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