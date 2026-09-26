using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SharePlate.Core.Constants.Auth;
using SharePlate.Infrastructure.Data;

namespace SharePlate.API.Security;

public sealed class ExternalIdentityResolutionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && EntraClaims.TryGetIdentityKey(context.User, out var issuer, out var subject))
        {
            var userId = await dbContext.ExternalIdentities
                .AsNoTracking()
                .Where(identity => identity.Issuer == issuer && identity.Subject == subject)
                .Select(identity => (Guid?)identity.UserId)
                .SingleOrDefaultAsync(context.RequestAborted);

            if (userId is not null && context.User.Identity is ClaimsIdentity claimsIdentity)
            {
                claimsIdentity.AddClaim(new Claim(AuthClaimTypes.UserId, userId.Value.ToString()));
            }
        }

        await next(context);
    }
}