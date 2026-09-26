using System.Security.Claims;
using SharePlate.API.Contracts.Users;
using SharePlate.API.Security;
using SharePlate.Core.Entities;

namespace SharePlate.API.Endpoints;

public static class SessionEndpoints
{
    public static void MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/session/provision", async (
            ClaimsPrincipal principal,
            UserProvisioningService provisioningService,
            CancellationToken ct) =>
        {
            if (!EntraClaims.TryGetProfile(principal, out var profile))
            {
                return Results.UnprocessableEntity(new SessionErrorResponse(
                    "identity_claims_incomplete",
                    "The Entra token must contain issuer, object ID, and email claims."));
            }

            var result = await provisioningService.ProvisionAsync(profile, ct);
            if (result.HasEmailConflict)
            {
                return Results.Conflict(new SessionErrorResponse(
                    "email_already_in_use",
                    "The email is already associated with another SharePlate user."));
            }

            return Results.Ok(ToUserResponse(result.User!));
        })
        .RequireAuthorization(AuthPolicies.ApiAccess)
        .WithName("ProvisionCurrentUser")
        .WithSummary("Provision the current Entra identity in SharePlate");
    }

    private static UserResponse ToUserResponse(User user) =>
        new(user.Id, user.Name, user.Email, user.ProfilePictureUrl, user.CreatedAt, user.UpdatedAt);
}

public sealed record SessionErrorResponse(string Code, string Message);