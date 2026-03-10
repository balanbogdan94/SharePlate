using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SharePlate.Core.Enums;

namespace SharePlate.API.Contracts.Recipes;

public sealed class RecipeIngredientRequest
{
    [FromForm]
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; init; } = "";

    [FromForm]
    [Range(0.001, double.MaxValue, ErrorMessage = "Quantity must be positive.")]
    public double Quantity { get; init; }

    [FromForm]
    [Required]
    public UnitType Unit { get; init; }
}

public sealed class CreateRecipeRequest
{
    [FromForm]
    [Required, StringLength(200, MinimumLength = 2)]
    public string Title { get; init; } = "";

    [FromForm]
    public string Notes { get; init; } = "";

    public IFormFile? Image { get; init; }

    public List<RecipeIngredientRequest> Ingredients { get; init; } = [];
}

public sealed class UpdateRecipeRequest
{
    [FromForm]
    [Required, StringLength(200, MinimumLength = 2)]
    public string Title { get; init; } = "";

    [FromForm]
    public string Notes { get; init; } = "";

    [FromForm]
    public bool RemoveImage { get; init; }

    public IFormFile? Image { get; init; }

    public List<RecipeIngredientRequest> Ingredients { get; init; } = [];
}

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
