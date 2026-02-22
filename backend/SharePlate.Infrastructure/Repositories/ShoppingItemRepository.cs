using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class ShoppingItemRepository : Repository<ShoppingItem>, IShoppingItemRepository
{
    public ShoppingItemRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<ShoppingItem>> GetByMealPlanAsync(Guid mealPlanId, CancellationToken ct = default)
        => await DbSet
            .Include(si => si.Ingredient)
            .Include(si => si.Unit)
            .Where(si => si.MealPlanId == mealPlanId)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ShoppingItem>> GetByHouseAsync(Guid houseId, CancellationToken ct = default)
        => await DbSet
            .Include(si => si.Ingredient)
            .Include(si => si.Unit)
            .Where(si => si.HouseId == houseId)
            .ToListAsync(ct);

    public async Task<ShoppingItem?> GetPendingByIngredientAndUnitAsync(Guid mealPlanId, Guid ingredientId, int unitId, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(
            si => si.MealPlanId == mealPlanId
               && si.IngredientId == ingredientId
               && si.UnitId == unitId
               && si.Status == ShoppingItemStatus.Pending,
            ct);

    public async Task<IReadOnlyList<ShoppingItem>> GetPendingByMealPlanAsync(Guid mealPlanId, CancellationToken ct = default)
        => await DbSet
            .Include(si => si.Ingredient)
                .ThenInclude(i => i.DefaultUnit)
            .Include(si => si.Unit)
            .Where(si => si.MealPlanId == mealPlanId && si.Status == ShoppingItemStatus.Pending)
            .ToListAsync(ct);
}
