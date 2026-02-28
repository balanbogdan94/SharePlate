namespace SharePlate.API.Services;

public interface IPasswordHashingService
{
    PasswordHashResult HashPassword(string userKey, string password);
    PasswordVerificationOutcome VerifyPassword(string userKey, string storedHash, string algorithm, string password);
}

public record PasswordHashResult(string Hash, string Algorithm);

public enum PasswordVerificationStatus
{
    Verified,
    Invalid,
    ResetRequired
}

public record PasswordVerificationOutcome(
    PasswordVerificationStatus Status,
    bool RequiresRehash = false,
    PasswordHashResult? RehashResult = null);