using System.Security.Claims;
using SharePlate.API.Contracts.Recipes;
using SharePlate.Core.Entities;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class RecipeEndpoints
{
    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recipes").WithTags("Recipes").RequireAuthorization();


        // GET /api/recipes?name=...
        group.MapGet("/", async (string? name, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out _))
                return Results.Unauthorized();

            var recipes = string.IsNullOrWhiteSpace(name)
                ? await uow.Recipes.GetAllWithAuthorAsync(ct)
                : await uow.Recipes.SearchByNameAsync(name, ct);

            return Results.Ok(recipes.Select(ToResponse).ToList());
        })
        .WithName("SearchRecipes")
        .WithSummary("Search all recipes by name, or list all if no query given");


        // GET /api/recipes/my
        group.MapGet("/my", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipes = await uow.Recipes.GetByAuthorAsync(actorUserId, ct);
            return Results.Ok(recipes.Select(ToResponse).ToList());
        })
        .WithName("GetMyRecipes")
        .WithSummary("Get all recipes created by the current user");




        // GET /api/recipes/{id}
        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out _))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetWithIngredientsAsync(id, ct);
            return recipe is null ? Results.NotFound() : Results.Ok(ToDetailResponse(recipe));
        })
        .WithName("GetRecipeById")
        .WithSummary("Get a recipe with its ingredients");




        // POST /api/recipes
        group.MapPost("/", async (CreateRecipeRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = Recipe.Create(req.Title, req.Notes, actorUserId, req.ImageUrl);

            await uow.Recipes.AddAsync(recipe, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Created($"/api/recipes/{recipe.Id}", ToResponse(recipe));
        })
        .WithName("CreateRecipe")
        .WithSummary("Create a new recipe");




        // PUT /api/recipes/{id}
        group.MapPut("/{id:guid}", async (Guid id, UpdateRecipeRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetByIdAsync(id, ct);
            if (recipe is null) return Results.NotFound();

            if (recipe.AuthorId != actorUserId)
                return Results.Forbid();

            recipe.UpdateTitle(req.Title);
            recipe.UpdateNotes(req.Notes);
            recipe.UpdateImageUrl(req.ImageUrl);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToResponse(recipe));
        })
        .WithName("UpdateRecipe")
        .WithSummary("Update a recipe's details (author only)");




        // DELETE /api/recipes/{id}
        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetByIdAsync(id, ct);
            if (recipe is null) return Results.NotFound();

            if (recipe.AuthorId != actorUserId)
                return Results.Forbid();

            uow.Recipes.Remove(recipe);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeleteRecipe")
        .WithSummary("Delete a recipe (author only)");




        // POST /api/recipes/{id}/ingredients
        group.MapPost("/{id:guid}/ingredients", async (Guid id, AddIngredientToRecipeRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetWithIngredientsAsync(id, ct);
            if (recipe is null) return Results.NotFound();

            if (recipe.AuthorId != actorUserId)
                return Results.Forbid();

            // Find or create the ingredient in the shared ingredients table
            var ingredient = await uow.Ingredients.GetByExactNameAsync(req.IngredientName, ct);
            if (ingredient is null)
            {
                ingredient = Ingredient.Create(req.IngredientName, req.UnitId);
                await uow.Ingredients.AddAsync(ingredient, ct);
            }

            var alreadyAdded = recipe.RecipeIngredients
                .Any(ri => ri.IngredientId == ingredient.Id);
            if (alreadyAdded)
                return Results.Conflict("Ingredient is already in this recipe.");

            var recipeIngredient = RecipeIngredient.Create(recipe.Id, ingredient.Id, req.Quantity, req.UnitId);
            await uow.RecipeIngredients.AddAsync(recipeIngredient, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Created(
                $"/api/recipes/{id}/ingredients/{recipeIngredient.Id}",
                ToIngredientResponse(recipeIngredient));
        })
        .WithName("AddIngredientToRecipe")
        .WithSummary("Add an ingredient to a recipe — creates the ingredient in the shared table if it does not exist");




        // PUT /api/recipes/{id}/ingredients/{recipeIngredientId}
        group.MapPut("/{id:guid}/ingredients/{recipeIngredientId:guid}", async (Guid id, Guid recipeIngredientId, UpdateRecipeIngredientRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetWithIngredientsAsync(id, ct);
            if (recipe is null) return Results.NotFound();

            if (recipe.AuthorId != actorUserId)
                return Results.Forbid();

            var ri = recipe.RecipeIngredients.FirstOrDefault(x => x.Id == recipeIngredientId);
            if (ri is null) return Results.NotFound("Recipe ingredient not found.");

            ri.UpdateQuantity(req.Quantity);
            ri.UpdateUnit(req.UnitId);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToIngredientResponse(ri));
        })
        .WithName("UpdateRecipeIngredient")
        .WithSummary("Update the quantity of an ingredient in a recipe (author only)");




        // DELETE /api/recipes/{id}/ingredients/{recipeIngredientId}
        group.MapDelete("/{id:guid}/ingredients/{recipeIngredientId:guid}", async (Guid id, Guid recipeIngredientId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetWithIngredientsAsync(id, ct);
            if (recipe is null) return Results.NotFound();

            if (recipe.AuthorId != actorUserId)
                return Results.Forbid();

            var ri = recipe.RecipeIngredients.FirstOrDefault(x => x.Id == recipeIngredientId);
            if (ri is null) return Results.NotFound("Recipe ingredient not found.");

            uow.RecipeIngredients.Remove(ri);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("RemoveIngredientFromRecipe")
        .WithSummary("Remove an ingredient from a recipe (author only)");
    }


    private static RecipeResponse ToResponse(Core.Entities.Recipe r) =>
        new(r.Id, r.Title, r.Notes, r.ImageUrl, r.AuthorId, r.Author?.Name ?? string.Empty, r.CreatedAt, r.UpdatedAt);

    private static RecipeIngredientResponse ToIngredientResponse(RecipeIngredient ri) =>
        new(ri.Id, ri.IngredientId, ri.Ingredient?.Name ?? string.Empty, ri.Quantity, ri.UnitId);

    private static RecipeWithIngredientsResponse ToDetailResponse(Core.Entities.Recipe r) =>
        new(r.Id, r.Title, r.Notes, r.ImageUrl, r.AuthorId, r.Author?.Name ?? string.Empty, r.CreatedAt, r.UpdatedAt,
            r.RecipeIngredients.Select(ToIngredientResponse).ToList());
}
