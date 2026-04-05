using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class HouseJoinRequestRepository : Repository<HouseJoinRequest>, IHouseJoinRequestRepository
{
    public HouseJoinRequestRepository(AppDbContext context) : base(context) { }

    public async Task<HouseJoinRequest?> GetPendingForUserAsync(Guid userId, CancellationToken ct = default)
        => await DbSet
            .Include(r => r.House)
            .FirstOrDefaultAsync(r => r.RequesterId == userId && r.Status == HouseJoinRequestStatus.Pending, ct);

    public async Task<HouseJoinRequest?> GetPendingForHouseAndUserAsync(Guid houseId, Guid userId, CancellationToken ct = default)
        => await DbSet
            .FirstOrDefaultAsync(r => r.HouseId == houseId && r.RequesterId == userId && r.Status == HouseJoinRequestStatus.Pending, ct);

    public async Task<IReadOnlyList<HouseJoinRequest>> GetPendingByHouseAsync(Guid houseId, CancellationToken ct = default)
        => await DbSet
            .Include(r => r.Requester)
            .Where(r => r.HouseId == houseId && r.Status == HouseJoinRequestStatus.Pending)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(ct);

    public async Task<bool> HasPendingForUserAsync(Guid userId, CancellationToken ct = default)
        => await DbSet.AnyAsync(r => r.RequesterId == userId && r.Status == HouseJoinRequestStatus.Pending, ct);

    public async Task<HouseJoinRequest?> GetWithDetailsAsync(Guid requestId, CancellationToken ct = default)
        => await DbSet
            .Include(r => r.House)
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);
}
