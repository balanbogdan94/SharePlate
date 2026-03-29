using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SharePlate.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlignMealPlanV1 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DELETE FROM "ShoppingItems";""");
            migrationBuilder.Sql("""DELETE FROM "MealPlanRecipes";""");
            migrationBuilder.Sql("""DELETE FROM "MealPlans";""");

            migrationBuilder.DropColumn(
                name: "MealTime",
                table: "MealPlanRecipes");

            migrationBuilder.DropColumn(
                name: "Servings",
                table: "MealPlanRecipes");

            migrationBuilder.AddColumn<int>(
                name: "CategoryType",
                table: "MealPlanRecipes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "MealPlanRecipes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_MealPlanRecipes_MealPlanId";""");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlanRecipes_MealPlanId_PlannedDate_CategoryType_SortOrder",
                table: "MealPlanRecipes",
                columns: new[] { "MealPlanId", "PlannedDate", "CategoryType", "SortOrder" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MealPlanRecipes_MealPlanId_PlannedDate_CategoryType_SortOrder",
                table: "MealPlanRecipes");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlanRecipes_MealPlanId",
                table: "MealPlanRecipes",
                column: "MealPlanId");

            migrationBuilder.DropColumn(
                name: "CategoryType",
                table: "MealPlanRecipes");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "MealPlanRecipes");

            migrationBuilder.AddColumn<int>(
                name: "MealTime",
                table: "MealPlanRecipes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Servings",
                table: "MealPlanRecipes",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
