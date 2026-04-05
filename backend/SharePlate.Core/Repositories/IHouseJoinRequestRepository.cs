using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IHouseJoinRequestRepository : IRepository<HouseJoinRequest>
{
    Task<HouseJoinRequest?> GetPendingForUserAsync(Guid userId, CancellationToken ct = default);
    Task<HouseJoinRequest?> GetPendingForHouseAndUserAsync(Guid houseId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<HouseJoinRequest>> GetPendingByHouseAsync(Guid houseId, CancellationToken ct = default);
    Task<bool> HasPendingForUserAsync(Guid userId, CancellationToken ct = default);
    Task<HouseJoinRequest?> GetWithDetailsAsync(Guid requestId, CancellationToken ct = default);
}
