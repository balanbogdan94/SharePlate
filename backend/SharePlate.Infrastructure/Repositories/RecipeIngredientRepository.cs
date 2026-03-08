using SharePlate.Core.Entities;
using SharePlate.Core.Repositories;
using SharePlate.Infrastructure.Data;

namespace SharePlate.Infrastructure.Repositories;

public class RecipeIngredientRepository : Repository<RecipeIngredient>, IRecipeIngredientRepository
{
    public RecipeIngredientRepository(AppDbContext context) : base(context) { }
}
