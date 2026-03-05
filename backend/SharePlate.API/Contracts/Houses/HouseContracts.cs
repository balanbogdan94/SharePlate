namespace SharePlate.API.Contracts.Houses;

public record CreateHouseRequest(string Name);
public record JoinHouseRequest(string Code);
public record HouseResponse(Guid Id, string Name, string Code, bool IsPersonal, DateTime CreatedAt, DateTime UpdatedAt);
public record HouseWithMembersResponse(Guid Id, string Name, string Code, bool IsPersonal, List<HouseMemberSummary> Members);
public record HouseMemberSummary(string Name, string Email, string Role);
