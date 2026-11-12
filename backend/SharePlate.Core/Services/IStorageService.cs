namespace SharePlate.Core.Services;

public enum ImageKind
{
    Recipe,
    Profile
}

public interface IStorageService
{
    Task EnsureImageContainerAsync(CancellationToken ct = default);

    /// <summary>
    /// Uploads an image stream to the container for the given kind and returns the public URL of the stored blob.
    /// </summary>
    Task<string> UploadImageAsync(ImageKind kind, Stream content, string fileName, string contentType, CancellationToken ct = default);

    /// <summary>
    /// Deletes the blob identified by the given URL. No-ops if the URL is empty or not found.
    /// </summary>
    Task DeleteImageAsync(string imageUrl, CancellationToken ct = default);
}
