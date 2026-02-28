using System.Security.Claims;
using SharePlate.Core.Constants.Auth;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class HouseEndpoints
{
    public static void MapHouseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/houses").WithTags("Houses").RequireAuthorization();

        // GET /api/houses
        group.MapGet("/", async (IUnitOfWork uow, CancellationToken ct) =>
        {
            var houses = await uow.Houses.GetAllAsync(ct);
            return Results.Ok(houses.Select(ToResponse));
        })
        .WithName("GetAllHouses")
        .WithSummary("Get all houses");

        // GET /api/houses/{id}
        group.MapGet("/{id:guid}", async (Guid id, IUnitOfWork uow, CancellationToken ct) =>
        {
            var house = await uow.Houses.GetByIdAsync(id, ct);
            return house is null ? Results.NotFound() : Results.Ok(ToResponse(house));
        })
        .WithName("GetHouseById")
        .WithSummary("Get a house by ID");

        // GET /api/houses/{id}/members
        group.MapGet("/{id:guid}/members", async (Guid id, IUnitOfWork uow, CancellationToken ct) =>
        {
            var house = await uow.Houses.GetWithMembersAsync(id, ct);
            if (house is null) return Results.NotFound();

            var response = new HouseWithMembersResponse(
                house.Id,
                house.Name,
                house.Code,
                house.IsPersonal,
                house.HouseMembers.Select(m => new HouseMemberSummary(
                    m.UserId,
                    m.User.Name,
                    m.User.Email,
                    m.Role.ToString()
                )).ToList()
            );

            return Results.Ok(response);
        })
        .WithName("GetHouseWithMembers")
        .WithSummary("Get a house including all members");



        // POST /api/houses/join
        group.MapPost("/join", async (JoinHouseRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            var actorUserId = ResolveActorUserId(principal, req.UserId);
            if (actorUserId is null)
                return Results.BadRequest("User id is required in token claims or request body.");

            var house = await uow.Houses.GetByCodeAsync(req.Code, ct);
            if (house is null) return Results.NotFound("Invalid invite code.");

            var user = await uow.Users.GetByIdAsync(actorUserId.Value, ct);
            if (user is null) return Results.NotFound("User not found.");

            if (await uow.HouseMembers.IsMemberAsync(house.Id, actorUserId.Value, ct))
                return Results.Conflict("User is already a member of this house.");

            await uow.HouseMembers.AddAsync(HouseMember.Create(house.Id, actorUserId.Value, HouseMemberRole.Member), ct);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(new { house.Id, house.Name });
        })
        .WithName("JoinHouse")
        .WithSummary("Join a house using its invite code");

        // DELETE /api/houses/{id}/members/{userId}
        group.MapDelete("/{id:guid}/members/{userId:guid}", async (Guid id, Guid userId, IUnitOfWork uow, CancellationToken ct) =>
        {
            var house = await uow.Houses.GetWithMembersAsync(id, ct);
            if (house is null) return Results.NotFound();

            try
            {
                house.RemoveMember(userId);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(ex.Message);
            }

            await uow.SaveChangesAsync(ct);
            return Results.NoContent();
        })
        .WithName("RemoveHouseMember")
        .WithSummary("Remove a member from a house");

        // POST /api/houses
        group.MapPost("/", async (CreateHouseRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            var actorUserId = ResolveActorUserId(principal, req.UserId);
            if (actorUserId is null)
                return Results.BadRequest("User id is required in token claims or request body.");

            var user = await uow.Users.GetByIdAsync(actorUserId.Value, ct);
            if (user is null) return Results.NotFound("User not found.");

            var house = House.Create(req.Name, actorUserId.Value);

            await uow.Houses.AddAsync(house, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Created($"/api/houses/{house.Id}", ToResponse(house));
        })
        .WithName("CreateHouse")
        .WithSummary("Create a new house");

        // DELETE /api/houses/{id}
        group.MapDelete("/{id:guid}", async (Guid id, IUnitOfWork uow, CancellationToken ct) =>
        {
            var house = await uow.Houses.GetByIdAsync(id, ct);
            if (house is null) return Results.NotFound();

            uow.Houses.Remove(house);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeleteHouse")
        .WithSummary("Delete a house");
    }

    private static HouseResponse ToResponse(House h) =>
        new(h.Id, h.Name, h.Code, h.IsPersonal, h.CreatedAt, h.UpdatedAt);

    private static Guid? ResolveActorUserId(ClaimsPrincipal principal, Guid? requestUserId)
    {
        var claimValue = principal.FindFirstValue(AuthClaimTypes.UserId)
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal.FindFirstValue("sub");

        if (Guid.TryParse(claimValue, out var claimUserId))
            return claimUserId;

        if (requestUserId is { } value && value != Guid.Empty)
            return value;

        return null;
    }
}

// ── Request / Response records ────────────────────────────────────────────────

public record CreateHouseRequest(string Name, Guid UserId);
public record JoinHouseRequest(string Code, Guid UserId);
public record HouseResponse(Guid Id, string Name, string Code, bool IsPersonal, DateTime CreatedAt, DateTime UpdatedAt);
public record HouseWithMembersResponse(Guid Id, string Name, string Code, bool IsPersonal, List<HouseMemberSummary> Members);
public record HouseMemberSummary(Guid UserId, string Name, string Email, string Role);
