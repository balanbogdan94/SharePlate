using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;
using SharePlate.Core.Configuration;
using SharePlate.Core.Services;

namespace SharePlate.Infrastructure.Services;

public sealed class BlobStorageService : IStorageService
{
    private readonly BlobContainerClient _recipeContainer;
    private readonly BlobContainerClient _profileContainer;

    public BlobStorageService(IOptions<AzureStorageOptions> options)
    {
        var opts = options.Value;
        // Managed identity in Azure (AccountUri set) - falls back to connection string for local Azurite dev.
        var serviceClient = string.IsNullOrEmpty(opts.AccountUri)
            ? new BlobServiceClient(opts.ConnectionString)
            : new BlobServiceClient(new Uri(opts.AccountUri), new DefaultAzureCredential());
        _recipeContainer = serviceClient.GetBlobContainerClient(opts.ImageContainerName);
        _profileContainer = serviceClient.GetBlobContainerClient(opts.ProfileImageContainerName);
    }

    public async Task EnsureImageContainerAsync(CancellationToken ct = default)
    {
        // Public access level is set declaratively in Bicep at creation time. Re-asserting it here via
        // SetAccessPolicyAsync requires the more privileged Storage Blob Data Owner role, unlike plain
        // CreateIfNotExistsAsync (covered by Storage Blob Data Contributor), so we skip it.
        await _recipeContainer.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: ct);
        await _profileContainer.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: ct);
    }

    public async Task<string> UploadImageAsync(ImageKind kind, Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        await EnsureImageContainerAsync(ct);

        var extension = Path.GetExtension(fileName);
        var blobName = $"{Guid.NewGuid()}{extension}";

        var container = kind == ImageKind.Profile ? _profileContainer : _recipeContainer;
        var blobClient = container.GetBlobClient(blobName);
        await blobClient.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);

        return blobClient.Uri.ToString();
    }

    public async Task DeleteImageAsync(string imageUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return;

        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
            return;

        // Legacy avatars may still live in the recipe container, so resolve the container from the URL.
        var profilePrefix = $"/{_profileContainer.Name}/";
        var container = uri.AbsolutePath.Contains(profilePrefix, StringComparison.Ordinal) ? _profileContainer : _recipeContainer;
        var blobClient = container.GetBlobClient(Path.GetFileName(uri.LocalPath));
        await blobClient.DeleteIfExistsAsync(cancellationToken: ct);
    }
}
