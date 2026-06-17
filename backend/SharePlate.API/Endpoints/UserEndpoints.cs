using System.Security.Claims;
using SharePlate.API.Contracts.Users;
using SharePlate.Core.Entities;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;
using SharePlate.Core.Services;

namespace SharePlate.API.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users").RequireAuthorization();



        // GET /api/users/me
        group.MapGet("/me", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var user = await uow.Users.GetByIdAsync(actorUserId, ct);
            return user is null ? Results.NotFound() : Results.Ok(ToUserResponse(user));
        })
        .WithName("GetCurrentUser")
        .WithSummary("Get the currently authenticated user");



        // PUT /api/users/me/avatar
        group.MapPut("/me/avatar", async ([AsParameters] UpdateProfilePictureRequest req, ClaimsPrincipal principal, IUnitOfWork uow, IStorageService storage, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var user = await uow.Users.GetByIdAsync(actorUserId, ct);
            if (user is null) return Results.NotFound();

            if (req.RemovePhoto)
            {
                await storage.DeleteImageAsync(user.ProfilePictureUrl, ct);
                user.UpdateProfilePictureUrl("");
            }
            else if (req.Photo is not null)
            {
                if (!IsValidImage(req.Photo))
                    return Results.BadRequest("Image must be jpeg, png, or webp and under 5 MB.");
                await storage.DeleteImageAsync(user.ProfilePictureUrl, ct);
                var url = await storage.UploadImageAsync(req.Photo.OpenReadStream(), req.Photo.FileName, req.Photo.ContentType, ct);
                user.UpdateProfilePictureUrl(url);
            }
            else
            {
                return Results.BadRequest("Provide a photo to upload or set removePhoto to true.");
            }

            await uow.SaveChangesAsync(ct);
            return Results.Ok(ToUserResponse(user));
        })
        .WithName("UpdateProfilePicture")
        .WithSummary("Update or remove the current user's profile picture")
        .DisableAntiforgery();



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
        new(user.Id, user.Name, user.Email, user.ProfilePictureUrl, user.CreatedAt, user.UpdatedAt);

    private static readonly string[] AllowedImageContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxImageSizeBytes = 5 * 1024 * 1024; // 5 MB

    private static bool IsValidImage(IFormFile file) =>
        AllowedImageContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase)
        && file.Length is > 0 and <= MaxImageSizeBytes;
}
