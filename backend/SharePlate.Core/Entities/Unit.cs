using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class Unit
{
    private Unit() { } // Required by EF Core for materialization

    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Symbol { get; private set; } = string.Empty;
    public UnitCategory Category { get; private set; }
    public double ToBaseUnitFactor { get; private set; }
}