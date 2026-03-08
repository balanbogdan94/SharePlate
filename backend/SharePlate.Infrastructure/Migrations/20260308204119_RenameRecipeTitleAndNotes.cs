using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SharePlate.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameRecipeTitleAndNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Recipes",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Recipes",
                newName: "Notes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Recipes",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "Recipes",
                newName: "Description");
        }
    }
}
