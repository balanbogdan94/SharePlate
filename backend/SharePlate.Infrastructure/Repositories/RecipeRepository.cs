using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class RecipeRepository : Repository<Recipe>, IRecipeRepository
{
    public RecipeRepository(AppDbContext context) : base(context) { }

    public async Task<Recipe?> GetWithIngredientsAsync(Guid recipeId, CancellationToken ct = default)
        => await DbSet
            .Include(r => r.Author)
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Ingredient)
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Unit)
            .FirstOrDefaultAsync(r => r.Id == recipeId, ct);

    public async Task<IReadOnlyList<Recipe>> GetAllWithAuthorAsync(CancellationToken ct = default)
        => await DbSet
            .Include(r => r.Author)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Recipe>> GetByAuthorAsync(Guid authorId, CancellationToken ct = default)
        => await DbSet
            .Include(r => r.Author)
            .Where(r => r.AuthorId == authorId)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Recipe>> GetByAuthorIdsAsync(IEnumerable<Guid> authorIds, CancellationToken ct = default)
    {
        var ids = authorIds.Distinct().ToArray();
        if (ids.Length == 0)
            return [];

        return await DbSet
            .Include(r => r.Author)
            .Where(r => ids.Contains(r.AuthorId))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Recipe>> SearchByNameAsync(string name, CancellationToken ct = default)
        => await DbSet
            .Include(r => r.Author)
            .Where(r => EF.Functions.ILike(r.Title, $"%{name}%"))
            .ToListAsync(ct);
}
