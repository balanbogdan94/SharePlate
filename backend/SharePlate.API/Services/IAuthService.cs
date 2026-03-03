using SharePlate.Core.Entities;

namespace SharePlate.API.Services;

public interface IAuthService
{
    Task<RegisterUserResult> RegisterAsync(string name, string email, string password, CancellationToken ct = default);
    Task<ValidateCredentialsResult> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default);
    Task<InitiatePasswordResetResult> InitiatePasswordResetAsync(string email, CancellationToken ct = default);
    Task<CompletePasswordResetResult> CompletePasswordResetAsync(string resetToken, string newPassword, CancellationToken ct = default);
}

public sealed record RegisterUserResult
{
    public bool Succeeded { get; }
    public Guid? UserId { get; }
    public string? ErrorCode { get; }
    public string? ErrorMessage { get; }

    private RegisterUserResult(bool succeeded, Guid? userId, string? errorCode, string? errorMessage)
    {
        Succeeded = succeeded;
        UserId = userId;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }

    public static RegisterUserResult Success(Guid userId) =>
        new(true, userId, null, null);

    public static RegisterUserResult Failure(string errorCode, string errorMessage) =>
        new(false, null, errorCode, errorMessage);
}
public record ValidateCredentialsResult(bool Succeeded, User? User, string? ErrorCode = null, string? ErrorMessage = null);
public record InitiatePasswordResetResult(bool Succeeded, string? ResetToken = null, DateTime? ExpiresAtUtc = null, string? ErrorCode = null, string? ErrorMessage = null);
public record CompletePasswordResetResult(bool Succeeded, string? ErrorCode = null, string? ErrorMessage = null);