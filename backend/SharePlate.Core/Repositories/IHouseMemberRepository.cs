using SharePlate.Core.Entities;
using SharePlate.Core.Enums;

namespace SharePlate.Core.Repositories;

public interface IHouseMemberRepository : IRepository<HouseMember>
{
    Task<HouseMember?> GetAsync(Guid houseId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<HouseMember>> GetByHouseAsync(Guid houseId, CancellationToken ct = default);
    Task<bool> IsMemberAsync(Guid houseId, Guid userId, CancellationToken ct = default);
    Task<bool> IsOwnerAsync(Guid houseId, Guid userId, CancellationToken ct = default);
    Task<int> CountOwnersAsync(Guid houseId, CancellationToken ct = default);
}
