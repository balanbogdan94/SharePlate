using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SharePlate.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRecipeNotesDocument : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NotesDocument",
                table: "Recipes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotesDocument",
                table: "Recipes");
        }
    }
}
