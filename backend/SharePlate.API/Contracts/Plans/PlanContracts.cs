using System.ComponentModel.DataAnnotations;
using SharePlate.Core.Enums;

namespace SharePlate.API.Contracts.Plans;

public sealed class CreatePlanRequest
{
    [StringLength(200)]
    public string Name { get; init; } = "";

    [Required]
    public DateOnly StartDate { get; init; }

    [Required]
    public DateOnly EndDate { get; init; }

    public List<CreatePlanRecipeRequest> Recipes { get; init; } = [];
}

public sealed class UpdatePlanRequest
{
    [StringLength(200)]
    public string Name { get; init; } = "";

    [Required]
    public DateOnly StartDate { get; init; }

    [Required]
    public DateOnly EndDate { get; init; }
}

public sealed class CreatePlanRecipeRequest
{
    [Required]
    public Guid RecipeId { get; init; }

    [Required]
    public DateOnly TargetDate { get; init; }

    [Required]
    public MealTime MealTime { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "Servings must be positive.")]
    public int Servings { get; init; }
}

public sealed class UpdatePlanRecipeRequest
{
    [Required]
    public DateOnly TargetDate { get; init; }

    [Required]
    public MealTime MealTime { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "Servings must be positive.")]
    public int Servings { get; init; }
}

public record PlanRecipeResponse(
    Guid Id,
    Guid RecipeId,
    string RecipeTitle,
    string RecipeImageUrl,
    DateOnly TargetDate,
    MealTime MealTime,
    int Servings
);

public record PlanResponse(
    Guid Id,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    Guid HouseId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<PlanRecipeResponse> Recipes
);
