using SharePlate.Core.Constants.Auth;
using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;

namespace SharePlate.API.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHashingService _passwordHashingService;

    public AuthService(IUnitOfWork uow, IPasswordHashingService passwordHashingService)
    {
        _uow = uow;
        _passwordHashingService = passwordHashingService;
    }

    public async Task<RegisterUserResult> RegisterAsync(string name, string email, string password, CancellationToken ct = default)
    {
        if (await _uow.Users.EmailExistsAsync(email, ct))
        {
            return new RegisterUserResult(
                false,
                null,
                AuthErrorCodes.InvalidCredentials,
                $"Email '{email}' is already in use.");
        }

        var passwordHash = _passwordHashingService.HashPassword(email, password);
        var user = User.Create(name, email, passwordHash.Hash, passwordHash.Algorithm);

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return new RegisterUserResult(true, user);
    }

    public async Task<ValidateCredentialsResult> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await _uow.Users.GetForAuthenticationByEmailAsync(email, ct);
        if (user is null)
        {
            return new ValidateCredentialsResult(false, null, AuthErrorCodes.InvalidCredentials, "Invalid email or password.");
        }

        if (user.IsPasswordResetRequired)
        {
            return new ValidateCredentialsResult(
                false,
                null,
                AuthErrorCodes.PasswordResetRequired,
                "Password reset is required for this account.");
        }

        var verificationOutcome = _passwordHashingService.VerifyPassword(
            user.Email,
            user.PasswordHash,
            user.PasswordHashAlgorithm,
            password);

        if (verificationOutcome.Status == PasswordVerificationStatus.ResetRequired)
        {
            return new ValidateCredentialsResult(
                false,
                null,
                AuthErrorCodes.PasswordResetRequired,
                "Password reset is required for this account.");
        }

        if (verificationOutcome.Status == PasswordVerificationStatus.Invalid)
        {
            return new ValidateCredentialsResult(false, null, AuthErrorCodes.InvalidCredentials, "Invalid email or password.");
        }

        if (verificationOutcome.RequiresRehash && verificationOutcome.RehashResult is not null)
        {
            user.SetPassword(
                verificationOutcome.RehashResult.Hash,
                verificationOutcome.RehashResult.Algorithm,
                false);
            await _uow.SaveChangesAsync(ct);
        }

        return new ValidateCredentialsResult(true, user);
    }
}