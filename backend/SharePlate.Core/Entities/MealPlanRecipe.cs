using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class MealPlanRecipe : BaseEntity
{
    private MealPlanRecipe() { }

    public static MealPlanRecipe Create(
        Guid mealPlanId,
        Guid recipeId,
        DateOnly plannedDate,
        CategoryType categoryType,
        int sortOrder)
    {
        if (sortOrder < 0) throw new ArgumentOutOfRangeException(nameof(sortOrder), "Sort order cannot be negative.");

        return new MealPlanRecipe
        {
            Id = Guid.NewGuid(),
            MealPlanId = mealPlanId,
            RecipeId = recipeId,
            PlannedDate = plannedDate,
            CategoryType = categoryType,
            SortOrder = sortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public Guid MealPlanId { get; private set; }
    public MealPlan MealPlan { get; private set; } = null!;

    public Guid RecipeId { get; private set; }
    public Recipe Recipe { get; private set; } = null!;

    public DateOnly PlannedDate { get; private set; }
    public CategoryType CategoryType { get; private set; }
    public int SortOrder { get; private set; }
}
