namespace SharePlate.Core.Entities;

public sealed class RecipeIngredient : BaseEntity
{
    private RecipeIngredient() { }

    public static RecipeIngredient Create(Guid recipeId, Guid ingredientId, double quantity, int unitId)
    {
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");

        return new RecipeIngredient
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            IngredientId = ingredientId,
            Quantity = quantity,
            UnitId = unitId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public Guid RecipeId { get; private set; }
    public Recipe Recipe { get; private set; } = null!;

    public Guid IngredientId { get; private set; }
    public Ingredient Ingredient { get; private set; } = null!;

    public double Quantity { get; private set; }

    public int UnitId { get; private set; }
    public Unit Unit { get; private set; } = null!;

    public void UpdateQuantity(double quantity)
    {
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");
        Quantity = quantity;
        UpdatedAt = DateTime.UtcNow;
    }
}
