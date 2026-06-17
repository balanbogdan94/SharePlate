using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace SharePlate.API.Contracts.Users;

public record CreateUserRequest(string Name, string Email, string Password);
public record UpdateUserNameRequest(string Name);
public record UserResponse(Guid Id, string Name, string Email, string ProfilePictureUrl, DateTime CreatedAt, DateTime UpdatedAt);

public sealed class UpdateProfilePictureRequest
{
    [FromForm]
    public bool RemovePhoto { get; init; }

    public IFormFile? Photo { get; init; }
}
