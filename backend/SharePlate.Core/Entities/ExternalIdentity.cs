namespace SharePlate.Core.Entities;

public sealed class ExternalIdentity : BaseEntity
{
    private ExternalIdentity() { }

    public static ExternalIdentity Create(
        Guid userId,
        string issuer,
        string subject,
        string provider)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(issuer);
        ArgumentException.ThrowIfNullOrWhiteSpace(subject);
        ArgumentException.ThrowIfNullOrWhiteSpace(provider);

        var now = DateTime.UtcNow;

        return new ExternalIdentity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Issuer = issuer,
            Subject = subject,
            Provider = provider,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    public Guid UserId { get; private set; }
    public string Issuer { get; private set; } = string.Empty;
    public string Subject { get; private set; } = string.Empty;
    public string Provider { get; private set; } = string.Empty;
    public User User { get; private set; } = null!;
}