using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IRecipeRepository : IRepository<Recipe>
{
    Task<Recipe?> GetWithIngredientsAsync(Guid recipeId, CancellationToken ct = default);
    Task<IReadOnlyList<Recipe>> GetByAuthorAsync(Guid authorId, CancellationToken ct = default);
}
