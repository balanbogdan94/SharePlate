namespace SharePlate.Core.Entities;

public abstract class BaseEntity
{
    protected BaseEntity() { } // Required by EF Core for materialization

    public Guid Id { get; protected set; }
    public DateTime CreatedAt { get; protected set; }
    public DateTime UpdatedAt { get; protected set; }
}
