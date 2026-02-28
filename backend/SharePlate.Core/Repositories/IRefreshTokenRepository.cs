using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    Task<RefreshToken> CreateAsync(Guid userId, string tokenHash, DateTime expiresAt, CancellationToken ct = default);
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task<IReadOnlyList<RefreshToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<RefreshToken?> RotateAsync(string currentTokenHash, string newTokenHash, DateTime newExpiresAt, CancellationToken ct = default);
    Task<bool> RevokeAsync(string tokenHash, CancellationToken ct = default);
    Task<int> RevokeAllByUserIdAsync(Guid userId, CancellationToken ct = default);
}