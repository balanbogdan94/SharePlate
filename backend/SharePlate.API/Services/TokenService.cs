using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using SharePlate.API.Configuration;
using SharePlate.Core.Constants.Auth;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Services;

public class TokenService : ITokenService
{
    private readonly JwtOptions _jwtOptions;
    private readonly IUnitOfWork _uow;

    public TokenService(IOptions<JwtOptions> jwtOptions, IUnitOfWork uow)
    {
        _jwtOptions = jwtOptions.Value;
        _uow = uow;
    }

    public async Task<TokenPairResult> IssueTokensAsync(User user, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var accessTokenExpiresAt = now.AddMinutes(_jwtOptions.AccessTokenExpirationMinutes);
        var accessToken = GenerateAccessToken(user, accessTokenExpiresAt);

        var refreshToken = GenerateRefreshToken();
        var refreshTokenHash = HashToken(refreshToken);
        var refreshTokenExpiresAt = now.AddDays(_jwtOptions.RefreshTokenExpirationDays);

        await _uow.RefreshTokens.CreateAsync(user.Id, refreshTokenHash, refreshTokenExpiresAt, ct);
        await _uow.SaveChangesAsync(ct);

        return new TokenPairResult(true, accessToken, refreshToken, accessTokenExpiresAt);
    }

    public async Task<TokenPairResult> RefreshTokensAsync(string refreshToken, CancellationToken ct = default)
    {
        var refreshTokenHash = HashToken(refreshToken);
        var storedToken = await _uow.RefreshTokens.GetByTokenHashAsync(refreshTokenHash, ct);

        if (storedToken is null)
        {
            return new TokenPairResult(false, ErrorCode: AuthErrorCodes.InvalidRefreshToken, ErrorMessage: "Invalid refresh token.");
        }

        if (storedToken.IsRevoked)
        {
            return new TokenPairResult(false, ErrorCode: AuthErrorCodes.RefreshTokenRevoked, ErrorMessage: "Refresh token is revoked.");
        }

        if (storedToken.ExpiresAt <= DateTime.UtcNow)
        {
            return new TokenPairResult(false, ErrorCode: AuthErrorCodes.InvalidRefreshToken, ErrorMessage: "Refresh token is expired.");
        }

        var user = await _uow.Users.GetByIdAsync(storedToken.UserId, ct);
        if (user is null)
        {
            return new TokenPairResult(false, ErrorCode: AuthErrorCodes.InvalidRefreshToken, ErrorMessage: "Invalid refresh token user.");
        }

        var now = DateTime.UtcNow;
        var accessTokenExpiresAt = now.AddMinutes(_jwtOptions.AccessTokenExpirationMinutes);
        var accessToken = GenerateAccessToken(user, accessTokenExpiresAt);

        var nextRefreshToken = GenerateRefreshToken();
        var nextRefreshTokenHash = HashToken(nextRefreshToken);
        var nextRefreshTokenExpiresAt = now.AddDays(_jwtOptions.RefreshTokenExpirationDays);

        var rotated = await _uow.RefreshTokens.RotateAsync(refreshTokenHash, nextRefreshTokenHash, nextRefreshTokenExpiresAt, ct);
        if (rotated is null)
        {
            return new TokenPairResult(false, ErrorCode: AuthErrorCodes.InvalidRefreshToken, ErrorMessage: "Invalid refresh token.");
        }

        await _uow.SaveChangesAsync(ct);

        return new TokenPairResult(true, accessToken, nextRefreshToken, accessTokenExpiresAt);
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var refreshTokenHash = HashToken(refreshToken);
        var revoked = await _uow.RefreshTokens.RevokeAsync(refreshTokenHash, ct);

        if (!revoked)
        {
            return false;
        }

        await _uow.SaveChangesAsync(ct);
        return true;
    }

    private string GenerateAccessToken(User user, DateTime expiresAtUtc)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(AuthClaimTypes.UserId, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, user.Name)
        };

        var jwt = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}