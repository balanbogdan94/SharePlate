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
            .Where(mp => mp.HouseId == houseId)
            .OrderByDescending(mp => mp.StartDate)
            .ToListAsync(ct);
}
