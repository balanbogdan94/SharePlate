namespace SharePlate.Core.Entities;

public sealed class Recipe : BaseEntity
{
    private Recipe() { }

    public static Recipe Create(string title, string notes, Guid authorId, string imageUrl = "")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);

        return new Recipe
        {
            Id = Guid.NewGuid(),
            Title = title,
            Notes = notes,
            AuthorId = authorId,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public string Title { get; private set; } = string.Empty;
    public string Notes { get; private set; } = string.Empty;
    public string ImageUrl { get; private set; } = string.Empty;

    public Guid AuthorId { get; private set; }
    public User Author { get; private set; } = null!;

    public ICollection<RecipeIngredient> RecipeIngredients { get; private set; } = new List<RecipeIngredient>();

    public void UpdateTitle(string title)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        Title = title;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateNotes(string notes)
    {
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateImageUrl(string imageUrl)
    {
        ImageUrl = imageUrl;
        UpdatedAt = DateTime.UtcNow;
    }
}
