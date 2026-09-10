using System.Security.Claims;
using SharePlate.Core.Constants.Auth;

namespace SharePlate.Core.Extensions.Security;

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal principal, out Guid userId)
    {
        userId = Guid.Empty;

        var claimValue = principal.FindFirst(AuthClaimTypes.UserId)?.Value;

        if (!Guid.TryParse(claimValue, out var parsedUserId))
        {
            return false;
        }

        userId = parsedUserId;
        return true;
    }
}
