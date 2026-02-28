using SharePlate.Core.Entities;

namespace SharePlate.Core.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetForAuthenticationByEmailAsync(string email, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task<bool> IsPasswordResetRequiredAsync(Guid userId, CancellationToken ct = default);
}
