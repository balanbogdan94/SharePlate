using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.API.Services;

namespace SharePlate.API.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users").RequireAuthorization();

        // GET /api/users/{id}
        group.MapGet("/{id:guid}", async (Guid id, IUnitOfWork uow, CancellationToken ct) =>
        {
            var user = await uow.Users.GetByIdAsync(id, ct);
            return user is null ? Results.NotFound() : Results.Ok(ToResponse(user));
        })
        .WithName("GetUserById")
        .WithSummary("Get a user by ID");

        // GET /api/users/by-email/{email}
        group.MapGet("/by-email/{email}", async (string email, IUnitOfWork uow, CancellationToken ct) =>
        {
            var user = await uow.Users.GetByEmailAsync(email, ct);
            return user is null ? Results.NotFound() : Results.Ok(ToResponse(user));
        })
        .WithName("GetUserByEmail")
        .WithSummary("Get a user by email address");

        // GET /api/users
        group.MapGet("/", async (IUnitOfWork uow, CancellationToken ct) =>
        {
            var users = await uow.Users.GetAllAsync(ct);
            return Results.Ok(users.Select(ToResponse));
        })
        .WithName("GetAllUsers")
        .WithSummary("Get all users");

        // POST /api/users
        group.MapPost("/", async (CreateUserRequest req, IAuthService authService, CancellationToken ct) =>
        {
            var registrationResult = await authService.RegisterAsync(req.Name, req.Email, req.Password, ct);
            if (!registrationResult.Succeeded)
                return Results.Conflict(registrationResult.ErrorMessage);

            var user = registrationResult.User!;

            return Results.Created($"/api/users/{user.Id}", ToResponse(user));
        })
        .AllowAnonymous()
        .WithName("CreateUser")
        .WithSummary("Create a new user");

        // PUT /api/users/{id}/name
        group.MapPut("/{id:guid}/name", async (Guid id, UpdateUserNameRequest req, IUnitOfWork uow, CancellationToken ct) =>
        {
            var user = await uow.Users.GetByIdAsync(id, ct);
            if (user is null) return Results.NotFound();

            user.UpdateName(req.Name);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToResponse(user));
        })
        .WithName("UpdateUserName")
        .WithSummary("Update a user's name");

        // DELETE /api/users/{id}
        group.MapDelete("/{id:guid}", async (Guid id, IUnitOfWork uow, CancellationToken ct) =>
        {
            var user = await uow.Users.GetByIdAsync(id, ct);
            if (user is null) return Results.NotFound();

            uow.Users.Remove(user);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeleteUser")
        .WithSummary("Delete a user");
    }

    private static UserResponse ToResponse(User u) =>
        new(u.Id, u.Name, u.Email, u.CreatedAt, u.UpdatedAt);
}

// ── Request / Response records ────────────────────────────────────────────────

public record CreateUserRequest(string Name, string Email, string Password);
public record UpdateUserNameRequest(string Name);
public record UserResponse(Guid Id, string Name, string Email, DateTime CreatedAt, DateTime UpdatedAt);
