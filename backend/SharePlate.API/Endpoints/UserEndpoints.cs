using System.Security.Cryptography;
using System.Text;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

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
        group.MapPost("/", async (CreateUserRequest req, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (await uow.Users.EmailExistsAsync(req.Email, ct))
                return Results.Conflict($"Email '{req.Email}' is already in use.");

            // NOTE: For testing only – use a proper password hasher in production.
            var passwordHash = HashPassword(req.Password);
            var user = User.Create(req.Name, req.Email, passwordHash);

            await uow.Users.AddAsync(user, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Created($"/api/users/{user.Id}", ToResponse(user));
        })
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

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }
}

// ── Request / Response records ────────────────────────────────────────────────

public record CreateUserRequest(string Name, string Email, string Password);
public record UpdateUserNameRequest(string Name);
public record UserResponse(Guid Id, string Name, string Email, DateTime CreatedAt, DateTime UpdatedAt);
