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
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Ingredient)
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Unit)
            .FirstOrDefaultAsync(r => r.Id == recipeId, ct);

    public async Task<IReadOnlyList<Recipe>> GetByAuthorAsync(Guid authorId, CancellationToken ct = default)
        => await DbSet
            .Where(r => r.AuthorId == authorId)
            .ToListAsync(ct);
}
