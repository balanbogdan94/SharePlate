using System.Security.Claims;
using SharePlate.Core.Constants.Auth;

namespace SharePlate.Core.Extensions.Security;

public static class ClaimsPrincipalExtensions
{
    private const string SubjectClaimType = "sub";

    public static bool TryGetUserId(this ClaimsPrincipal principal, out Guid userId)
    {
        userId = Guid.Empty;

        var claimValue = principal.FindFirst(AuthClaimTypes.UserId)?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst(SubjectClaimType)?.Value;

        if (!Guid.TryParse(claimValue, out var parsedUserId))
        {
            return false;
        }

        userId = parsedUserId;
        return true;
    }
}
