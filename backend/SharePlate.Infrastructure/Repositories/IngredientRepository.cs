using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class IngredientRepository : Repository<Ingredient>, IIngredientRepository
{
    public IngredientRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<Ingredient>> SearchByNameAsync(string name, CancellationToken ct = default)
        => await DbSet
            .Where(i => EF.Functions.ILike(i.Name, $"%{name}%"))
            .Include(i => i.DefaultUnit)
            .ToListAsync(ct);

    public async Task<bool> NameExistsAsync(string name, CancellationToken ct = default)
        => await DbSet.AnyAsync(i => i.Name.ToLower() == name.ToLower(), ct);
}
