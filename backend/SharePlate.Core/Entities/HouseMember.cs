using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class HouseMember : BaseEntity
{
    private HouseMember() { }

    public static HouseMember Create(Guid houseId, Guid userId, HouseMemberRole role)
    {
        return new HouseMember
        {
            Id = Guid.NewGuid(),
            HouseId = houseId,
            UserId = userId,
            Role = role,
            JoinedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public Guid HouseId { get; private set; }
    public House House { get; private set; } = null!;

    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;

    public HouseMemberRole Role { get; private set; }
    public DateTime JoinedAt { get; private set; }

    public void ChangeRole(HouseMemberRole role)
    {
        Role = role;
        UpdatedAt = DateTime.UtcNow;
    }
}
