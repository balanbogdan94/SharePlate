using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using SharePlate.Infrastructure.Data;
using Xunit;

namespace SharePlate.Tests;

public class RecipeNotesMigrationTests
{
    [Fact]
    public void Migration_adds_only_nullable_text_column_without_rewriting_legacy_notes()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused").Options);
        var assembly = db.GetService<IMigrationsAssembly>();
        var latest = assembly.Migrations.Last();
        Assert.EndsWith("_AddRecipeNotesDocument", latest.Key);
        var migration = assembly.CreateMigration(latest.Value, db.Database.ProviderName!);
        var column = Assert.IsType<AddColumnOperation>(Assert.Single(migration.UpOperations));
        Assert.Equal("Recipes", column.Table);
        Assert.Equal("NotesDocument", column.Name);
        Assert.Equal("text", column.ColumnType);
        Assert.True(column.IsNullable);
        Assert.Null(column.DefaultValue);
        Assert.IsType<DropColumnOperation>(Assert.Single(migration.DownOperations));
        Assert.False(db.Database.HasPendingModelChanges());

        var previous = assembly.Migrations.Keys.Reverse().Skip(1).First();
        var sql = db.GetService<IMigrator>().GenerateScript(previous, latest.Key);
        Assert.Contains("ADD \"NotesDocument\" text", sql);
        Assert.DoesNotContain("UPDATE \"Recipes\"", sql);
    }
}
