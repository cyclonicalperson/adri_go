using System.Data;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;

namespace TouristGuide.Api.Services;

public sealed class DatabaseTransactionRunner
{
    private readonly AppDbContext _db;

    public DatabaseTransactionRunner(AppDbContext db)
    {
        _db = db;
    }

    public async Task ExecuteAsync(
        Func<CancellationToken, Task> action,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default)
    {
        await ExecuteAsync<object?>(
            async ct =>
            {
                await action(ct);
                return null;
            },
            isolationLevel,
            cancellationToken);
    }

    public async Task<T> ExecuteAsync<T>(
        Func<CancellationToken, Task<T>> action,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default)
    {
        if (_db.Database.CurrentTransaction is not null)
            return await action(cancellationToken);

        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(isolationLevel, cancellationToken);
            var result = await action(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        });
    }
}
