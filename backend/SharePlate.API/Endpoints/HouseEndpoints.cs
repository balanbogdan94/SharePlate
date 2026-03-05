using System.Security.Claims;
using SharePlate.API.Contracts.Houses;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class HouseEndpoints
{
    public static void MapHouseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/houses").WithTags("Houses").RequireAuthorization();

        // GET /api/houses/{id}
        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            if (!await uow.HouseMembers.IsMemberAsync(id, actorUserId, ct))
                return Results.Forbid();

            var house = await uow.Houses.GetByIdAsync(id, ct);
            return house is null ? Results.NotFound() : Results.Ok(ToResponse(house));
        })
        .WithName("GetHouseById")
        .WithSummary("Get a house by ID");




        // GET /api/houses/{id}/members
        group.MapGet("/{id:guid}/members", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            if (!await uow.HouseMembers.IsMemberAsync(id, actorUserId, ct))
                return Results.Forbid();

            var house = await uow.Houses.GetWithMembersAsync(id, ct);
            if (house is null) return Results.NotFound();

            var response = new HouseWithMembersResponse(
                house.Id,
                house.Name,
                house.Code,
                house.IsPersonal,
                house.HouseMembers.Select(m => new HouseMemberSummary(
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
            if (!principal.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var house = await uow.Houses.GetByCodeAsync(req.Code, ct);
            if (house is null) return Results.NotFound("Invalid invite code.");

            var user = await uow.Users.GetByIdAsync(userId, ct);
            if (user is null) return Results.NotFound("User not found.");

            if (await uow.HouseMembers.IsMemberAsync(house.Id, userId, ct))
                return Results.Conflict("User is already a member of this house.");

            await uow.HouseMembers.AddAsync(HouseMember.Create(house.Id, userId, HouseMemberRole.Member), ct);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(new { house.Id, house.Name });
        })
        .WithName("JoinHouse")
        .WithSummary("Join a house using its invite code");




        // DELETE /api/houses/{id}/members/{userId}
        group.MapDelete("/{id:guid}/members/{userId:guid}", async (Guid id, Guid userId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

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
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var user = await uow.Users.GetByIdAsync(actorUserId, ct);
            if (user is null) return Results.NotFound("User not found.");

            var house = House.Create(req.Name, actorUserId);

            await uow.Houses.AddAsync(house, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Created($"/api/houses/{house.Id}", ToResponse(house));
        })
        .WithName("CreateHouse")
        .WithSummary("Create a new house");




        // DELETE /api/houses/{id}
        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

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
}
