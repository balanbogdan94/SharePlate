using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class HouseJoinRequest : BaseEntity
{
    private HouseJoinRequest() { }

    public static HouseJoinRequest Create(Guid houseId, Guid requesterId)
    {
        return new HouseJoinRequest
        {
            Id = Guid.NewGuid(),
            HouseId = houseId,
            RequesterId = requesterId,
            Status = HouseJoinRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public Guid HouseId { get; private set; }
    public House House { get; private set; } = null!;

    public Guid RequesterId { get; private set; }
    public User Requester { get; private set; } = null!;

    public HouseJoinRequestStatus Status { get; private set; }

    public Guid? ReviewedById { get; private set; }
    public User? ReviewedBy { get; private set; }

    public DateTime? ReviewedAt { get; private set; }

    public void Approve(Guid reviewerId)
    {
        EnsurePending();
        Status = HouseJoinRequestStatus.Approved;
        ReviewedById = reviewerId;
        ReviewedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reject(Guid reviewerId)
    {
        EnsurePending();
        Status = HouseJoinRequestStatus.Rejected;
        ReviewedById = reviewerId;
        ReviewedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    private void EnsurePending()
    {
        if (Status != HouseJoinRequestStatus.Pending)
            throw new InvalidOperationException("Only pending join requests can be reviewed.");
    }
}
