namespace SharePlate.Core.Entities;

public sealed class MealPlan : BaseEntity
{
    private MealPlan() { }

    public static MealPlan Create(string name, DateOnly startDate, DateOnly endDate, Guid houseId, Guid createdById)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (endDate < startDate) throw new ArgumentException("End date must be after start date.");

        return new MealPlan
        {
            Id = Guid.NewGuid(),
            Name = name,
            StartDate = startDate,
            EndDate = endDate,
            HouseId = houseId,
            CreatedById = createdById,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public string Name { get; private set; } = string.Empty;
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }

    public Guid HouseId { get; private set; }
    public House House { get; private set; } = null!;

    public Guid CreatedById { get; private set; }
    public User CreatedBy { get; private set; } = null!;

    public ICollection<MealPlanRecipe> MealPlanRecipes { get; private set; } = new List<MealPlanRecipe>();
}
