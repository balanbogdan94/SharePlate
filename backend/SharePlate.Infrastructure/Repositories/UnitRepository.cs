using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class UnitRepository : IUnitRepository
{
    private readonly AppDbContext _context;

    public UnitRepository(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<Unit>> GetAllAsync(CancellationToken ct = default)
        => await _context.Units.OrderBy(u => u.Id).ToListAsync(ct);
}
