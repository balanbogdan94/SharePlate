using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class MealPlanRepository : Repository<MealPlan>, IMealPlanRepository
{
    public MealPlanRepository(AppDbContext context) : base(context) { }

    public async Task<MealPlan?> GetWithRecipesAsync(Guid mealPlanId, CancellationToken ct = default)
        => await DbSet
            .Include(mp => mp.MealPlanRecipes)
                .ThenInclude(mpr => mpr.Recipe)
            .FirstOrDefaultAsync(mp => mp.Id == mealPlanId, ct);

    public async Task<IReadOnlyList<MealPlan>> GetByHouseAsync(Guid houseId, CancellationToken ct = default)
        => await DbSet
            .Include(mp => mp.MealPlanRecipes)
                .ThenInclude(mpr => mpr.Recipe)
            .Where(mp => mp.HouseId == houseId)
            .OrderByDescending(mp => mp.StartDate)
            .ToListAsync(ct);

    public async Task<MealPlan?> GetActiveByHouseAsync(Guid houseId, DateOnly date, CancellationToken ct = default)
        => await DbSet
            .Include(mp => mp.MealPlanRecipes)
                .ThenInclude(mpr => mpr.Recipe)
            .Where(mp => mp.HouseId == houseId && mp.StartDate <= date && mp.EndDate >= date)
            .OrderByDescending(mp => mp.UpdatedAt)
            .ThenByDescending(mp => mp.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task<bool> HasOverlappingRangeAsync(Guid houseId, DateOnly startDate, DateOnly endDate, Guid? excludedMealPlanId = null, CancellationToken ct = default)
        => await DbSet.AnyAsync(mp =>
            mp.HouseId == houseId
            && (!excludedMealPlanId.HasValue || mp.Id != excludedMealPlanId.Value)
            && mp.StartDate <= endDate
            && mp.EndDate >= startDate,
            ct);
}
