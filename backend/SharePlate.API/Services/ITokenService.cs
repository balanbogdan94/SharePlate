using SharePlate.Core.Entities;

namespace SharePlate.API.Services;

public interface ITokenService
{
    Task<TokenPairResult> IssueTokensAsync(User user, CancellationToken ct = default);
    Task<TokenPairResult> RefreshTokensAsync(string refreshToken, CancellationToken ct = default);
    Task<bool> RevokeRefreshTokenAsync(string refreshToken, CancellationToken ct = default);
}

public record TokenPairResult(
    bool Succeeded,
    string? AccessToken = null,
    string? RefreshToken = null,
    DateTime? AccessTokenExpiresAtUtc = null,
    string? ErrorCode = null,
    string? ErrorMessage = null);