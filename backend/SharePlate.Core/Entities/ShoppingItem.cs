using SharePlate.Core.Enums;

namespace SharePlate.Core.Entities;

public sealed class ShoppingItem : BaseEntity
{
    private ShoppingItem() { }

    public static ShoppingItem Create(Guid houseId, Guid ingredientId, double quantity, int unitId, Guid mealPlanId)
    {
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");

        return new ShoppingItem
        {
            Id = Guid.NewGuid(),
            HouseId = houseId,
            IngredientId = ingredientId,
            Quantity = quantity,
            UnitId = unitId,
            MealPlanId = mealPlanId,
            Status = ShoppingItemStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public Guid HouseId { get; private set; }
    public House House { get; private set; } = null!;

    public Guid IngredientId { get; private set; }
    public Ingredient Ingredient { get; private set; } = null!;

    public double Quantity { get; private set; }

    public int UnitId { get; private set; }
    public Unit Unit { get; private set; } = null!;

    public Guid MealPlanId { get; private set; }
    public MealPlan MealPlan { get; private set; } = null!;

    public ShoppingItemStatus Status { get; private set; } = ShoppingItemStatus.Pending;

    public Guid? ModifiedById { get; private set; }
    public User? ModifiedBy { get; private set; }

    public void MarkAsPurchased(Guid modifiedById)
    {
        Status = ShoppingItemStatus.Purchased;
        ModifiedById = modifiedById;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Remove(Guid modifiedById)
    {
        Status = ShoppingItemStatus.Removed;
        ModifiedById = modifiedById;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RevertToPending(Guid modifiedById)
    {
        Status = ShoppingItemStatus.Pending;
        ModifiedById = modifiedById;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateQuantity(double quantity)
    {
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");
        Quantity = quantity;
        UpdatedAt = DateTime.UtcNow;
    }
}
