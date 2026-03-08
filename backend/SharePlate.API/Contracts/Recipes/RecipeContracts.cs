using System.ComponentModel.DataAnnotations;
using SharePlate.Core.Enums;

namespace SharePlate.API.Contracts.Recipes;

public record CreateRecipeRequest(
    [property: Required, StringLength(200, MinimumLength = 2)]
    string Title,

    string Notes = "",
    string ImageUrl = ""
);

public record UpdateRecipeRequest(
    [property: Required, StringLength(200, MinimumLength = 2)]
    string Title,

    string Notes = "",
    string ImageUrl = ""
);

public record AddIngredientToRecipeRequest(
    [property: Required, StringLength(200, MinimumLength = 2)]
    string IngredientName,

    [property: Range(0.001, double.MaxValue, ErrorMessage = "Quantity must be positive.")]
    double Quantity,

    [property: Required]
    UnitType UnitId
);

public record UpdateRecipeIngredientRequest(
    [property: Range(0.001, double.MaxValue, ErrorMessage = "Quantity must be positive.")]
    double Quantity,

    [property: Required]
    UnitType UnitId
);

public record RecipeResponse(
    Guid Id,
    string Title,
    string Notes,
    string ImageUrl,
    Guid AuthorId,
    string AuthorName,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record RecipeIngredientResponse(
    Guid Id,
    Guid IngredientId,
    string IngredientName,
    double Quantity,
    UnitType UnitId
);

public record RecipeWithIngredientsResponse(
    Guid Id,
    string Title,
    string Notes,
    string ImageUrl,
    Guid AuthorId,
    string AuthorName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<RecipeIngredientResponse> Ingredients
);
