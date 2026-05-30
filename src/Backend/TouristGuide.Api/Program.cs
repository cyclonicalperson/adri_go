using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Net.Http.Headers;
using System.Net;
using System.IO.Compression;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.Extensions.FileProviders;
using System.IO;
using TouristGuide.Api.Data;
using TouristGuide.Api.Services;
using TouristGuide.Api.Interfaces;
using TouristGuide.Api.Services.Interfaces;
using TouristGuide.Api.Services.Ai;

var builder = WebApplication.CreateBuilder(args);
var dataProtectionPath = Path.Combine(AppContext.BaseDirectory, "App_Data", "DataProtectionKeys");
var configuredCorsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];
var dbContextPoolSize = Math.Clamp(builder.Configuration.GetValue("Performance:DbContextPoolSize", 256), 32, 2048);
var rateLimitPermitLimit = Math.Clamp(builder.Configuration.GetValue("Performance:RateLimit:PermitLimit", 240), 60, 5000);
var rateLimitQueueLimit = Math.Clamp(builder.Configuration.GetValue("Performance:RateLimit:QueueLimit", 40), 0, 1000);
var rateLimitWindowSeconds = Math.Clamp(builder.Configuration.GetValue("Performance:RateLimit:WindowSeconds", 60), 10, 3600);
var rateLimitSegmentsPerWindow = Math.Clamp(builder.Configuration.GetValue("Performance:RateLimit:SegmentsPerWindow", 6), 1, 60);

Directory.CreateDirectory(dataProtectionPath);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services
    .AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionPath))
    .SetApplicationName("TouristGuide.Api");

// ────────────────────────────────────────────────────────────
// 1. CORS
// ────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontends", policy =>
    {
            var origins = configuredCorsOrigins.Length > 0
                ? configuredCorsOrigins
                : builder.Environment.IsDevelopment()
                    ? ["http://localhost:4200", "http://localhost:4201"]
                    : throw new InvalidOperationException("Cors:AllowedOrigins must be configured outside Development.");

            if (builder.Environment.IsDevelopment())
            {
                origins = origins
                    .Concat(["http://localhost:4200", "http://localhost:4201"])
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
            }

            policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ────────────────────────────────────────────────────────────
// 2. JWT AUTENTIFIKACIJA
// ────────────────────────────────────────────────────────────
var jwtSecret = GetRequiredSecret(
    builder.Configuration,
    "Jwt:Secret",
    minimumLength: 32,
    allowDevelopmentFallback: builder.Environment.IsDevelopment());
var jwtIssuer = GetRequiredSetting(builder.Configuration, "Jwt:Issuer");
var jwtAudience = GetRequiredSetting(builder.Configuration, "Jwt:Audience");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                context.Token = accessToken;
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// ────────────────────────────────────────────────────────────
// 3. REGISTRACIJA SERVISA
// ────────────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<AdminIdentityService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IReviewModerationService, ReviewModerationService>();
builder.Services.AddScoped<AdminPermissionService>();
builder.Services.AddScoped<UniversalAdminPasswordService>();
builder.Services.AddScoped<ILocationService, LocationService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IAiTourismQueryService, AiTourismQueryService>();
builder.Services.AddSingleton<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<DatabaseSeeder>();
builder.Services.AddScoped<TouristNotificationService>();
builder.Services.AddScoped<RouteSafetyService>();
builder.Services.AddScoped<DatabaseTransactionRunner>();

// ── Anthropic HTTP klijent (za AI chat proxy) ──────────────────────────────
builder.Services.AddHttpClient("AnthropicApi", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Accept.Add(
        new MediaTypeWithQualityHeaderValue("application/json"));
});

builder.Services.AddHttpClient("Gemini", client =>
{
    client.Timeout = TimeSpan.FromSeconds(8);
    client.DefaultRequestHeaders.Accept.Add(
        new MediaTypeWithQualityHeaderValue("application/json"));
});

builder.Services.AddHttpClient("RouteValidation", client =>
{
    client.Timeout = TimeSpan.FromSeconds(8);
});

// ── SignalR ────────────────────────────────────────────────────────────
builder.Services.AddHttpClient("GoogleTokenInfo", client =>
{
    client.BaseAddress = new Uri("https://oauth2.googleapis.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddSignalR();
builder.Services.AddScoped<NotificationService>();


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/json"]);
});
builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetRateLimitPartitionKey(context),
            _ => new SlidingWindowRateLimiterOptions
            {
                QueueLimit = rateLimitQueueLimit,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                PermitLimit = rateLimitPermitLimit,
                SegmentsPerWindow = rateLimitSegmentsPerWindow,
                Window = TimeSpan.FromSeconds(rateLimitWindowSeconds)
            }));
});

// ────────────────────────────────────────────────────────────
// 4. SWAGGER SA JWT PODRŠKOM
// ────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "TouristGuide API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Unesi JWT token ovako: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
});

// ────────────────────────────────────────────────────────────
// 5. POSTGRESQL KONEKCIJA
// ────────────────────────────────────────────────────────────
builder.Services.AddDbContextPool<AppDbContext>(options =>
    options.UseNpgsql(
        GetRequiredSetting(builder.Configuration, "ConnectionStrings:DefaultConnection"),
        npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorCodesToAdd: null);
            npgsqlOptions.CommandTimeout(30);
        }
    ),
    poolSize: dbContextPoolSize);

var app = builder.Build();

// ────────────────────────────────────────────────────────────
// 6. MIGRACIJE + SEED
// ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.OpenConnectionAsync();
    try
    {
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_lock(902100501);");
        await db.Database.MigrateAsync();

        var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
        await seeder.SeedAsync();
    }
    finally
    {
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_unlock(902100501);");
        await db.Database.CloseConnectionAsync();
    }
}

// ────────────────────────────────────────────────────────────
// 7. MIDDLEWARE PIPELINE
// ────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.Use(async (context, next) =>
{
    context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
    context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
    context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");
    context.Response.Headers.TryAdd("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    await next();
});

app.UseWhen(
    context => !IsLoopbackRequest(context),
    branch => branch.UseHttpsRedirection());

app.UseResponseCompression();

var imagesPhysicalPath = Path.Combine(app.Environment.ContentRootPath, "images");
Directory.CreateDirectory(imagesPhysicalPath);
app.MapWhen(
    context => context.Request.Path.StartsWithSegments("/images/verification-documents"),
    branch => branch.Run(context =>
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return Task.CompletedTask;
    }));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(imagesPhysicalPath),
    RequestPath = "/images",
});

if (Directory.Exists(app.Environment.WebRootPath))
{
    app.UseStaticFiles();
}

app.UseCors("AllowFrontends");
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

// ── SignalR Hub ────────────────────────────────────────────────────────
app.MapHub<TouristGuide.Api.Hubs.AdminNotificationHub>("/hubs/notifications");
app.MapHub<TouristGuide.Api.Hubs.TouristNotificationHub>("/hubs/tourist-notifications");

app.Run();

static bool IsLoopbackRequest(HttpContext context)
{
    var remoteIp = context.Connection.RemoteIpAddress;
    return remoteIp is not null && IPAddress.IsLoopback(remoteIp);
}

static string GetRateLimitPartitionKey(HttpContext context)
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? context.User.FindFirstValue("sub");

    if (!string.IsNullOrWhiteSpace(userId))
        return $"user:{userId}";

    var remoteIp = context.Connection.RemoteIpAddress?.ToString();
    return string.IsNullOrWhiteSpace(remoteIp)
        ? "anonymous:unknown"
        : $"ip:{remoteIp}";
}

static string GetRequiredSecret(
    IConfiguration configuration,
    string key,
    int minimumLength,
    bool allowDevelopmentFallback = false)
{
    var value = configuration[key];
    if (string.IsNullOrWhiteSpace(value) || value.Length < minimumLength)
    {
        if (allowDevelopmentFallback)
            return "DevelopmentOnlyJwtSecretForLocalRuns-ChangeBeforeProduction-2026";

        throw new InvalidOperationException($"{key} must be provided through environment variables or a local secret store and be at least {minimumLength} characters long.");
    }

    return value;
}

static string GetRequiredSetting(IConfiguration configuration, string key)
{
    var value = configuration[key];
    if (string.IsNullOrWhiteSpace(value))
    {
        throw new InvalidOperationException($"{key} must be configured.");
    }

    return value;
}
