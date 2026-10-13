using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SharePlate.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCulinaryUnits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<double>(
                name: "ToBaseUnitFactor",
                table: "Units",
                type: "double precision",
                nullable: true,
                oldClrType: typeof(double),
                oldType: "double precision");

            migrationBuilder.UpdateData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 5,
                column: "ToBaseUnitFactor",
                value: null);

            migrationBuilder.UpdateData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 6,
                column: "ToBaseUnitFactor",
                value: null);

            migrationBuilder.InsertData(
                table: "Units",
                columns: new[] { "Id", "Category", "Name", "Symbol", "ToBaseUnitFactor" },
                values: new object[,]
                {
                    { 7, 2, "Teaspoon", "tsp", 0.0050000000000000001 },
                    { 8, 2, "Tablespoon", "tbsp", 0.014999999999999999 },
                    { 9, 3, "Can", "can", null },
                    { 10, 2, "Cup", "cup", 0.25 },
                    { 11, 3, "Pinch", "pinch", null },
                    { 12, 3, "Clove", "clove", null },
                    { 13, 3, "Bunch", "bunch", null },
                    { 14, 3, "Slice", "slice", null },
                    { 15, 3, "Package", "pkg", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.AlterColumn<double>(
                name: "ToBaseUnitFactor",
                table: "Units",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 5,
                column: "ToBaseUnitFactor",
                value: 1.0);

            migrationBuilder.UpdateData(
                table: "Units",
                keyColumn: "Id",
                keyValue: 6,
                column: "ToBaseUnitFactor",
                value: 1.0);
        }
    }
}
