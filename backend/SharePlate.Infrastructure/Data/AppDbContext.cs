using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;

namespace SharePlate.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<House> Houses => Set<House>();
    public DbSet<HouseMember> HouseMembers => Set<HouseMember>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Ingredient> Ingredients => Set<Ingredient>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<MealPlanRecipe> MealPlanRecipes => Set<MealPlanRecipe>();
    public DbSet<ShoppingItem> ShoppingItems => Set<ShoppingItem>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);


        modelBuilder.Entity<Unit>().HasData(
            new { Id = 1, Name = "Kilogram", Symbol = "kg", Category = UnitCategory.Weight, ToBaseUnitFactor = 1.0 },
            new { Id = 2, Name = "Gram", Symbol = "g", Category = UnitCategory.Weight, ToBaseUnitFactor = 0.001 },
            new { Id = 3, Name = "Liter", Symbol = "l", Category = UnitCategory.Volume, ToBaseUnitFactor = 1.0 },
            new { Id = 4, Name = "Milliliter", Symbol = "ml", Category = UnitCategory.Volume, ToBaseUnitFactor = 0.001 },
            new { Id = 5, Name = "Piece", Symbol = "pc", Category = UnitCategory.Quantity, ToBaseUnitFactor = 1.0 },
            new { Id = 6, Name = "Portion", Symbol = "ptn", Category = UnitCategory.Quantity, ToBaseUnitFactor = 1.0 }
        );
    }
}