using SharePlate.Core.Constants;

namespace SharePlate.Core.Entities;

public sealed class User : BaseEntity
{
    private User() { }

    public static User Create(
        string name,
        string email,
        string passwordHash,
        string passwordHashAlgorithm = PasswordHashAlgorithms.AspNetCorePbkdf2V3,
        bool isPasswordResetRequired = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHashAlgorithm);

        return new User
        {
            Id = Guid.NewGuid(),
            Name = name,
            Email = email,
            PasswordHash = passwordHash,
            PasswordHashAlgorithm = passwordHashAlgorithm,
            IsPasswordResetRequired = isPasswordResetRequired,
            PasswordUpdatedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string PasswordHashAlgorithm { get; private set; } = PasswordHashAlgorithms.AspNetCorePbkdf2V3;
    public bool IsPasswordResetRequired { get; private set; }
    public DateTime? PasswordUpdatedAt { get; private set; }

    public ICollection<HouseMember> HouseMembers { get; private set; } = new List<HouseMember>();
    public ICollection<RefreshToken> RefreshTokens { get; private set; } = new List<RefreshToken>();

    public void UpdateName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateEmail(string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        Email = email;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetPassword(string passwordHash, string algorithm, bool requiresReset)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(algorithm);

        PasswordHash = passwordHash;
        PasswordHashAlgorithm = algorithm;
        IsPasswordResetRequired = requiresReset;
        PasswordUpdatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RequirePasswordReset()
    {
        IsPasswordResetRequired = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
