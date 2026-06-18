namespace SharePlate.API.Contracts.Houses;

public record UpdateHouseNameRequest(string Name);
public record JoinHouseRequest(string Code);
public record HouseResponse(Guid Id, string Name, string Code, bool IsPersonal, DateTime CreatedAt, DateTime UpdatedAt);
public record HouseWithMembersResponse(Guid Id, string Name, string Code, bool IsPersonal, List<HouseMemberSummary> Members);
public record HouseMemberSummary(Guid UserId, string Name, string Email, string ProfilePictureUrl, string Role);
public record PendingHouseJoinRequestResponse(Guid Id, Guid RequesterId, string RequesterName, string RequesterEmail, string RequesterProfilePictureUrl, string Status, DateTime CreatedAt);
public record JoinHouseResponse(Guid RequestId, string Status, Guid HouseId, string HouseName);
public record HouseStatePendingRequestResponse(Guid RequestId, Guid HouseId, string HouseName, string HouseCode, DateTime CreatedAt);
public record HouseStateResponse(
    string MembershipState,
    bool IsOwner,
    bool CanLeave,
    HouseResponse? House,
    HouseStatePendingRequestResponse? PendingRequest);
