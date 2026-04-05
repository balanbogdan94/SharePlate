using System.Security.Claims;
using System.Text.Json;
using SharePlate.API.Contracts.Recipes;
using SharePlate.Core.Entities;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;
using SharePlate.Core.Services;

namespace SharePlate.API.Endpoints;

public static class RecipeEndpoints
{
    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recipes").WithTags("Recipes").RequireAuthorization();


        // GET /api/recipes?search=...
        group.MapGet("/", async (string? search, string? name, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var membership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (membership is null)
                return Results.NotFound("You need to join or create a house before viewing shared recipes.");

            var members = await uow.HouseMembers.GetByHouseAsync(membership.HouseId, ct);
            var recipes = await uow.Recipes.GetByAuthorIdsAsync(members.Select(member => member.UserId), ct);

            var query = !string.IsNullOrWhiteSpace(search) ? search : name;
            var filteredRecipes = string.IsNullOrWhiteSpace(query)
                ? recipes
                : recipes.Where(recipe =>
                    recipe.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                    (recipe.Author?.Name ?? string.Empty).Contains(query, StringComparison.OrdinalIgnoreCase));

            return Results.Ok(filteredRecipes.Select(ToResponse).ToList());
        })
        .WithName("SearchRecipes")
        .WithSummary("Search shared house recipes, or list all if no query given");


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

        // GET /api/recipes/house
        group.MapGet("/house", async (string? search, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var membership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (membership is null)
                return Results.NotFound("You need to join or create a house before viewing house recipes.");

            var members = await uow.HouseMembers.GetByHouseAsync(membership.HouseId, ct);
            var recipes = await uow.Recipes.GetByAuthorIdsAsync(members.Select(member => member.UserId), ct);

            var filteredRecipes = string.IsNullOrWhiteSpace(search)
                ? recipes
                : recipes.Where(recipe =>
                    recipe.Title.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    (recipe.Author?.Name ?? string.Empty).Contains(search, StringComparison.OrdinalIgnoreCase));

            return Results.Ok(filteredRecipes
                .OrderBy(recipe => recipe.Title)
                .ThenBy(recipe => recipe.Author!.Name)
                .Select(ToResponse)
                .ToList());
        })
        .WithName("GetHouseRecipes")
        .WithSummary("Get all recipes created by members of the current house");




        // GET /api/recipes/{id}
        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetWithIngredientsAsync(id, ct);
            if (recipe is null)
                return Results.NotFound();

            if (recipe.AuthorId == actorUserId)
                return Results.Ok(ToDetailResponse(recipe));

            var actorMembership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (actorMembership is null)
                return Results.Forbid();

            var authorMembership = await uow.HouseMembers.GetCurrentForUserAsync(recipe.AuthorId, ct);
            if (authorMembership is null || authorMembership.HouseId != actorMembership.HouseId)
                return Results.Forbid();

            return Results.Ok(ToDetailResponse(recipe));
        })
        .WithName("GetRecipeById")
        .WithSummary("Get a recipe with its ingredients (author or same-house members)");




        // POST /api/recipes
        group.MapPost("/", async ([AsParameters] CreateRecipeRequest req, ClaimsPrincipal principal, IUnitOfWork uow, IStorageService storage, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            List<RecipeIngredientRequest> ingredients;
            try { ingredients = JsonSerializer.Deserialize<List<RecipeIngredientRequest>>(req.Ingredients, JsonSerializerOptions.Web) ?? []; }
            catch { return Results.BadRequest("Ingredients must be a valid JSON array."); }

            if (ingredients.Count == 0)
                return Results.BadRequest("At least one ingredient is required.");

            var imageUrl = "";
            if (req.Image is not null)
            {
                if (!IsValidImage(req.Image))
                    return Results.BadRequest("Image must be jpeg, png, or webp and under 5 MB.");
                imageUrl = await storage.UploadImageAsync(req.Image.OpenReadStream(), req.Image.FileName, req.Image.ContentType, ct);
            }

            var recipe = Recipe.Create(req.Title, req.Notes, actorUserId, imageUrl);
            await uow.Recipes.AddAsync(recipe, ct);
            await AddIngredientsAsync(recipe.Id, ingredients, uow, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Created($"/api/recipes/{recipe.Id}", ToResponse(recipe));
        })
        .WithName("CreateRecipe")
        .WithSummary("Create a new recipe")
        .DisableAntiforgery();




        // PUT /api/recipes/{id}
        group.MapPut("/{id:guid}", async (Guid id, [AsParameters] UpdateRecipeRequest req, ClaimsPrincipal principal, IUnitOfWork uow, IStorageService storage, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            List<RecipeIngredientRequest> ingredients;
            try { ingredients = JsonSerializer.Deserialize<List<RecipeIngredientRequest>>(req.Ingredients, JsonSerializerOptions.Web) ?? []; }
            catch { return Results.BadRequest("Ingredients must be a valid JSON array."); }

            if (ingredients.Count == 0)
                return Results.BadRequest("At least one ingredient is required.");

            var recipe = await uow.Recipes.GetWithIngredientsAsync(id, ct);
            if (recipe is null) return Results.NotFound();

            if (recipe.AuthorId != actorUserId)
                return Results.Forbid();

            recipe.UpdateTitle(req.Title);
            recipe.UpdateNotes(req.Notes);

            if (req.RemoveImage)
            {
                await storage.DeleteImageAsync(recipe.ImageUrl, ct);
                recipe.UpdateImageUrl("");
            }
            else if (req.Image is not null)
            {
                if (!IsValidImage(req.Image))
                    return Results.BadRequest("Image must be jpeg, png, or webp and under 5 MB.");
                await storage.DeleteImageAsync(recipe.ImageUrl, ct);
                var newUrl = await storage.UploadImageAsync(req.Image.OpenReadStream(), req.Image.FileName, req.Image.ContentType, ct);
                recipe.UpdateImageUrl(newUrl);
            }

            foreach (var ri in recipe.RecipeIngredients.ToList())
                uow.RecipeIngredients.Remove(ri);
            await AddIngredientsAsync(recipe.Id, ingredients, uow, ct);

            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToResponse(recipe));
        })
        .WithName("UpdateRecipe")
        .WithSummary("Update a recipe's details (author only)")
        .DisableAntiforgery();




        // DELETE /api/recipes/{id}
        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, IStorageService storage, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var recipe = await uow.Recipes.GetByIdAsync(id, ct);
            if (recipe is null) return Results.NotFound();

            if (recipe.AuthorId != actorUserId)
                return Results.Forbid();

            await storage.DeleteImageAsync(recipe.ImageUrl, ct);
            uow.Recipes.Remove(recipe);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeleteRecipe")
        .WithSummary("Delete a recipe (author only)");
    }


    private static async Task AddIngredientsAsync(
        Guid recipeId,
        IEnumerable<RecipeIngredientRequest> items,
        IUnitOfWork uow,
        CancellationToken ct)
    {
        var cache = new Dictionary<string, Ingredient>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in items)
        {
            if (!cache.TryGetValue(item.Name, out var ingredient))
            {
                ingredient = await uow.Ingredients.GetByExactNameAsync(item.Name, ct);
                if (ingredient is null)
                {
                    ingredient = Ingredient.Create(item.Name, item.Unit);
                    await uow.Ingredients.AddAsync(ingredient, ct);
                }
                cache[item.Name] = ingredient;
            }
            await uow.RecipeIngredients.AddAsync(
                RecipeIngredient.Create(recipeId, ingredient.Id, item.Quantity, item.Unit), ct);
        }
    }

    private static readonly string[] AllowedImageContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxImageSizeBytes = 5 * 1024 * 1024; // 5 MB

    private static bool IsValidImage(IFormFile file) =>
        AllowedImageContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase)
        && file.Length is > 0 and <= MaxImageSizeBytes;

    private static RecipeResponse ToResponse(Core.Entities.Recipe r) =>
        new(r.Id, r.Title, r.Notes, r.ImageUrl, r.AuthorId, r.Author?.Name ?? string.Empty, r.CreatedAt, r.UpdatedAt);

    private static RecipeIngredientResponse ToIngredientResponse(RecipeIngredient ri) =>
        new(ri.Id, ri.IngredientId, ri.Ingredient?.Name ?? string.Empty, ri.Quantity, ri.UnitId);

    private static RecipeWithIngredientsResponse ToDetailResponse(Core.Entities.Recipe r) =>
        new(r.Id, r.Title, r.Notes, r.ImageUrl, r.AuthorId, r.Author?.Name ?? string.Empty, r.CreatedAt, r.UpdatedAt,
            r.RecipeIngredients.Select(ToIngredientResponse).ToList());
}
