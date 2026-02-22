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
        Houses = new HouseRepository(context);
        HouseMembers = new HouseMemberRepository(context);
        Ingredients = new IngredientRepository(context);
        Recipes = new RecipeRepository(context);
        MealPlans = new MealPlanRepository(context);
        ShoppingItems = new ShoppingItemRepository(context);
    }

    public IUserRepository Users { get; }
    public IHouseRepository Houses { get; }
    public IHouseMemberRepository HouseMembers { get; }
    public IIngredientRepository Ingredients { get; }
    public IRecipeRepository Recipes { get; }
    public IMealPlanRepository MealPlans { get; }
    public IShoppingItemRepository ShoppingItems { get; }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _context.SaveChangesAsync(ct);

    public ValueTask DisposeAsync()
        => _context.DisposeAsync();
}
