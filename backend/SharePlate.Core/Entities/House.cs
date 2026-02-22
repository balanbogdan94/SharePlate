namespace SharePlate.Core.Entities;

public sealed class House : BaseEntity
{
    private House() { }

    public static House Create(string name, string code)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(code);

        return new House
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = code,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;

    public bool IsPersonal { get; private set; } = true;

    public ICollection<HouseMember> HouseMembers { get; private set; } = new List<HouseMember>();
    public ICollection<MealPlan> MealPlans { get; private set; } = new List<MealPlan>();
    public ICollection<ShoppingItem> ShoppingItems { get; private set; } = new List<ShoppingItem>();
}
