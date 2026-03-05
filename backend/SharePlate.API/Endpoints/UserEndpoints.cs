using System.Security.Claims;
using SharePlate.API.Contracts.Users;
using SharePlate.Core.Entities;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users").RequireAuthorization();



        // GET /api/users/{id}
        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            if (actorUserId != id)
                return Results.Forbid();

            var user = await uow.Users.GetByIdAsync(id, ct);
            return user is null ? Results.NotFound() : Results.Ok(ToUserResponse(user));
        })
        .WithName("GetUserById")
        .WithSummary("Get a user by ID");




        // GET /api/users/by-email/{email}
        group.MapGet("/by-email/{email}", async (string email, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var actor = await uow.Users.GetByIdAsync(actorUserId, ct);
            if (actor is null)
                return Results.Unauthorized();

            if (!string.Equals(actor.Email, email, StringComparison.OrdinalIgnoreCase))
                return Results.Forbid();

            var user = await uow.Users.GetByEmailAsync(actor.Email, ct);
            return user is null ? Results.NotFound() : Results.Ok(ToUserResponse(user));
        })
        .WithName("GetUserByEmail")
        .WithSummary("Get a user by email address");



        // PUT /api/users/{id}/name
        group.MapPut("/{id:guid}/name", async (Guid id, UpdateUserNameRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            if (actorUserId != id)
                return Results.Forbid();

            var user = await uow.Users.GetByIdAsync(id, ct);
            if (user is null) return Results.NotFound();

            user.UpdateName(req.Name);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToUserResponse(user));
        })
        .WithName("UpdateUserName")
        .WithSummary("Update a user's name");




        // DELETE /api/users/{id}
        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            if (actorUserId != id)
                return Results.Forbid();

            var user = await uow.Users.GetByIdAsync(id, ct);
            if (user is null) return Results.NotFound();

            uow.Users.Remove(user);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeleteUser")
        .WithSummary("Delete a user");
    }


    private static UserResponse ToUserResponse(Core.Entities.User user) =>
        new(user.Id, user.Name, user.Email, user.CreatedAt, user.UpdatedAt);
}
