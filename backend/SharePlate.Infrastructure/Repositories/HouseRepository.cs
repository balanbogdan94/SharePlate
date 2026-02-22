using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class HouseRepository : Repository<House>, IHouseRepository
{
    public HouseRepository(AppDbContext context) : base(context) { }

    public async Task<House?> GetByCodeAsync(string code, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(h => h.Code == code, ct);

    public async Task<House?> GetWithMembersAsync(Guid houseId, CancellationToken ct = default)
        => await DbSet
            .Include(h => h.HouseMembers)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(h => h.Id == houseId, ct);

    public async Task<bool> CodeExistsAsync(string code, CancellationToken ct = default)
        => await DbSet.AnyAsync(h => h.Code == code, ct);
}
