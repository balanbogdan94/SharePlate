using SharePlate.API.Contracts.Units;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class UnitEndpoints
{
    public static void MapUnitEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/units").WithTags("Units");


        // GET /api/units
        group.MapGet("/", async (IUnitRepository units, CancellationToken ct) =>
        {
            var all = await units.GetAllAsync(ct);
            return Results.Ok(all.Select(ToResponse).ToList());
        })
        .WithName("GetUnits")
        .WithSummary("Get all available units");
    }


    private static UnitResponse ToResponse(Unit u) =>
        new(u.Id, u.Name, u.Symbol, u.Category.ToString());
}
