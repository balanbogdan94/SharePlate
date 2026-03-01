using SharePlate.Core.Constants.Auth;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SharePlate.API.Configuration;

namespace SharePlate.API.Services;

public class AuthService : IAuthService
{
    private const string PasswordResetTokenPurpose = "password_reset";
    private static readonly TimeSpan PasswordResetTokenLifetime = TimeSpan.FromMinutes(30);

    private readonly IUnitOfWork _uow;
    private readonly IPasswordHashingService _passwordHashingService;
    private readonly JwtOptions _jwtOptions;

    public AuthService(IUnitOfWork uow, IPasswordHashingService passwordHashingService, IOptions<JwtOptions> jwtOptions)
    {
        _uow = uow;
        _passwordHashingService = passwordHashingService;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<RegisterUserResult> RegisterAsync(string name, string email, string password, CancellationToken ct = default)
    {
        if (await _uow.Users.EmailExistsAsync(email, ct))
        {
            return new RegisterUserResult(
                false,
                null,
                AuthErrorCodes.InvalidCredentials,
                $"Email '{email}' is already in use.");
        }

        var passwordHash = _passwordHashingService.HashPassword(email, password);
        var user = User.Create(name, email, passwordHash.Hash, passwordHash.Algorithm);

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return new RegisterUserResult(true, user);
    }

    public async Task<ValidateCredentialsResult> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await _uow.Users.GetForAuthenticationByEmailAsync(email, ct);
        if (user is null)
        {
            return new ValidateCredentialsResult(false, null, AuthErrorCodes.InvalidCredentials, "Invalid email or password.");
        }

        if (user.IsPasswordResetRequired)
        {
            return new ValidateCredentialsResult(
                false,
                null,
                AuthErrorCodes.PasswordResetRequired,
                "Password reset is required for this account.");
        }

        var verificationOutcome = _passwordHashingService.VerifyPassword(
            user.Email,
            user.PasswordHash,
            user.PasswordHashAlgorithm,
            password);

        if (verificationOutcome.Status == PasswordVerificationStatus.ResetRequired)
        {
            return new ValidateCredentialsResult(
                false,
                null,
                AuthErrorCodes.PasswordResetRequired,
                "Password reset is required for this account.");
        }

        if (verificationOutcome.Status == PasswordVerificationStatus.Invalid)
        {
            return new ValidateCredentialsResult(false, null, AuthErrorCodes.InvalidCredentials, "Invalid email or password.");
        }

        if (verificationOutcome.RequiresRehash && verificationOutcome.RehashResult is not null)
        {
            user.SetPassword(
                verificationOutcome.RehashResult.Hash,
                verificationOutcome.RehashResult.Algorithm,
                false);
            await _uow.SaveChangesAsync(ct);
        }

        return new ValidateCredentialsResult(true, user);
    }

    public async Task<InitiatePasswordResetResult> InitiatePasswordResetAsync(string email, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return new InitiatePasswordResetResult(
                false,
                ErrorCode: AuthErrorCodes.InvalidCredentials,
                ErrorMessage: "Email is required.");
        }

        var user = await _uow.Users.GetForAuthenticationByEmailAsync(email, ct);
        if (user is null)
        {
            return new InitiatePasswordResetResult(true);
        }

        user.RequirePasswordReset();

        var expiresAtUtc = DateTime.UtcNow.Add(PasswordResetTokenLifetime);
        var resetToken = GeneratePasswordResetToken(user.Id, expiresAtUtc);

        await _uow.SaveChangesAsync(ct);

        return new InitiatePasswordResetResult(true, resetToken, expiresAtUtc);
    }

    public async Task<CompletePasswordResetResult> CompletePasswordResetAsync(string resetToken, string newPassword, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(resetToken) || string.IsNullOrWhiteSpace(newPassword))
        {
            return new CompletePasswordResetResult(
                false,
                AuthErrorCodes.InvalidPasswordResetToken,
                "Reset token and new password are required.");
        }

        var tokenPrincipal = ValidatePasswordResetToken(resetToken);
        if (tokenPrincipal is null)
        {
            return new CompletePasswordResetResult(
                false,
                AuthErrorCodes.InvalidPasswordResetToken,
                "Invalid or expired password reset token.");
        }

        var userIdClaim = tokenPrincipal.FindFirstValue(AuthClaimTypes.UserId)
            ?? tokenPrincipal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? tokenPrincipal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? tokenPrincipal.FindFirstValue("sub");
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return new CompletePasswordResetResult(
                false,
                AuthErrorCodes.InvalidPasswordResetToken,
                "Invalid password reset token.");
        }

        var user = await _uow.Users.GetByIdAsync(userId, ct);
        if (user is null || !user.IsPasswordResetRequired)
        {
            return new CompletePasswordResetResult(
                false,
                AuthErrorCodes.InvalidPasswordResetToken,
                "Invalid or expired password reset token.");
        }

        var passwordHash = _passwordHashingService.HashPassword(user.Email, newPassword);
        user.SetPassword(passwordHash.Hash, passwordHash.Algorithm, false);

        await _uow.RefreshTokens.RevokeAllByUserIdAsync(user.Id, ct);
        await _uow.SaveChangesAsync(ct);

        return new CompletePasswordResetResult(true);
    }

    private string GeneratePasswordResetToken(Guid userId, DateTime expiresAtUtc)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("purpose", PasswordResetTokenPurpose)
        };

        var jwt = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private ClaimsPrincipal? ValidatePasswordResetToken(string resetToken)
    {
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = _jwtOptions.Issuer,
            ValidAudience = _jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            tokenHandler.MapInboundClaims = false;
            var principal = tokenHandler.ValidateToken(resetToken, validationParameters, out _);
            var purpose = principal.FindFirstValue("purpose");

            return purpose == PasswordResetTokenPurpose ? principal : null;
        }
        catch
        {
            return null;
        }
    }
}