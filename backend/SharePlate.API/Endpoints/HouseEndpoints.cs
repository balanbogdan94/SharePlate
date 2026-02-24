using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class HouseEndpoints
{
    public static void MapHouseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/houses").WithTags("Houses");

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

        // GET /api/houses/by-code/{code}
        group.MapGet("/by-code/{code}", async (string code, IUnitOfWork uow, CancellationToken ct) =>
        {
            var house = await uow.Houses.GetByCodeAsync(code, ct);
            return house is null ? Results.NotFound() : Results.Ok(ToResponse(house));
        })
        .WithName("GetHouseByCode")
        .WithSummary("Get a house by its invite code");

        // POST /api/houses
        group.MapPost("/", async (CreateHouseRequest req, IUnitOfWork uow, CancellationToken ct) =>
        {
            var userId = Guid.CreateVersion7(); //TODO: Replace with actual user ID from auth context
            if (await uow.Houses.CodeExistsAsync(req.Code, ct))
                return Results.Conflict($"House code '{req.Code}' is already taken.");

            var house = House.Create(req.Name, userId);

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
}

// ── Request / Response records ────────────────────────────────────────────────

public record CreateHouseRequest(string Name, string Code);
public record HouseResponse(Guid Id, string Name, string Code, bool IsPersonal, DateTime CreatedAt, DateTime UpdatedAt);
public record HouseWithMembersResponse(Guid Id, string Name, string Code, bool IsPersonal, List<HouseMemberSummary> Members);
public record HouseMemberSummary(Guid UserId, string Name, string Email, string Role);
