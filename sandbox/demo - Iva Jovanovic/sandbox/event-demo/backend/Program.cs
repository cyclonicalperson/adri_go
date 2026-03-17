using System.Text;
using EventDemo.Api.Data;
using EventDemo.Api.Services;
using EventDemo.Api.Services.Interfaces;
using EventDemo.Api.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MySql.Data.MySqlClient;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var configuredConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("The 'DefaultConnection' connection string is not configured.");
var connectionString = BuildLocalMySqlConnectionString(configuredConnectionString);

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var jwtSettingsSection = builder.Configuration.GetSection(JwtSettings.SectionName);
var jwtSettings = jwtSettingsSection.Get<JwtSettings>()
    ?? throw new InvalidOperationException("The 'Jwt' configuration section is not configured.");

builder.Services.Configure<JwtSettings>(jwtSettingsSection);

builder.Services.AddDbContext<EventDemoDbContext>(options =>
    options.UseMySQL(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularClient", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

builder.Services.AddScoped<IAdminAuthService, AdminAuthService>();
builder.Services.AddScoped<IAdminEventService, AdminEventService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IRegistrationService, RegistrationService>();

var app = builder.Build();

await VerifyDatabaseConnectivityAsync(app.Services, app.Logger);

app.UseCors("AngularClient");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static string BuildLocalMySqlConnectionString(string connectionString)
{
    var builder = new MySqlConnectionStringBuilder(connectionString);

    if (string.IsNullOrWhiteSpace(builder.Server) ||
        string.Equals(builder.Server, "localhost", StringComparison.OrdinalIgnoreCase))
    {
        builder.Server = "127.0.0.1";
    }

    if (builder.Port == 0)
    {
        builder.Port = 3306;
    }

    builder["SslMode"] = "Disabled";
    builder["AllowPublicKeyRetrieval"] = true;
    builder["Pooling"] = true;

    if (builder.ConnectionTimeout == 0)
    {
        builder.ConnectionTimeout = 15;
    }

    if (builder.DefaultCommandTimeout == 0)
    {
        builder.DefaultCommandTimeout = 30;
    }

    return builder.ConnectionString;
}

static async Task VerifyDatabaseConnectivityAsync(IServiceProvider services, ILogger logger)
{
    await using var scope = services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<EventDemoDbContext>();

    try
    {
        await dbContext.Database.OpenConnectionAsync();

        await using var command = dbContext.Database.GetDbConnection().CreateCommand();
        command.CommandText = "SELECT 1";
        command.CommandTimeout = 10;

        await command.ExecuteScalarAsync();

        logger.LogInformation("Database startup check succeeded.");
    }
    catch (Exception exception)
    {
        logger.LogCritical(
            exception,
            "Database startup check failed. Verify MySQL is running and that the configured local credentials and transport settings are valid.");

        throw new InvalidOperationException(
            "Database startup check failed. The API will not start until the MySQL connection succeeds.",
            exception);
    }
    finally
    {
        await dbContext.Database.CloseConnectionAsync();
    }
}
