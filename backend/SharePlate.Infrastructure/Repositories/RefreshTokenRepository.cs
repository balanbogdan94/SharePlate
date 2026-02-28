using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class RefreshTokenRepository : Repository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(AppDbContext context) : base(context) { }

    public async Task<RefreshToken> CreateAsync(Guid userId, string tokenHash, DateTime expiresAt, CancellationToken ct = default)
    {
        var refreshToken = RefreshToken.Create(userId, tokenHash, expiresAt);
        await DbSet.AddAsync(refreshToken, ct);
        return refreshToken;
    }

    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

    public async Task<IReadOnlyList<RefreshToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        return await DbSet
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > now)
            .ToListAsync(ct);
    }

    public async Task<RefreshToken?> RotateAsync(string currentTokenHash, string newTokenHash, DateTime newExpiresAt, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var currentToken = await DbSet.FirstOrDefaultAsync(rt => rt.TokenHash == currentTokenHash, ct);
        if (currentToken is null || currentToken.IsRevoked || currentToken.ExpiresAt <= now)
            return null;

        currentToken.Revoke();

        var newToken = RefreshToken.Create(currentToken.UserId, newTokenHash, newExpiresAt);
        await DbSet.AddAsync(newToken, ct);

        return newToken;
    }

    public async Task<bool> RevokeAsync(string tokenHash, CancellationToken ct = default)
    {
        var token = await DbSet.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);
        if (token is null || token.IsRevoked)
            return false;

        token.Revoke();
        return true;
    }

    public async Task<int> RevokeAllByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var activeTokens = await DbSet
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > now)
            .ToListAsync(ct);

        foreach (var token in activeTokens)
        {
            token.Revoke();
        }

        return activeTokens.Count;
    }
}