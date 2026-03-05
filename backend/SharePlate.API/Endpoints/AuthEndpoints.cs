using SharePlate.API.Contracts.Auth;
using SharePlate.API.Contracts.Users;
using SharePlate.Core.Constants.Auth;
using SharePlate.Core.Services.Auth;

namespace SharePlate.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth");




        // POST /api/auth/register
        group
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
        })
        .WithName("Register")
        .WithSummary("Register a new account");





        // POST /api/auth/login
        group
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