namespace SharePlate.API.Contracts.Users;

public record CreateUserRequest(string Name, string Email, string Password);
public record UpdateUserNameRequest(string Name);
public record UserResponse(Guid Id, string Name, string Email, DateTime CreatedAt, DateTime UpdatedAt);
