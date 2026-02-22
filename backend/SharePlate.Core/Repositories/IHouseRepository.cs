using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IHouseRepository : IRepository<House>
{
    Task<House?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<House?> GetWithMembersAsync(Guid houseId, CancellationToken ct = default);
    Task<bool> CodeExistsAsync(string code, CancellationToken ct = default);
}
