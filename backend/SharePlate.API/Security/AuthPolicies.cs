using System.Security.Claims;

namespace SharePlate.API.Security;

public static class AuthPolicies
{
    public const string ApiAccess = "ApiAccess";
    public const string SharePlateUser = "SharePlateUser";
    public const string RequiredScope = "access_as_user";

    private const string ScopeClaim = "scp";
    private const string MappedScopeClaim = "http://schemas.microsoft.com/identity/claims/scope";

    public static bool HasRequiredScope(ClaimsPrincipal principal) =>
        principal.FindAll(ScopeClaim)
            .Concat(principal.FindAll(MappedScopeClaim))
            .SelectMany(claim => claim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Contains(RequiredScope, StringComparer.Ordinal);
}