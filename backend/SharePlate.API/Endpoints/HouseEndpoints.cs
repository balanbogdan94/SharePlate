using System.Security.Claims;
using SharePlate.API.Contracts.Houses;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Extensions.Security;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Endpoints;

public static class HouseEndpoints
{
    private const string MigrationRequiredError = "Legacy personal house migration is required. Choose keep or dissolve first.";

    public static void MapHouseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/houses").WithTags("Houses").RequireAuthorization();

        group.MapGet("/state", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var membership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            var pending = await uow.HouseJoinRequests.GetPendingForUserAsync(actorUserId, ct);
            var migrationRequired = RequiresMigration(membership);

            if (membership is not null)
            {
                return Results.Ok(new HouseStateResponse(
                    MembershipState: "Member",
                    MigrationRequired: migrationRequired,
                    IsOwner: membership.Role == HouseMemberRole.Owner,
                    House: ToResponse(membership.House),
                    PendingRequest: null));
            }

            if (pending is not null)
            {
                return Results.Ok(new HouseStateResponse(
                    MembershipState: "Pending",
                    MigrationRequired: false,
                    IsOwner: false,
                    House: null,
                    PendingRequest: new HouseStatePendingRequestResponse(
                        pending.Id,
                        pending.HouseId,
                        pending.House.Name,
                        pending.House.Code,
                        pending.CreatedAt)));
            }

            return Results.Ok(new HouseStateResponse(
                MembershipState: "None",
                MigrationRequired: false,
                IsOwner: false,
                House: null,
                PendingRequest: null));
        })
        .WithName("GetMyHouseState")
        .WithSummary("Get current user's house membership state");

        group.MapPost("/migration/keep", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var membership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (!RequiresMigration(membership))
                return Results.BadRequest("No personal-house migration is required.");

            membership!.House.MarkAsShared();
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToResponse(membership.House));
        })
        .WithName("KeepLegacyPersonalHouse")
        .WithSummary("Mark legacy personal house as shared and continue");

        group.MapPost("/migration/dissolve", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var membership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (!RequiresMigration(membership))
                return Results.BadRequest("No personal-house migration is required.");

            uow.Houses.Remove(membership!.House);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DissolveLegacyPersonalHouse")
        .WithSummary("Dissolve legacy personal house and return to no-house state");

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (!await uow.HouseMembers.IsMemberAsync(id, actorUserId, ct))
                return Results.Forbid();

            var house = await uow.Houses.GetByIdAsync(id, ct);
            return house is null ? Results.NotFound() : Results.Ok(ToResponse(house));
        })
        .WithName("GetHouseById")
        .WithSummary("Get a house by ID");

        group.MapGet("/{id:guid}/members", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

            var house = await uow.Houses.GetWithMembersAsync(id, ct);
            if (house is null) return Results.NotFound();

            var response = new HouseWithMembersResponse(
                house.Id,
                house.Name,
                house.Code,
                house.IsPersonal,
                house.HouseMembers
                    .OrderByDescending(m => m.Role == HouseMemberRole.Owner)
                    .ThenBy(m => m.User.Name)
                    .Select(m => new HouseMemberSummary(
                        m.UserId,
                        m.User.Name,
                        m.User.Email,
                        m.Role.ToString()
                    )).ToList()
            );

            return Results.Ok(response);
        })
        .WithName("GetHouseMembers")
        .WithSummary("Get all members in a house (owner only)");

        group.MapGet("/{id:guid}/join-requests", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

            var requests = await uow.HouseJoinRequests.GetPendingByHouseAsync(id, ct);
            return Results.Ok(requests.Select(ToPendingJoinRequestResponse).ToList());
        })
        .WithName("GetPendingHouseJoinRequests")
        .WithSummary("Get pending join requests for a house (owner only)");

        group.MapPost("/join", async (JoinHouseRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(userId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            var existingMembership = await uow.HouseMembers.GetCurrentForUserAsync(userId, ct);
            if (existingMembership is not null)
                return Results.Conflict("User already belongs to a house.");

            if (await uow.HouseJoinRequests.HasPendingForUserAsync(userId, ct))
                return Results.Conflict("User already has a pending join request.");

            var inviteCode = req.Code.Trim().ToUpperInvariant();
            var house = await uow.Houses.GetByCodeAsync(inviteCode, ct);
            if (house is null)
                return Results.NotFound("Invalid invite code.");

            if (house.IsPersonal)
                return Results.Conflict("This house is not accepting requests until legacy migration is completed by the owner.");

            var joinRequest = HouseJoinRequest.Create(house.Id, userId);
            await uow.HouseJoinRequests.AddAsync(joinRequest, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(new JoinHouseResponse(joinRequest.Id, joinRequest.Status.ToString(), house.Id, house.Name));
        })
        .WithName("JoinHouse")
        .WithSummary("Create a pending house join request using an invite code");

        group.MapDelete("/join-requests/{requestId:guid}", async (Guid requestId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var request = await uow.HouseJoinRequests.GetWithDetailsAsync(requestId, ct);
            if (request is null)
                return Results.NotFound();

            if (request.RequesterId != actorUserId)
                return Results.Forbid();

            if (request.Status != HouseJoinRequestStatus.Pending)
                return Results.Conflict("Join request is no longer pending.");

            uow.HouseJoinRequests.Remove(request);
            await uow.SaveChangesAsync(ct);
            return Results.NoContent();
        })
        .WithName("CancelJoinHouseRequest")
        .WithSummary("Cancel pending join request for the current user");

        group.MapPost("/{id:guid}/join-requests/{requestId:guid}/approve", async (Guid id, Guid requestId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

            var request = await uow.HouseJoinRequests.GetWithDetailsAsync(requestId, ct);
            if (request is null || request.HouseId != id)
                return Results.NotFound();

            if (request.Status != HouseJoinRequestStatus.Pending)
                return Results.Conflict("Join request is no longer pending.");

            if (await uow.HouseMembers.GetCurrentForUserAsync(request.RequesterId, ct) is not null)
                return Results.Conflict("Requester already belongs to a house.");

            request.Approve(actorUserId);
            await uow.HouseMembers.AddAsync(HouseMember.Create(id, request.RequesterId, HouseMemberRole.Member), ct);

            try
            {
                await uow.SaveChangesAsync(ct);
            }
            catch
            {
                return Results.Conflict("Requester already belongs to a house.");
            }

            return Results.Ok(ToPendingJoinRequestResponse(request));
        })
        .WithName("ApproveHouseJoinRequest")
        .WithSummary("Approve a pending house join request (owner only)");

        group.MapPost("/{id:guid}/join-requests/{requestId:guid}/reject", async (Guid id, Guid requestId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

            var request = await uow.HouseJoinRequests.GetWithDetailsAsync(requestId, ct);
            if (request is null || request.HouseId != id)
                return Results.NotFound();

            if (request.Status != HouseJoinRequestStatus.Pending)
                return Results.Conflict("Join request is no longer pending.");

            request.Reject(actorUserId);
            await uow.SaveChangesAsync(ct);

            return Results.Ok(ToPendingJoinRequestResponse(request));
        })
        .WithName("RejectHouseJoinRequest")
        .WithSummary("Reject a pending house join request (owner only)");

        group.MapDelete("/{id:guid}/members/{userId:guid}", async (Guid id, Guid userId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

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
        .WithSummary("Remove a member from a house (owner only)");

        group.MapPost("/leave", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            var membership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            if (membership is null)
                return Results.BadRequest("User is not a house member.");

            if (membership.Role == HouseMemberRole.Owner)
                return Results.BadRequest("Owner cannot leave the house.");

            uow.HouseMembers.Remove(membership);
            await uow.SaveChangesAsync(ct);
            return Results.NoContent();
        })
        .WithName("LeaveHouse")
        .WithSummary("Leave the current house (members only)");

        group.MapPut("/{id:guid}/name", async (Guid id, UpdateHouseNameRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

            var house = await uow.Houses.GetByIdAsync(id, ct);
            if (house is null)
                return Results.NotFound();

            house.Rename(req.Name);
            await uow.SaveChangesAsync(ct);
            return Results.Ok(ToResponse(house));
        })
        .WithName("RenameHouse")
        .WithSummary("Rename a house (owner only)");

        group.MapPost("/", async (CreateHouseRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct) is not null)
                return Results.Conflict("User already belongs to a house.");

            if (await uow.HouseJoinRequests.HasPendingForUserAsync(actorUserId, ct))
                return Results.Conflict("User already has a pending join request.");

            House house;
            var attempts = 0;
            do
            {
                attempts++;
                house = House.Create(req.Name, actorUserId);
            }
            while (attempts < 5 && await uow.Houses.CodeExistsAsync(house.Code, ct));

            await uow.Houses.AddAsync(house, ct);
            await uow.SaveChangesAsync(ct);

            return Results.Created($"/api/houses/{house.Id}", ToResponse(house));
        })
        .WithName("CreateHouse")
        .WithSummary("Create a new shared house");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var migrationError = await EnsureMigrationResolvedAsync(actorUserId, uow, ct);
            if (migrationError is not null)
                return migrationError;

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

            var house = await uow.Houses.GetByIdAsync(id, ct);
            if (house is null) return Results.NotFound();

            uow.Houses.Remove(house);
            await uow.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeleteHouse")
        .WithSummary("Dissolve a house (owner only)");
    }

    private static async Task<IResult?> EnsureMigrationResolvedAsync(Guid userId, IUnitOfWork uow, CancellationToken ct)
    {
        var membership = await uow.HouseMembers.GetCurrentForUserAsync(userId, ct);
        return RequiresMigration(membership)
            ? Results.Conflict(MigrationRequiredError)
            : null;
    }

    private static bool RequiresMigration(HouseMember? membership)
        => membership is not null
           && membership.Role == HouseMemberRole.Owner
           && membership.House.IsPersonal;

    private static HouseResponse ToResponse(House h) =>
        new(h.Id, h.Name, h.Code, h.IsPersonal, h.CreatedAt, h.UpdatedAt);

    private static PendingHouseJoinRequestResponse ToPendingJoinRequestResponse(HouseJoinRequest r) =>
        new(
            r.Id,
            r.RequesterId,
            r.Requester.Name,
            r.Requester.Email,
            r.Status.ToString(),
            r.CreatedAt);
}
