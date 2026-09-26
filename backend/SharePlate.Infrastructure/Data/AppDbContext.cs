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
    public DbSet<HouseJoinRequest> HouseJoinRequests => Set<HouseJoinRequest>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Ingredient> Ingredients => Set<Ingredient>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<MealPlanRecipe> MealPlanRecipes => Set<MealPlanRecipe>();
    public DbSet<ShoppingItem> ShoppingItems => Set<ShoppingItem>();
    public DbSet<ExternalIdentity> ExternalIdentities => Set<ExternalIdentity>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<User>(b =>
        {
            b.HasIndex(u => u.Email).IsUnique();

            b.Property(u => u.ProfilePictureUrl)
                .HasMaxLength(2048)
                .HasDefaultValue(string.Empty);

            b.HasMany(u => u.ExternalIdentities)
                .WithOne(identity => identity.User)
                .HasForeignKey(identity => identity.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasMany(u => u.RequestedHouseJoinRequests)
                .WithOne(r => r.Requester)
                .HasForeignKey(r => r.RequesterId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasMany(u => u.ReviewedHouseJoinRequests)
                .WithOne(r => r.ReviewedBy)
                .HasForeignKey(r => r.ReviewedById)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<House>(b =>
        {
            b.HasIndex(h => h.Code).IsUnique();
        });

        modelBuilder.Entity<HouseMember>(b =>
        {
            b.HasIndex(m => new { m.HouseId, m.UserId }).IsUnique();
            b.HasIndex(m => m.UserId);
        });

        modelBuilder.Entity<HouseJoinRequest>(b =>
        {
            b.HasIndex(r => r.RequesterId)
                .IsUnique()
                .HasFilter("\"Status\" = 1");

            b.HasIndex(r => new { r.HouseId, r.Status });
        });

        modelBuilder.Entity<ExternalIdentity>(b =>
        {
            b.HasIndex(identity => new { identity.Issuer, identity.Subject })
                .IsUnique();

            b.HasIndex(identity => identity.UserId);

            b.Property(identity => identity.Issuer)
                .HasMaxLength(512)
                .IsRequired();

            b.Property(identity => identity.Subject)
                .HasMaxLength(128)
                .IsRequired();

            b.Property(identity => identity.Provider)
                .HasMaxLength(64)
                .IsRequired();
        });

        modelBuilder.Entity<MealPlanRecipe>(b =>
        {
            b.HasIndex(mpr => new
            {
                mpr.MealPlanId,
                mpr.PlannedDate,
                mpr.CategoryType,
                mpr.SortOrder
            });
        });


        modelBuilder.Entity<Unit>().HasData(
            new { Id = UnitType.Kilogram, Name = "Kilogram", Symbol = "kg", Category = UnitCategory.Weight, ToBaseUnitFactor = 1.0 },
            new { Id = UnitType.Gram, Name = "Gram", Symbol = "g", Category = UnitCategory.Weight, ToBaseUnitFactor = 0.001 },
            new { Id = UnitType.Liter, Name = "Liter", Symbol = "l", Category = UnitCategory.Volume, ToBaseUnitFactor = 1.0 },
            new { Id = UnitType.Milliliter, Name = "Milliliter", Symbol = "ml", Category = UnitCategory.Volume, ToBaseUnitFactor = 0.001 },
            new { Id = UnitType.Piece, Name = "Piece", Symbol = "pc", Category = UnitCategory.Quantity, ToBaseUnitFactor = 1.0 },
            new { Id = UnitType.Portion, Name = "Portion", Symbol = "ptn", Category = UnitCategory.Quantity, ToBaseUnitFactor = 1.0 }
        );
    }
}
