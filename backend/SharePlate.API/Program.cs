using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using Microsoft.OpenApi.Models;
using SharePlate.API.Endpoints;
using SharePlate.API.Filters;
using SharePlate.API.Security;
using SharePlate.Core.Constants.Auth;
using SharePlate.Core.Repositories;
using SharePlate.Core.Services;
using SharePlate.Infrastructure.Data;
using SharePlate.Infrastructure.Extensions;
using SharePlate.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCors";

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes[JwtBearerDefaults.AuthenticationScheme] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "JWT Bearer authentication. Use: Authorization: Bearer {token}"
        };

        return Task.CompletedTask;
    });

    options.AddOperationTransformer((operation, context, _) =>
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        var allowsAnonymous = metadata.OfType<IAllowAnonymous>().Any();
        var requiresAuthorization = metadata.OfType<IAuthorizeData>().Any();

        if (!requiresAuthorization || allowsAnonymous)
        {
            return Task.CompletedTask;
        }

        operation.Security ??= new List<OpenApiSecurityRequirement>();
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = JwtBearerDefaults.AuthenticationScheme
                }
            }] = Array.Empty<string>()
        });

        operation.Responses.TryAdd("401", new OpenApiResponse { Description = "Unauthorized" });
        operation.Responses.TryAdd("403", new OpenApiResponse { Description = "Forbidden" });

        return Task.CompletedTask;
    });
});


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"), b => b.MigrationsAssembly("SharePlate.Infrastructure")));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(
        jwtOptions => jwtOptions.MapInboundClaims = false,
        identityOptions => builder.Configuration.GetSection("EntraExternalId").Bind(identityOptions));

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.ApiAccess, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context => AuthPolicies.HasRequiredScope(context.User));
    });

    options.AddPolicy(AuthPolicies.SharePlateUser, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context => AuthPolicies.HasRequiredScope(context.User));
        policy.RequireClaim(AuthClaimTypes.UserId);
    });

    options.DefaultPolicy = options.GetPolicy(AuthPolicies.ApiAccess)!;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<UserProvisioningService>();
builder.Services.AddInfrastructureStorageServices(builder.Configuration);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddScoped<IUnitRepository, UnitRepository>();


var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();
    await storage.EnsureImageContainerAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseMiddleware<ExternalIdentityResolutionMiddleware>();
app.UseAuthorization();

var api = app.MapGroup("/api")
             .AddEndpointFilter<DataAnnotationValidationFilter>();

api.MapUserEndpoints();
api.MapSessionEndpoints();
api.MapHouseEndpoints();
api.MapUnitEndpoints();
api.MapIngredientEndpoints();
api.MapRecipeEndpoints();
api.MapPlanEndpoints();

app.Run();
