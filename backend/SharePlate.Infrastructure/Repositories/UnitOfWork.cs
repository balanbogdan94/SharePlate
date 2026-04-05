using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Users = new UserRepository(context);
        RefreshTokens = new RefreshTokenRepository(context);
        Houses = new HouseRepository(context);
        HouseMembers = new HouseMemberRepository(context);
        HouseJoinRequests = new HouseJoinRequestRepository(context);
        Units = new UnitRepository(context);
        Ingredients = new IngredientRepository(context);
        Recipes = new RecipeRepository(context);
        RecipeIngredients = new RecipeIngredientRepository(context);
        MealPlans = new MealPlanRepository(context);
        ShoppingItems = new ShoppingItemRepository(context);
    }

    public IUserRepository Users { get; }
    public IRefreshTokenRepository RefreshTokens { get; }
    public IHouseRepository Houses { get; }
    public IHouseMemberRepository HouseMembers { get; }
    public IHouseJoinRequestRepository HouseJoinRequests { get; }
    public IUnitRepository Units { get; }
    public IIngredientRepository Ingredients { get; }
    public IRecipeRepository Recipes { get; }
    public IRecipeIngredientRepository RecipeIngredients { get; }
    public IMealPlanRepository MealPlans { get; }
    public IShoppingItemRepository ShoppingItems { get; }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _context.SaveChangesAsync(ct);

    public ValueTask DisposeAsync()
        => _context.DisposeAsync();
}
