using Microsoft.AspNetCore.Identity;
using SharePlate.Core.Constants;

namespace SharePlate.API.Services;

public class PasswordHashingService : IPasswordHashingService
{
    private static readonly string CurrentVersionPrefix = $"{PasswordHashAlgorithms.AspNetCorePbkdf2V3}$";
    private readonly IPasswordHasher<string> _passwordHasher;

    public PasswordHashingService(IPasswordHasher<string> passwordHasher)
    {
        _passwordHasher = passwordHasher;
    }

    public PasswordHashResult HashPassword(string userKey, string password)
    {
        var baseHash = _passwordHasher.HashPassword(userKey, password);
        return new PasswordHashResult($"{CurrentVersionPrefix}{baseHash}", PasswordHashAlgorithms.AspNetCorePbkdf2V3);
    }

    public PasswordVerificationOutcome VerifyPassword(string userKey, string storedHash, string algorithm, string password)
    {
        if (algorithm == PasswordHashAlgorithms.LegacySha256)
        {
            return new PasswordVerificationOutcome(PasswordVerificationStatus.ResetRequired);
        }

        if (algorithm != PasswordHashAlgorithms.AspNetCorePbkdf2V3)
        {
            return new PasswordVerificationOutcome(PasswordVerificationStatus.Invalid);
        }

        var usesCurrentVersionPrefix = storedHash.StartsWith(CurrentVersionPrefix, StringComparison.Ordinal);
        var hashToVerify = usesCurrentVersionPrefix
            ? storedHash[CurrentVersionPrefix.Length..]
            : storedHash;

        var verifyResult = _passwordHasher.VerifyHashedPassword(userKey, hashToVerify, password);

        if (verifyResult == PasswordVerificationResult.Failed)
        {
            return new PasswordVerificationOutcome(PasswordVerificationStatus.Invalid);
        }

        var requiresRehash = verifyResult == PasswordVerificationResult.SuccessRehashNeeded || !usesCurrentVersionPrefix;
        if (!requiresRehash)
        {
            return new PasswordVerificationOutcome(PasswordVerificationStatus.Verified);
        }

        var rehash = HashPassword(userKey, password);
        return new PasswordVerificationOutcome(PasswordVerificationStatus.Verified, true, rehash);
    }
}