using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IMealPlanRepository : IRepository<MealPlan>
{
    Task<MealPlan?> GetWithRecipesAsync(Guid mealPlanId, CancellationToken ct = default);
    Task<IReadOnlyList<MealPlan>> GetByHouseAsync(Guid houseId, CancellationToken ct = default);
    Task<MealPlan?> GetActiveByHouseAsync(Guid houseId, DateOnly date, CancellationToken ct = default);
    Task<bool> HasOverlappingRangeAsync(Guid houseId, DateOnly startDate, DateOnly endDate, Guid? excludedMealPlanId = null, CancellationToken ct = default);
}
