using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class Ingredient : BaseEntity
{
    private Ingredient() { }

    public static Ingredient Create(string name, UnitType defaultUnitId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        return new Ingredient
        {
            Id = Guid.NewGuid(),
            Name = name,
            DefaultUnitId = defaultUnitId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public string Name { get; private set; } = string.Empty;

    public UnitType DefaultUnitId { get; private set; }
    public Unit DefaultUnit { get; private set; } = null!;
}
