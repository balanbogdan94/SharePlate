using System.Security.Claims;
using SharePlate.API.Contracts.Plans;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class PlanEndpoints
{
    public static void MapPlanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/plans").WithTags("Plans").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var houseMembership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (houseMembership is null)
                return Results.NotFound("You need to join or create a house before managing plans.");

            var plans = await uow.MealPlans.GetByHouseAsync(houseMembership.HouseId, ct);
            return Results.Ok(plans.Select(ToResponse).ToList());
        })
        .WithName("GetPlans")
        .WithSummary("Get all plans for the current house");

        group.MapGet("/active", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var houseMembership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (houseMembership is null)
                return Results.NotFound("You need to join or create a house before managing plans.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var activePlan = await uow.MealPlans.GetActiveByHouseAsync(houseMembership.HouseId, today, ct);

            return activePlan is null
                ? Results.NotFound("No active plan found.")
                : Results.Ok(ToResponse(activePlan));
        })
        .WithName("GetActivePlan")
        .WithSummary("Get the active plan for the current house");

        group.MapPost("/", async (CreatePlanRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var houseMembership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (houseMembership is null)
                return Results.NotFound("You need to join or create a house before managing plans.");

            if (req.EndDate < req.StartDate)
                return Results.BadRequest("End date must be on or after the start date.");

            var hasOverlap = await uow.MealPlans.HasOverlappingRangeAsync(houseMembership.HouseId, req.StartDate, req.EndDate, ct: ct);
            if (hasOverlap)
                return Results.Conflict("Another plan already exists for the selected date range.");

            var plan = MealPlan.Create(req.Name, req.StartDate, req.EndDate, houseMembership.HouseId, actorUserId);
            await uow.MealPlans.AddAsync(plan, ct);

            foreach (var item in req.Recipes)
            {
                var validationError = await ValidatePlanRecipeRequestAsync(item.RecipeId, item.TargetDate, item.MealTime, item.Servings, plan, actorUserId, uow, ct);
                if (validationError is not null)
                    return validationError;

                plan.MealPlanRecipes.Add(MealPlanRecipe.Create(plan.Id, item.RecipeId, item.TargetDate, item.MealTime, item.Servings));
            }

            await uow.SaveChangesAsync(ct);

            var createdPlan = await uow.MealPlans.GetWithRecipesAsync(plan.Id, ct) ?? plan;
            return Results.Created($"/api/plans/{plan.Id}", ToResponse(createdPlan));
        })
        .WithName("CreatePlan")
        .WithSummary("Create a new plan for the current house");

        group.MapPut("/{id:guid}", async (Guid id, UpdatePlanRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var plan = await uow.MealPlans.GetWithRecipesAsync(id, ct);
            if (plan is null)
                return Results.NotFound();

            if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
                return Results.Forbid();

            if (req.EndDate < req.StartDate)
                return Results.BadRequest("End date must be on or after the start date.");

            var hasOverlap = await uow.MealPlans.HasOverlappingRangeAsync(plan.HouseId, req.StartDate, req.EndDate, plan.Id, ct);
            if (hasOverlap)
                return Results.Conflict("Another plan already exists for the selected date range.");

            if (plan.MealPlanRecipes.Any(item => item.PlannedDate < req.StartDate || item.PlannedDate > req.EndDate))
                return Results.BadRequest("All planned recipes must stay within the updated date range.");

            plan.UpdateDetails(req.Name, req.StartDate, req.EndDate);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToResponse(plan));
        })
        .WithName("UpdatePlan")
        .WithSummary("Update a plan");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var plan = await uow.MealPlans.GetWithRecipesAsync(id, ct);
            if (plan is null)
                return Results.NotFound();

            if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
                return Results.Forbid();

            uow.MealPlans.Remove(plan);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeletePlan")
        .WithSummary("Delete a plan");

        group.MapPost("/{id:guid}/recipes", async (Guid id, CreatePlanRecipeRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var plan = await uow.MealPlans.GetWithRecipesAsync(id, ct);
            if (plan is null)
                return Results.NotFound();

            if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
                return Results.Forbid();

            var validationError = await ValidatePlanRecipeRequestAsync(req.RecipeId, req.TargetDate, req.MealTime, req.Servings, plan, actorUserId, uow, ct);
            if (validationError is not null)
                return validationError;

            var planRecipe = MealPlanRecipe.Create(plan.Id, req.RecipeId, req.TargetDate, req.MealTime, req.Servings);
            plan.MealPlanRecipes.Add(planRecipe);
            await uow.SaveChangesAsync(ct);

            var savedPlan = await uow.MealPlans.GetWithRecipesAsync(plan.Id, ct);
            var savedRecipe = savedPlan?.MealPlanRecipes.FirstOrDefault(item => item.Id == planRecipe.Id) ?? planRecipe;

            return Results.Created($"/api/plans/{plan.Id}/recipes/{planRecipe.Id}", ToRecipeResponse(savedRecipe));
        })
        .WithName("AddPlanRecipe")
        .WithSummary("Add a recipe to a plan");

        group.MapPut("/{id:guid}/recipes/{planRecipeId:guid}", async (Guid id, Guid planRecipeId, UpdatePlanRecipeRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var plan = await uow.MealPlans.GetWithRecipesAsync(id, ct);
            if (plan is null)
                return Results.NotFound();

            if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
                return Results.Forbid();

            var planRecipe = plan.MealPlanRecipes.FirstOrDefault(item => item.Id == planRecipeId);
            if (planRecipe is null)
                return Results.NotFound();

            var validationError = ValidatePlanRecipe(req.TargetDate, req.MealTime, req.Servings, plan);
            if (validationError is not null)
                return validationError;

            planRecipe.Update(req.TargetDate, req.MealTime, req.Servings);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToRecipeResponse(planRecipe));
        })
        .WithName("UpdatePlanRecipe")
        .WithSummary("Update a planned recipe");

        group.MapDelete("/{id:guid}/recipes/{planRecipeId:guid}", async (Guid id, Guid planRecipeId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var plan = await uow.MealPlans.GetWithRecipesAsync(id, ct);
            if (plan is null)
                return Results.NotFound();

            if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
                return Results.Forbid();

            var planRecipe = plan.MealPlanRecipes.FirstOrDefault(item => item.Id == planRecipeId);
            if (planRecipe is null)
                return Results.NotFound();

            plan.MealPlanRecipes.Remove(planRecipe);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeletePlanRecipe")
        .WithSummary("Remove a recipe from a plan");
    }

    private static async Task<IResult?> ValidatePlanRecipeRequestAsync(
        Guid recipeId,
        DateOnly targetDate,
        MealTime mealTime,
        int servings,
        MealPlan plan,
        Guid actorUserId,
        IUnitOfWork uow,
        CancellationToken ct)
    {
        var recipe = await uow.Recipes.GetByIdAsync(recipeId, ct);
        if (recipe is null)
            return Results.NotFound("Recipe not found.");

        if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
            return Results.Forbid();

        if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, recipe.AuthorId, ct))
            return Results.BadRequest("Only recipes from the current house can be added to a plan.");

        return ValidatePlanRecipe(targetDate, mealTime, servings, plan);
    }

    private static IResult? ValidatePlanRecipe(DateOnly targetDate, MealTime mealTime, int servings, MealPlan plan)
    {
        if (!Enum.IsDefined(mealTime))
            return Results.BadRequest("Meal time is invalid.");

        if (servings <= 0)
            return Results.BadRequest("Servings must be positive.");

        if (targetDate < plan.StartDate || targetDate > plan.EndDate)
            return Results.BadRequest("Target date must be within the plan date range.");

        return null;
    }

    private static PlanResponse ToResponse(MealPlan plan) =>
        new(
            plan.Id,
            plan.Name,
            plan.StartDate,
            plan.EndDate,
            plan.HouseId,
            plan.CreatedAt,
            plan.UpdatedAt,
            plan.MealPlanRecipes
                .OrderBy(item => item.PlannedDate)
                .ThenBy(item => item.MealTime)
                .Select(ToRecipeResponse)
                .ToList());

    private static PlanRecipeResponse ToRecipeResponse(MealPlanRecipe item) =>
        new(
            item.Id,
            item.RecipeId,
            item.Recipe?.Title ?? string.Empty,
            item.Recipe?.ImageUrl ?? string.Empty,
            item.PlannedDate,
            item.MealTime,
            item.Servings);
}
