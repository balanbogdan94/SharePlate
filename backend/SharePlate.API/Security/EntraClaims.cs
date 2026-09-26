using System.Security.Claims;

namespace SharePlate.API.Security;

public static class EntraClaims
{
    private const string IssuerClaim = "iss";
    private const string ObjectIdClaim = "oid";
    private const string MappedObjectIdClaim = "http://schemas.microsoft.com/identity/claims/objectidentifier";
    private const string EmailClaim = "email";
    private const string EmailsClaim = "emails";
    private const string MappedEmailClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
    private const string PreferredUsernameClaim = "preferred_username";
    private const string NameClaim = "name";

    public static bool TryGetIdentityKey(
        ClaimsPrincipal principal,
        out string issuer,
        out string subject)
    {
        issuer = principal.FindFirstValue(IssuerClaim) ?? string.Empty;
        subject = principal.FindFirstValue(ObjectIdClaim)
            ?? principal.FindFirstValue(MappedObjectIdClaim)
            ?? string.Empty;

        return !string.IsNullOrWhiteSpace(issuer)
            && !string.IsNullOrWhiteSpace(subject);
    }

    public static bool TryGetProfile(
        ClaimsPrincipal principal,
        out EntraUserProfile profile)
    {
        profile = default!;

        if (!TryGetIdentityKey(principal, out var issuer, out var subject))
        {
            return false;
        }

        var email = principal.FindFirstValue(EmailsClaim)
            ?? principal.FindFirstValue(EmailClaim)
            ?? principal.FindFirstValue(MappedEmailClaim)
            ?? principal.FindFirstValue(PreferredUsernameClaim);

        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var name = principal.FindFirstValue(NameClaim);
        profile = new EntraUserProfile(
            issuer,
            subject,
            string.IsNullOrWhiteSpace(name) ? email : name,
            email);

        return true;
    }
}

public sealed record EntraUserProfile(
    string Issuer,
    string Subject,
    string Name,
    string Email);