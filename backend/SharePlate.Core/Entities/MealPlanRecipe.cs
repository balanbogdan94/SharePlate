using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class MealPlanRecipe : BaseEntity
{
    private MealPlanRecipe() { }

    public static MealPlanRecipe Create(Guid mealPlanId, Guid recipeId, DateOnly plannedDate, MealTime mealTime, int servings)
    {
        if (servings <= 0) throw new ArgumentOutOfRangeException(nameof(servings), "Servings must be positive.");

        return new MealPlanRecipe
        {
            Id = Guid.NewGuid(),
            MealPlanId = mealPlanId,
            RecipeId = recipeId,
            PlannedDate = plannedDate,
            MealTime = mealTime,
            Servings = servings,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public Guid MealPlanId { get; private set; }
    public MealPlan MealPlan { get; private set; } = null!;

    public Guid RecipeId { get; private set; }
    public Recipe Recipe { get; private set; } = null!;

    public DateOnly PlannedDate { get; private set; }
    public MealTime MealTime { get; private set; }
    public int Servings { get; private set; }
}
