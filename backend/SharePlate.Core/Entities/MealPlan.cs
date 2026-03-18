namespace SharePlate.Core.Entities;

public sealed class MealPlan : BaseEntity
{
    private MealPlan() { }

    public static MealPlan Create(string? name, DateOnly startDate, DateOnly endDate, Guid houseId, Guid createdById)
    {
        if (endDate < startDate) throw new ArgumentException("End date must be after start date.");

        var normalizedName = string.IsNullOrWhiteSpace(name)
            ? $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}"
            : name.Trim();

        return new MealPlan
        {
            Id = Guid.NewGuid(),
            Name = normalizedName,
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

    public void UpdateDetails(string? name, DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate) throw new ArgumentException("End date must be after start date.");

        Name = string.IsNullOrWhiteSpace(name) ? $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}" : name.Trim();
        StartDate = startDate;
        EndDate = endDate;
        UpdatedAt = DateTime.UtcNow;
    }
}
