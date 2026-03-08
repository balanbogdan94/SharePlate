using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IUnitRepository
{
    Task<IReadOnlyList<Unit>> GetAllAsync(CancellationToken ct = default);
}
