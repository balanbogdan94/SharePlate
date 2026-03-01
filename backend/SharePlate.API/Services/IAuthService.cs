using SharePlate.Core.Entities;

namespace SharePlate.API.Services;

public interface IAuthService
{
    Task<RegisterUserResult> RegisterAsync(string name, string email, string password, CancellationToken ct = default);
    Task<ValidateCredentialsResult> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default);
    Task<InitiatePasswordResetResult> InitiatePasswordResetAsync(string email, CancellationToken ct = default);
    Task<CompletePasswordResetResult> CompletePasswordResetAsync(string resetToken, string newPassword, CancellationToken ct = default);
}

public record RegisterUserResult(bool Succeeded, User? User, string? ErrorCode = null, string? ErrorMessage = null);
public record ValidateCredentialsResult(bool Succeeded, User? User, string? ErrorCode = null, string? ErrorMessage = null);
public record InitiatePasswordResetResult(bool Succeeded, string? ResetToken = null, DateTime? ExpiresAtUtc = null, string? ErrorCode = null, string? ErrorMessage = null);
public record CompletePasswordResetResult(bool Succeeded, string? ErrorCode = null, string? ErrorMessage = null);