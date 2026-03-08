namespace SharePlate.Core.Repositories;

public interface IUnitOfWork : IAsyncDisposable
{
    IUserRepository Users { get; }
    IRefreshTokenRepository RefreshTokens { get; }
    IHouseRepository Houses { get; }
    IHouseMemberRepository HouseMembers { get; }
    IUnitRepository Units { get; }
    IIngredientRepository Ingredients { get; }
    IRecipeRepository Recipes { get; }
    IRecipeIngredientRepository RecipeIngredients { get; }
    IMealPlanRepository MealPlans { get; }
    IShoppingItemRepository ShoppingItems { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
