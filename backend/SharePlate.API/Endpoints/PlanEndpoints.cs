using System.Globalization;
using System.Security.Claims;
using SharePlate.API.Contracts.Plans;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class PlanEndpoints
{
    private const string LocalDateHeaderName = "X-Local-Date";
    private static readonly CategoryType[] CategoryTypes = Enum.GetValues<CategoryType>();

    public static void MapPlanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/plans").WithTags("Plans").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var houseMembership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (houseMembership is null)
                return Results.NotFound("You need to join or create a house before managing plans.");

            var plans = await uow.MealPlans.GetByHouseAsync(houseMembership.HouseId, ct);
            return Results.Ok(plans
                .OrderBy(plan => plan.StartDate)
                .ThenBy(plan => plan.EndDate)
                .Select(ToListResponse)
                .ToList());
        })
        .WithName("GetPlans")
        .WithSummary("Get all plans for the current house");

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var plan = await uow.MealPlans.GetWithRecipesAsync(id, ct);
            if (plan is null)
                return Results.NotFound();

            if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
                return Results.Forbid();

            return Results.Ok(ToDetailsResponse(plan));
        })
        .WithName("GetPlanById")
        .WithSummary("Get a plan with all dates and categories");

        group.MapPost("/", async (
            CreatePlanRequest req,
            HttpRequest httpRequest,
            ClaimsPrincipal principal,
            IUnitOfWork uow,
            CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var houseMembership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (houseMembership is null)
                return Results.NotFound("You need to join or create a house before managing plans.");

            var localDateError = TryGetLocalDate(httpRequest, out var localDate);
            if (localDateError is not null)
                return localDateError;

            var dateRangeError = ValidatePlanDateRange(req.StartDate, req.EndDate, localDate);
            if (dateRangeError is not null)
                return dateRangeError;

            var hasOverlap = await uow.MealPlans.HasOverlappingRangeAsync(
                houseMembership.HouseId,
                req.StartDate,
                req.EndDate,
                ct: ct);
            if (hasOverlap)
                return Results.Conflict("Another plan already exists for the selected date range.");

            var flattenResult = FlattenDays(req.StartDate, req.EndDate, req.Days);
            if (flattenResult.Error is not null)
                return flattenResult.Error;

            var recipesValidationError = await ValidateRecipesBelongToHouseAsync(
                flattenResult.Assignments.Select(item => item.RecipeId).Distinct(),
                houseMembership.HouseId,
                uow,
                ct);
            if (recipesValidationError is not null)
                return recipesValidationError;

            var plan = MealPlan.Create(null, req.StartDate, req.EndDate, houseMembership.HouseId, actorUserId);
            await uow.MealPlans.AddAsync(plan, ct);

            foreach (var item in flattenResult.Assignments)
            {
                plan.MealPlanRecipes.Add(MealPlanRecipe.Create(
                    plan.Id,
                    item.RecipeId,
                    item.Date,
                    item.CategoryType,
                    item.SortOrder));
            }

            await uow.SaveChangesAsync(ct);
            var createdPlan = await uow.MealPlans.GetWithRecipesAsync(plan.Id, ct) ?? plan;

            return Results.Created($"/api/plans/{plan.Id}", ToDetailsResponse(createdPlan));
        })
        .WithName("CreatePlan")
        .WithSummary("Create a meal plan");

        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdatePlanRequest req,
            HttpRequest httpRequest,
            ClaimsPrincipal principal,
            IUnitOfWork uow,
            CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var plan = await uow.MealPlans.GetWithRecipesAsync(id, ct);
            if (plan is null)
                return Results.NotFound();

            if (!await uow.HouseMembers.IsMemberAsync(plan.HouseId, actorUserId, ct))
                return Results.Forbid();

            var localDateError = TryGetLocalDate(httpRequest, out var localDate);
            if (localDateError is not null)
                return localDateError;

            if (req.StartDate != plan.StartDate || req.EndDate != plan.EndDate)
                return Results.BadRequest("Start date and end date are immutable.");

            var dateRangeError = ValidatePlanDateRange(req.StartDate, req.EndDate, localDate);
            if (dateRangeError is not null)
                return dateRangeError;

            var hasOverlap = await uow.MealPlans.HasOverlappingRangeAsync(
                plan.HouseId,
                req.StartDate,
                req.EndDate,
                excludedMealPlanId: plan.Id,
                ct: ct);
            if (hasOverlap)
                return Results.Conflict("Another plan already exists for the selected date range.");

            var flattenResult = FlattenDays(req.StartDate, req.EndDate, req.Days);
            if (flattenResult.Error is not null)
                return flattenResult.Error;

            var recipesValidationError = await ValidateRecipesBelongToHouseAsync(
                flattenResult.Assignments.Select(item => item.RecipeId).Distinct(),
                plan.HouseId,
                uow,
                ct);
            if (recipesValidationError is not null)
                return recipesValidationError;

            uow.MealPlans.RemoveRecipes(plan.MealPlanRecipes.ToList());

            var newRecipes = flattenResult.Assignments
                .Select(item => MealPlanRecipe.Create(plan.Id, item.RecipeId, item.Date, item.CategoryType, item.SortOrder))
                .ToList();
            uow.MealPlans.AddRecipes(newRecipes);

            await uow.SaveChangesAsync(ct);
            var updatedPlan = await uow.MealPlans.GetWithRecipesAsync(plan.Id, ct) ?? plan;
            return Results.Ok(ToDetailsResponse(updatedPlan));
        })
        .WithName("UpdatePlan")
        .WithSummary("Update a meal plan");

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
    }

    private static IResult? TryGetLocalDate(HttpRequest request, out DateOnly localDate)
    {
        localDate = default;

        if (!request.Headers.TryGetValue(LocalDateHeaderName, out var values))
            return Results.BadRequest($"{LocalDateHeaderName} header is required.");

        var value = values.ToString();
        if (string.IsNullOrWhiteSpace(value))
            return Results.BadRequest($"{LocalDateHeaderName} header is required.");

        if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out localDate))
            return Results.BadRequest($"{LocalDateHeaderName} must be in format yyyy-MM-dd.");

        return null;
    }

    private static IResult? ValidatePlanDateRange(DateOnly startDate, DateOnly endDate, DateOnly localDate)
    {
        if (startDate < localDate)
            return Results.BadRequest("Start date must be on or after today.");

        if (endDate < startDate)
            return Results.BadRequest("End date must be on or after the start date.");

        if (endDate.DayNumber - startDate.DayNumber > 6)
            return Results.BadRequest("Plan range cannot exceed 7 days.");

        return null;
    }

    private static async Task<IResult?> ValidateRecipesBelongToHouseAsync(
        IEnumerable<Guid> recipeIds,
        Guid houseId,
        IUnitOfWork uow,
        CancellationToken ct)
    {
        foreach (var recipeId in recipeIds)
        {
            var recipe = await uow.Recipes.GetByIdAsync(recipeId, ct);
            if (recipe is null)
                return Results.NotFound($"Recipe '{recipeId}' not found.");

            if (!await uow.HouseMembers.IsMemberAsync(houseId, recipe.AuthorId, ct))
                return Results.BadRequest("Only recipes from the current house can be added to a plan.");
        }

        return null;
    }

    private static (List<FlattenedAssignment> Assignments, IResult? Error) FlattenDays(
        DateOnly startDate,
        DateOnly endDate,
        List<PlanDayRequest> days)
    {
        var expectedDates = GetDateRange(startDate, endDate).ToList();
        var expectedDateSet = expectedDates.ToHashSet();
        var seenDates = new HashSet<DateOnly>();
        var assignments = new List<FlattenedAssignment>();

        if (days.Count != expectedDates.Count)
            return ([], Results.BadRequest("Days payload must include each date from startDate to endDate exactly once."));

        foreach (var day in days)
        {
            if (!expectedDateSet.Contains(day.Date))
                return ([], Results.BadRequest("All day dates must be inside the plan date range."));

            if (!seenDates.Add(day.Date))
                return ([], Results.BadRequest("Duplicate day date detected in payload."));

            foreach (var categoryType in CategoryTypes)
            {
                if (!day.Categories.TryGetValue(categoryType, out var recipeIds))
                    return ([], Results.BadRequest("Each day must include all fixed categories."));

                if (recipeIds is null)
                    return ([], Results.BadRequest("Category recipe arrays cannot be null."));

                for (var index = 0; index < recipeIds.Count; index++)
                {
                    var recipeId = recipeIds[index];
                    if (recipeId == Guid.Empty)
                        return ([], Results.BadRequest("Recipe ids must be valid GUID values."));

                    assignments.Add(new FlattenedAssignment(day.Date, categoryType, index, recipeId));
                }
            }
        }

        if (assignments.Count == 0)
            return ([], Results.BadRequest("Plan must include at least one recipe."));

        return (assignments, null);
    }

    private static IEnumerable<DateOnly> GetDateRange(DateOnly startDate, DateOnly endDate)
    {
        for (var current = startDate; current <= endDate; current = current.AddDays(1))
        {
            yield return current;
        }
    }

    private static PlanListResponse ToListResponse(MealPlan plan) =>
        new(
            plan.Id,
            plan.StartDate,
            plan.EndDate,
            plan.CreatedAt,
            plan.UpdatedAt);

    private static PlanDetailsResponse ToDetailsResponse(MealPlan plan)
    {
        var days = new List<PlanDayResponse>();

        foreach (var date in GetDateRange(plan.StartDate, plan.EndDate))
        {
            var categories = new Dictionary<CategoryType, List<Guid>>();

            foreach (var categoryType in CategoryTypes)
            {
                categories[categoryType] = plan.MealPlanRecipes
                    .Where(item => item.PlannedDate == date && item.CategoryType == categoryType)
                    .OrderBy(item => item.SortOrder)
                    .Select(item => item.RecipeId)
                    .ToList();
            }

            days.Add(new PlanDayResponse(date, categories));
        }

        return new PlanDetailsResponse(
            plan.Id,
            plan.StartDate,
            plan.EndDate,
            plan.CreatedAt,
            plan.UpdatedAt,
            days);
    }

    private sealed record FlattenedAssignment(
        DateOnly Date,
        CategoryType CategoryType,
        int SortOrder,
        Guid RecipeId
    );
}
