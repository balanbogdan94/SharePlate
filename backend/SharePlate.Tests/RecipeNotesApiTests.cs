using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SharePlate.API.Endpoints;
using SharePlate.API.Filters;
using SharePlate.API.Security;
using SharePlate.Core.Constants.Auth;
using SharePlate.Core.Entities;
using SharePlate.Core.Enums;
using SharePlate.Core.Repositories;
using SharePlate.Core.Services;
using SharePlate.Infrastructure.Data;
using SharePlate.Infrastructure.Repositories;
using Xunit;

namespace SharePlate.Tests;

public class RecipeNotesApiTests
{
    [Fact]
    public async Task OpenApi_exposes_notes_document_on_summary_and_detail_response_schemas()
    {
        await using var host = await RecipeTestHost.CreateAsync();
        var document = await host.Client.GetFromJsonAsync<JsonElement>("/openapi/v1.json");
        var schemas = document.GetProperty("components").GetProperty("schemas");
        Assert.True(schemas.GetProperty("RecipeResponse").GetProperty("properties").TryGetProperty("notesDocument", out _));
        Assert.True(schemas.GetProperty("RecipeWithIngredientsResponse").GetProperty("properties").TryGetProperty("notesDocument", out _));
        foreach (var (path, method, status) in new[]
        {
            ("/api/recipes", "get", "200"),
            ("/api/recipes/my", "get", "200"),
            ("/api/recipes/house", "get", "200"),
            ("/api/recipes/{id}", "get", "200"),
            ("/api/recipes", "post", "201"),
            ("/api/recipes/{id}", "put", "200")
        })
        {
            var response = document.GetProperty("paths").GetProperty(path).GetProperty(method)
                .GetProperty("responses").GetProperty(status);
            Assert.True(response.GetProperty("content").GetProperty("application/json").TryGetProperty("schema", out _));
        }
    }

    [Fact]
    public async Task Multipart_create_update_and_every_read_response_round_trip_objects_and_projection()
    {
        await using var host = await RecipeTestHost.CreateAsync();
        var url = "https://example.com/soup";
        using var create = RecipeTestHost.Form("not authoritative", NotesDocuments.Link(url, url));
        using var created = await host.Client.PostAsync("/api/recipes/", create);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var response = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = response.GetProperty("id").GetGuid();
        AssertDocument(response, url);
        Assert.Equal($"/api/recipes/{id}", created.Headers.Location!.OriginalString);

        await host.WithDbAsync(async db =>
        {
            var stored = await db.Recipes.AsNoTracking().SingleAsync();
            Assert.Equal(url, stored.Notes);
            Assert.Equal(JsonValueKind.Object, JsonDocument.Parse(stored.NotesDocument!).RootElement.ValueKind);
            Assert.Single(await db.RecipeIngredients.ToListAsync());
        });

        foreach (var route in new[] { "/api/recipes/", "/api/recipes/my", "/api/recipes/house", "/api/recipes/?search=Soup" })
        {
            var recipes = await host.Client.GetFromJsonAsync<JsonElement>(route);
            AssertDocument(Assert.Single(recipes.EnumerateArray()), url);
        }
        var detail = await host.Client.GetFromJsonAsync<JsonElement>($"/api/recipes/{id}");
        AssertDocument(detail, url);
        Assert.Single(detail.GetProperty("ingredients").EnumerateArray());

        host.SetActor(host.HousemateId);
        AssertDocument(await host.Client.GetFromJsonAsync<JsonElement>($"/api/recipes/{id}"), url);
        host.SetActor(host.AuthorId);
        using var update = RecipeTestHost.Form("also ignored", NotesDocuments.Text("Updated"));
        using var updated = await host.Client.PutAsync($"/api/recipes/{id}", update);
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        AssertDocument(await updated.Content.ReadFromJsonAsync<JsonElement>(), "Updated");
        AssertDocument(await host.Client.GetFromJsonAsync<JsonElement>($"/api/recipes/{id}"), "Updated");
        await host.WithDbAsync(async db =>
        {
            var stored = await db.Recipes.AsNoTracking().SingleAsync();
            Assert.Equal("Updated", stored.Notes);
            Assert.Contains("Updated", stored.NotesDocument!);
            Assert.Single(await db.RecipeIngredients.ToListAsync());
        });
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task Legacy_multipart_create_and_update_preserve_exact_notes_and_clear_document(string? document)
    {
        await using var host = await RecipeTestHost.CreateAsync();
        const string plain = "  Legacy <text>\r\nsecond line\n\nhttps://example.com  ";
        using var legacyCreate = RecipeTestHost.Form(plain, document);
        using var created = await host.Client.PostAsync("/api/recipes/", legacyCreate);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var response = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = response.GetProperty("id").GetGuid();
        Assert.Equal(plain, response.GetProperty("notes").GetString());
        Assert.Equal(JsonValueKind.Null, response.GetProperty("notesDocument").ValueKind);

        using var formatted = RecipeTestHost.Form("ignored", NotesDocuments.Text("formatted"));
        using var formattedResponse = await host.Client.PutAsync($"/api/recipes/{id}", formatted);
        Assert.Equal(HttpStatusCode.OK, formattedResponse.StatusCode);
        using var legacyUpdate = RecipeTestHost.Form(plain, document);
        using var updated = await host.Client.PutAsync($"/api/recipes/{id}", legacyUpdate);
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        response = await updated.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(plain, response.GetProperty("notes").GetString());
        Assert.Equal(JsonValueKind.Null, response.GetProperty("notesDocument").ValueKind);
        await host.WithDbAsync(async db =>
        {
            var stored = await db.Recipes.AsNoTracking().SingleAsync();
            Assert.Equal(plain, stored.Notes);
            Assert.Null(stored.NotesDocument);
        });
    }

    [Theory]
    [InlineData("{")]
    [InlineData(" ")]
    [InlineData("""{"version":1,"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"\uD800"}]}]}}""")]
    [InlineData("""{"version":2,"content":{"type":"doc"}}""")]
    [InlineData("""{"version":1,"content":{"type":"doc","content":[{"type":"heading"}]}}""")]
    public async Task Invalid_multipart_documents_return_validation_problem_before_persistence_or_image_operations(string document)
    {
        await using var host = await RecipeTestHost.CreateAsync();
        using var invalidCreate = RecipeTestHost.Form("no fallback", document, image: true);
        using var rejectedCreate = await host.Client.PostAsync("/api/recipes/", invalidCreate);
        await AssertValidationProblem(rejectedCreate);
        await host.WithDbAsync(async db => Assert.Empty(await db.Recipes.ToListAsync()));
        Assert.Equal(0, host.Storage.Calls);

        var id = await host.SeedRecipeAsync(NotesDocuments.Text("original"));
        using var invalidUpdate = RecipeTestHost.Form("overwrite", document, removeImage: true);
        using var rejectedUpdate = await host.Client.PutAsync($"/api/recipes/{id}", invalidUpdate);
        await AssertValidationProblem(rejectedUpdate);
        await host.WithDbAsync(async db =>
        {
            var stored = await db.Recipes.AsNoTracking().SingleAsync();
            Assert.Equal("Original", stored.Title);
            Assert.Equal("original", stored.Notes);
            Assert.Contains("original", stored.NotesDocument!);
            Assert.Equal("https://images.example/original.jpg", stored.ImageUrl);
        });
        Assert.Equal(0, host.Storage.Calls);
    }

    [Fact]
    public async Task Hidden_link_targets_and_excessive_nesting_are_explicit_400_not_plain_text_fallback()
    {
        await using var host = await RecipeTestHost.CreateAsync();
        foreach (var document in new[]
        {
            NotesDocuments.Link("https://trusted.example", "https://evil.example"),
            NotesDocuments.Link("javascript:alert(1)", "javascript:alert(1)"),
            NotesDocuments.NestedList(4)
        })
        {
            using var form = RecipeTestHost.Form("fallback must not save", document);
            using var result = await host.Client.PostAsync("/api/recipes/", form);
            await AssertValidationProblem(result);
        }
        await host.WithDbAsync(async db => Assert.Empty(await db.Recipes.ToListAsync()));
    }

    [Fact]
    public async Task Empty_formatted_document_can_be_saved_with_empty_plain_notes()
    {
        await using var host = await RecipeTestHost.CreateAsync();
        using var form = RecipeTestHost.Form("", NotesDocuments.Empty);
        using var result = await host.Client.PostAsync("/api/recipes/", form);
        Assert.Equal(HttpStatusCode.Created, result.StatusCode);
        AssertDocument(await result.Content.ReadFromJsonAsync<JsonElement>(), "");
    }

    [Fact]
    public async Task Existing_plain_rows_return_null_documents_and_authorization_is_unchanged()
    {
        await using var host = await RecipeTestHost.CreateAsync();
        var id = await host.SeedRecipeAsync(null);
        var legacy = await host.Client.GetFromJsonAsync<JsonElement>($"/api/recipes/{id}");
        Assert.Equal("legacy", legacy.GetProperty("notes").GetString());
        Assert.Equal(JsonValueKind.Null, legacy.GetProperty("notesDocument").ValueKind);
        host.SetActor(host.HousemateId);
        using var form = RecipeTestHost.Form("unauthorized", NotesDocuments.Text("overwrite"));
        using var update = await host.Client.PutAsync($"/api/recipes/{id}", form);
        Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
        host.Client.DefaultRequestHeaders.Remove("X-Test-User");
        using var denied = await host.Client.GetAsync($"/api/recipes/{id}");
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);
    }

    [Theory]
    [InlineData("{")]
    [InlineData("null")]
    [InlineData("\"not an object\"")]
    public async Task Corrupt_persisted_json_is_not_silently_returned_as_null_or_plain_text(string corrupted)
    {
        await using var host = await RecipeTestHost.CreateAsync();
        var id = await host.SeedRecipeAsync(null);
        await host.WithDbAsync(async db =>
            await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE Recipes SET NotesDocument = {corrupted} WHERE Id = {id}"));
        await Assert.ThrowsAnyAsync<JsonException>(() => host.Client.GetAsync($"/api/recipes/{id}"));
    }

    private static void AssertDocument(JsonElement recipe, string text)
    {
        Assert.Equal(text, recipe.GetProperty("notes").GetString());
        var document = recipe.GetProperty("notesDocument");
        Assert.Equal(JsonValueKind.Object, document.ValueKind);
        Assert.Equal(1, document.GetProperty("version").GetInt32());
        Assert.Equal("doc", document.GetProperty("content").GetProperty("type").GetString());
    }

    private static async Task AssertValidationProblem(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(400, problem.GetProperty("status").GetInt32());
        Assert.NotEmpty(problem.GetProperty("errors").GetProperty("NotesDocument").EnumerateArray());
    }
}

internal sealed class RecipeTestHost(WebApplication app, SqliteConnection connection, HttpClient client) : IAsyncDisposable
{
    public HttpClient Client { get; } = client;
    public Guid AuthorId { get; private set; }
    public Guid HousemateId { get; private set; }
    public CountingStorage Storage => (CountingStorage)app.Services.GetRequiredService<IStorageService>();

    public static async Task<RecipeTestHost> CreateAsync()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseTestServer();
        builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connection));
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddSingleton<IStorageService, CountingStorage>();
        builder.Services.AddOpenApi();
        builder.Services.AddAuthentication("Test")
            .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("Test", _ => { });
        builder.Services.AddAuthorization(options => options.AddPolicy(AuthPolicies.SharePlateUser,
            policy => policy.RequireAuthenticatedUser().RequireClaim(AuthClaimTypes.UserId)));
        var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapOpenApi();
        app.MapGroup("/api").AddEndpointFilter<DataAnnotationValidationFilter>().MapRecipeEndpoints();
        await app.StartAsync();
        var host = new RecipeTestHost(app, connection, app.GetTestClient());
        await host.WithDbAsync(async db =>
        {
            await db.Database.EnsureCreatedAsync();
            var author = User.Create("Cook", "cook@example.com");
            var housemate = User.Create("Housemate", "housemate@example.com");
            var house = House.Create("Kitchen", author.Id);
            house.AddMember(housemate.Id);
            db.Users.AddRange(author, housemate);
            db.Houses.Add(house);
            await db.SaveChangesAsync();
            host.AuthorId = author.Id;
            host.HousemateId = housemate.Id;
        });
        host.SetActor(host.AuthorId);
        return host;
    }

    public void SetActor(Guid id)
    {
        Client.DefaultRequestHeaders.Remove("X-Test-User");
        Client.DefaultRequestHeaders.Add("X-Test-User", id.ToString());
    }

    public async Task WithDbAsync(Func<AppDbContext, Task> action)
    {
        await using var scope = app.Services.CreateAsyncScope();
        await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public async Task<Guid> SeedRecipeAsync(string? document)
    {
        var recipe = Recipe.Create("Original", "legacy", AuthorId, "https://images.example/original.jpg", document);
        await WithDbAsync(async db =>
        {
            db.Recipes.Add(recipe);
            await db.SaveChangesAsync();
        });
        return recipe.Id;
    }

    public static MultipartFormDataContent Form(string notes, string? document, bool image = false, bool removeImage = false)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent("Soup"), "Title" },
            { new StringContent(notes), "Notes" },
            { new StringContent(JsonSerializer.Serialize(new[] { new { name = "Salt", quantity = 1, unit = (int)UnitType.Gram } })), "Ingredients" },
            { new StringContent(removeImage.ToString()), "RemoveImage" }
        };
        if (document is not null)
            form.Add(new StringContent(document), "NotesDocument");
        if (image)
        {
            var file = new ByteArrayContent([1, 2, 3]);
            file.Headers.ContentType = new("image/jpeg");
            form.Add(file, "Image", "photo.jpg");
        }
        return form;
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await app.DisposeAsync();
        await connection.DisposeAsync();
    }
}

internal sealed class CountingStorage : IStorageService
{
    public int Calls { get; private set; }
    public Task EnsureImageContainerAsync(CancellationToken ct = default) => Task.CompletedTask;
    public Task DeleteImageAsync(string imageUrl, CancellationToken ct = default)
    {
        Calls++;
        return Task.CompletedTask;
    }
    public Task<string> UploadImageAsync(Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        Calls++;
        return Task.FromResult("https://images.example/upload.jpg");
    }
}

internal sealed class TestAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-User", out var id))
            return Task.FromResult(AuthenticateResult.NoResult());
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(AuthClaimTypes.UserId, id.ToString())], "Test"));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Test")));
    }
}
