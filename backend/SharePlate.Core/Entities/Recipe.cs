namespace SharePlate.Core.Entities;

public sealed class Recipe : BaseEntity
{
    private Recipe() { }

    public static Recipe Create(string name, string description, Guid authorId, string imageUrl = "")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        return new Recipe
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            AuthorId = authorId,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string ImageUrl { get; private set; } = string.Empty;

    public Guid AuthorId { get; private set; }
    public User Author { get; private set; } = null!;

    public ICollection<RecipeIngredient> RecipeIngredients { get; private set; } = new List<RecipeIngredient>();

    public void UpdateName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDescription(string description)
    {
        Description = description;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateImageUrl(string imageUrl)
    {
        ImageUrl = imageUrl;
        UpdatedAt = DateTime.UtcNow;
    }
}
