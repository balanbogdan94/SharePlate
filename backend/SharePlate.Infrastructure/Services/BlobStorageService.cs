using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;
using SharePlate.Core.Configuration;
using SharePlate.Core.Services;

namespace SharePlate.Infrastructure.Services;

public sealed class BlobStorageService : IStorageService
{
    private readonly BlobContainerClient _containerClient;

    public BlobStorageService(IOptions<AzureStorageOptions> options)
    {
        var opts = options.Value;
        var serviceClient = new BlobServiceClient(opts.ConnectionString);
        _containerClient = serviceClient.GetBlobContainerClient(opts.ImageContainerName);
    }

    public async Task<string> UploadImageAsync(Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        await _containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: ct);

        var extension = Path.GetExtension(fileName);
        var blobName = $"{Guid.NewGuid()}{extension}";

        var blobClient = _containerClient.GetBlobClient(blobName);
        await blobClient.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);

        return blobClient.Uri.ToString();
    }

    public async Task DeleteImageAsync(string imageUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return;

        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
            return;

        var blobName = Path.GetFileName(uri.LocalPath);
        var blobClient = _containerClient.GetBlobClient(blobName);
        await blobClient.DeleteIfExistsAsync(cancellationToken: ct);
    }
}
