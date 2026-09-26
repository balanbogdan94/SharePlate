namespace SharePlate.Core.Entities;

public sealed class User : BaseEntity
{
    private User() { }

    public static User Create(
        string name,
        string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);

        var now = DateTime.UtcNow;

        return new User
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string ProfilePictureUrl { get; private set; } = string.Empty;

    public ICollection<HouseMember> HouseMembers { get; private set; } = new List<HouseMember>();
    public ICollection<HouseJoinRequest> RequestedHouseJoinRequests { get; private set; } = new List<HouseJoinRequest>();
    public ICollection<HouseJoinRequest> ReviewedHouseJoinRequests { get; private set; } = new List<HouseJoinRequest>();
    public ICollection<ExternalIdentity> ExternalIdentities { get; private set; } = new List<ExternalIdentity>();

    public void UpdateName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateEmail(string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        Email = email.Trim().ToLowerInvariant();
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateProfilePictureUrl(string profilePictureUrl)
    {
        ProfilePictureUrl = profilePictureUrl ?? string.Empty;
        UpdatedAt = DateTime.UtcNow;
    }

}
