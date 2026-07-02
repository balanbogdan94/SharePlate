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
        var group = app.MapGroup("/houses").WithTags("Houses").RequireAuthorization();

        group.MapGet("/state", async (ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

            var membership = await uow.HouseMembers.GetCurrentForUserAsync(actorUserId, ct);
            var pending = await uow.HouseJoinRequests.GetPendingForUserAsync(actorUserId, ct);

            var pendingResponse = pending is null
                ? null
                : new HouseStatePendingRequestResponse(
                    pending.Id,
                    pending.HouseId,
                    pending.House.Name,
                    pending.House.Code,
                    pending.CreatedAt);

            if (membership is null)
            {
                // Defensive: every user should own a house, but fall back gracefully.
                return Results.Ok(new HouseStateResponse(
                    MembershipState: "None",
                    IsOwner: false,
                    CanLeave: false,
                    House: null,
                    PendingRequest: pendingResponse));
            }

            var isOwner = membership.Role == HouseMemberRole.Owner;

            return Results.Ok(new HouseStateResponse(
                MembershipState: isOwner ? "Owner" : "Member",
                IsOwner: isOwner,
                CanLeave: !isOwner,
                House: ToResponse(membership.House),
                PendingRequest: pendingResponse));
        })
        .WithName("GetMyHouseState")
        .WithSummary("Get current user's house membership state");

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

        group.MapGet("/{id:guid}/members", async (Guid id, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

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
                        m.User.ProfilePictureUrl,
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

            if (await uow.HouseMembers.GetGuestMembershipForUserAsync(userId, ct) is not null)
                return Results.Conflict("You already belong to another house. Leave it before joining a new one.");

            if (await uow.HouseJoinRequests.HasPendingForUserAsync(userId, ct))
                return Results.Conflict("You already have a pending join request.");

            var inviteCode = req.Code.Trim().ToUpperInvariant();
            var house = await uow.Houses.GetByCodeAsync(inviteCode, ct);
            if (house is null)
                return Results.NotFound("Invalid invite code.");

            if (house.OwnerId == userId)
                return Results.Conflict("You cannot join your own house.");

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

            if (!await uow.HouseMembers.IsOwnerAsync(id, actorUserId, ct))
                return Results.Forbid();

            var request = await uow.HouseJoinRequests.GetWithDetailsAsync(requestId, ct);
            if (request is null || request.HouseId != id)
                return Results.NotFound();

            if (request.Status != HouseJoinRequestStatus.Pending)
                return Results.Conflict("Join request is no longer pending.");

            if (await uow.HouseMembers.GetGuestMembershipForUserAsync(request.RequesterId, ct) is not null)
                return Results.Conflict("Requester already belongs to another house.");

            request.Approve(actorUserId);
            await uow.HouseMembers.AddAsync(HouseMember.Create(id, request.RequesterId, HouseMemberRole.Member), ct);

            try
            {
                await uow.SaveChangesAsync(ct);
            }
            catch
            {
                return Results.Conflict("Requester already belongs to another house.");
            }

            return Results.Ok(ToPendingJoinRequestResponse(request));
        })
        .WithName("ApproveHouseJoinRequest")
        .WithSummary("Approve a pending house join request (owner only)");

        group.MapPost("/{id:guid}/join-requests/{requestId:guid}/reject", async (Guid id, Guid requestId, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

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

            var guestMembership = await uow.HouseMembers.GetGuestMembershipForUserAsync(actorUserId, ct);
            if (guestMembership is null)
                return Results.BadRequest("You are not a guest in any house.");

            uow.HouseMembers.Remove(guestMembership);
            await uow.SaveChangesAsync(ct);
            return Results.NoContent();
        })
        .WithName("LeaveHouse")
        .WithSummary("Leave the joined house and return to your own house");

        group.MapPut("/{id:guid}/name", async (Guid id, UpdateHouseNameRequest req, ClaimsPrincipal principal, IUnitOfWork uow, CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var actorUserId))
                return Results.Unauthorized();

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
    }

    private static HouseResponse ToResponse(House h) =>
        new(h.Id, h.Name, h.Code, h.IsPersonal, h.CreatedAt, h.UpdatedAt);

    private static PendingHouseJoinRequestResponse ToPendingJoinRequestResponse(HouseJoinRequest r) =>
        new(
            r.Id,
            r.RequesterId,
            r.Requester.Name,
            r.Requester.Email,
            r.Requester.ProfilePictureUrl,
            r.Status.ToString(),
            r.CreatedAt);
}
