namespace SharePlate.Core.Services;

public interface IStorageService
{
    /// <summary>
    /// Uploads an image stream and returns the public URL of the stored blob.
    /// </summary>
    Task<string> UploadImageAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);

    /// <summary>
    /// Deletes the blob identified by the given URL. No-ops if the URL is empty or not found.
    /// </summary>
    Task DeleteImageAsync(string imageUrl, CancellationToken ct = default);
}
