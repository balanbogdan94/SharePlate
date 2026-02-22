using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IIngredientRepository : IRepository<Ingredient>
{
    Task<IReadOnlyList<Ingredient>> SearchByNameAsync(string name, CancellationToken ct = default);
    Task<bool> NameExistsAsync(string name, CancellationToken ct = default);
}
