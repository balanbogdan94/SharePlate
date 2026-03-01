using SharePlate.Core.Constants.Auth;
using SharePlate.API.Services;

namespace SharePlate.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        // POST /api/auth/register
        group.MapPost("/register", async (RegisterRequest req, IAuthService authService, CancellationToken ct) =>
        {
            var registrationResult = await authService.RegisterAsync(req.Name, req.Email, req.Password, ct);

            if (!registrationResult.Succeeded)
            {
                return Results.Conflict(new AuthErrorResponse(
                    registrationResult.ErrorCode ?? AuthErrorCodes.InvalidCredentials,
                    registrationResult.ErrorMessage ?? "Unable to register user."));
            }

            var user = registrationResult.User!;
            return Results.Created($"/api/users/{user.Id}", new RegisterResponse(user.Id, user.Name, user.Email));
        })
        .WithName("Register")
        .WithSummary("Register a new account");

        // POST /api/auth/login
        group.MapPost("/login", async (LoginRequest req, IAuthService authService, ITokenService tokenService, CancellationToken ct) =>
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
        })
        .WithName("Login")
        .WithSummary("Authenticate user and issue tokens");

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

public record RegisterRequest(string Name, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);
public record ResetPasswordInitiateRequest(string Email);
public record ResetPasswordCompleteRequest(string ResetToken, string NewPassword);
public record ResetPasswordInitiateResponse(string ResetToken, DateTime ExpiresAtUtc);
public record RegisterResponse(Guid Id, string Name, string Email);
public record AuthErrorResponse(string Code, string Message);
public record TokenResponse(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc);