using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace TouristGuide.Api.Services;

public static class DatabaseErrorClassifier
{
    public static bool IsUniqueViolation(DbUpdateException exception, string? constraintName = null)
    {
        var current = exception.InnerException;
        while (current is not null)
        {
            if (current is PostgresException postgresException &&
                postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
                (constraintName is null ||
                 string.Equals(postgresException.ConstraintName, constraintName, StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }

            current = current.InnerException;
        }

        return false;
    }
}
