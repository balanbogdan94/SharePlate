namespace SharePlate.Core.Configuration;

public sealed class AzureStorageOptions
{
    public const string SectionName = "AzureStorage";

    public string ConnectionString { get; init; } = string.Empty;
    public string ImageContainerName { get; init; } = "recipe-images";
}
