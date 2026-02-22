using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class HouseMemberRepository : Repository<HouseMember>, IHouseMemberRepository
{
    public HouseMemberRepository(AppDbContext context) : base(context) { }

    public async Task<HouseMember?> GetAsync(Guid houseId, Guid userId, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(m => m.HouseId == houseId && m.UserId == userId, ct);

    public async Task<IReadOnlyList<HouseMember>> GetByHouseAsync(Guid houseId, CancellationToken ct = default)
        => await DbSet
            .Include(m => m.User)
            .Where(m => m.HouseId == houseId)
            .ToListAsync(ct);

    public async Task<bool> IsMemberAsync(Guid houseId, Guid userId, CancellationToken ct = default)
        => await DbSet.AnyAsync(m => m.HouseId == houseId && m.UserId == userId, ct);

    public async Task<bool> IsOwnerAsync(Guid houseId, Guid userId, CancellationToken ct = default)
        => await DbSet.AnyAsync(m => m.HouseId == houseId && m.UserId == userId && m.Role == HouseMemberRole.Owner, ct);

    public async Task<int> CountOwnersAsync(Guid houseId, CancellationToken ct = default)
        => await DbSet.CountAsync(m => m.HouseId == houseId && m.Role == HouseMemberRole.Owner, ct);
}
