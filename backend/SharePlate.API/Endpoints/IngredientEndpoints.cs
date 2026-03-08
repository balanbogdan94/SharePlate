using System.Security.Claims;
using SharePlate.API.Contracts.Ingredients;
using SharePlate.Core.Entities;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class IngredientEndpoints
{
    public static void MapIngredientEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ingredients").WithTags("Ingredients").RequireAuthorization();


        // GET /api/ingredients/search?name=...
        group.MapGet("/search", async (string name, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out _))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest("Search query cannot be empty.");

            var ingredients = await uow.Ingredients.SearchByNameAsync(name, ct);
            return Results.Ok(ingredients.Select(ToResponse).ToList());
        })
        .WithName("SearchIngredients")
        .WithSummary("Search shared ingredients by name (for autocomplete)");
    }


    private static IngredientResponse ToResponse(Ingredient i) =>
        new(i.Id, i.Name, i.DefaultUnitId);
}
