using SharePlate.Core.Entities;

namespace SharePlate.API.Services;

public interface IAuthService
{
    Task<RegisterUserResult> RegisterAsync(string name, string email, string password, CancellationToken ct = default);
    Task<ValidateCredentialsResult> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default);
}

public record RegisterUserResult(bool Succeeded, User? User, string? ErrorCode = null, string? ErrorMessage = null);
public record ValidateCredentialsResult(bool Succeeded, User? User, string? ErrorCode = null, string? ErrorMessage = null);