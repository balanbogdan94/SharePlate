using SharePlate.Core.Entities;
using SharePlate.Core.Enums;

namespace SharePlate.Core.Repositories;

public interface IShoppingItemRepository : IRepository<ShoppingItem>
{
    Task<IReadOnlyList<ShoppingItem>> GetByMealPlanAsync(Guid mealPlanId, CancellationToken ct = default);
    Task<IReadOnlyList<ShoppingItem>> GetByHouseAsync(Guid houseId, CancellationToken ct = default);
    Task<ShoppingItem?> GetPendingByIngredientAndUnitAsync(Guid mealPlanId, Guid ingredientId, int unitId, CancellationToken ct = default);
    Task<IReadOnlyList<ShoppingItem>> GetPendingByMealPlanAsync(Guid mealPlanId, CancellationToken ct = default);
}
