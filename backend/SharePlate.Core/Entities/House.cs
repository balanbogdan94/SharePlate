using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class House : BaseEntity
{
    private House() { }

    public static House Create(string name, Guid ownerId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        var house = new House
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = GenerateCode(),  // 👈 Auto-generated, no longer a param
            IsPersonal = false,
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        house.HouseMembers.Add(HouseMember.Create(house.Id, ownerId, HouseMemberRole.Owner));

        return house;
    }

    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;

    public bool IsPersonal { get; private set; } = true;

    public Guid OwnerId { get; private set; }

    public ICollection<HouseMember> HouseMembers { get; private set; } = new List<HouseMember>();
    public ICollection<MealPlan> MealPlans { get; private set; } = new List<MealPlan>();
    public ICollection<ShoppingItem> ShoppingItems { get; private set; } = new List<ShoppingItem>();

    public void AddMember(Guid userId)
    {
        if (HouseMembers.Any(m => m.UserId == userId))
            throw new InvalidOperationException("User is already a member of this house.");

        HouseMembers.Add(HouseMember.Create(Id, userId, HouseMemberRole.Member));
        UpdatedAt = DateTime.UtcNow;
    }

    public void RemoveMember(Guid userId)
    {
        if (userId == OwnerId)
            throw new InvalidOperationException("Cannot remove the owner of the house.");

        var member = HouseMembers.FirstOrDefault(m => m.UserId == userId)
            ?? throw new InvalidOperationException("User is not a member of this house.");

        HouseMembers.Remove(member);
        UpdatedAt = DateTime.UtcNow;
    }

    private static string GenerateCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();

        var part1 = new string(Enumerable.Range(0, 4).Select(_ => chars[random.Next(chars.Length)]).ToArray());
        var part2 = new string(Enumerable.Range(0, 4).Select(_ => chars[random.Next(chars.Length)]).ToArray());

        return $"{part1}-{part2}";
    }
}
