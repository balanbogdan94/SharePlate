using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Entities;
using SharePlate.Infrastructure.Data;

namespace SharePlate.API.Security;

public sealed class UserProvisioningService(AppDbContext dbContext)
{
    private const string Provider = "entra-external-id";

    public async Task<UserProvisioningResult> ProvisionAsync(
        EntraUserProfile profile,
        CancellationToken ct)
    {
        var existingUser = await FindByIdentityAsync(profile, ct);
        if (existingUser is not null)
        {
            return UserProvisioningResult.Success(existingUser);
        }

        var normalizedEmail = profile.Email.Trim().ToLowerInvariant();
        var emailInUse = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(user => user.Email == normalizedEmail, ct);

        if (emailInUse)
        {
            return UserProvisioningResult.EmailConflict();
        }

        var user = User.Create(profile.Name, normalizedEmail);
        var externalIdentity = ExternalIdentity.Create(
            user.Id,
            profile.Issuer,
            profile.Subject,
            Provider);
        var personalHouse = House.CreatePersonal(user.Name, user.Id);

        dbContext.Users.Add(user);
        dbContext.ExternalIdentities.Add(externalIdentity);
        dbContext.Houses.Add(personalHouse);

        try
        {
            await dbContext.SaveChangesAsync(ct);
            return UserProvisioningResult.Success(user);
        }
        catch (DbUpdateException)
        {
            dbContext.ChangeTracker.Clear();
            var concurrentlyCreatedUser = await FindByIdentityAsync(profile, ct);
            if (concurrentlyCreatedUser is not null)
            {
                return UserProvisioningResult.Success(concurrentlyCreatedUser);
            }

            throw;
        }
    }

    private Task<User?> FindByIdentityAsync(
        EntraUserProfile profile,
        CancellationToken ct) =>
        dbContext.ExternalIdentities
            .AsNoTracking()
            .Where(identity => identity.Issuer == profile.Issuer
                && identity.Subject == profile.Subject)
            .Select(identity => identity.User)
            .SingleOrDefaultAsync(ct);
}

public sealed record UserProvisioningResult(User? User, bool HasEmailConflict)
{
    public static UserProvisioningResult Success(User user) => new(user, false);
    public static UserProvisioningResult EmailConflict() => new(null, true);
}