using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Net.Http.Headers;
using System.Net;
using Microsoft.Extensions.FileProviders;
using System.IO;
using TouristGuide.Api.Data;
using TouristGuide.Api.Services;
using TouristGuide.Api.Interfaces;
using TouristGuide.Api.Services.Interfaces;
using TouristGuide.Api.Services.Ai;

var builder = WebApplication.CreateBuilder(args);
var dataProtectionPath = Path.Combine(AppContext.BaseDirectory, "App_Data", "DataProtectionKeys");

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
            policy.WithOrigins(
                "http://softeng.pmf.kg.ac.rs:10181",    // Admin HTTP
                "http://softeng.pmf.kg.ac.rs:10183",    // Turista HTTP
                "https://softeng.pmf.kg.ac.rs:10188",   // Admin HTTPS
                "https://softeng.pmf.kg.ac.rs:10187",    // Turista HTTPS
                "http://localhost:4200",                // Admin Angular app (lokalni razvoj)
                "http://localhost:4201"                 // Turista Angular app (lokalni razvoj)
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ────────────────────────────────────────────────────────────
// 2. JWT AUTENTIFIKACIJA
// ────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret nije postavljen u appsettings.json");

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
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
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
builder.Services.AddScoped<AdminPermissionService>();
builder.Services.AddScoped<ILocationService, LocationService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IAiTourismQueryService, AiTourismQueryService>();
builder.Services.AddSingleton<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<DatabaseSeeder>();

// ── Anthropic HTTP klijent (za AI chat proxy) ──────────────────────────────
builder.Services.AddHttpClient("AnthropicApi", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Accept.Add(
        new MediaTypeWithQualityHeaderValue("application/json"));
});

// ── SignalR ────────────────────────────────────────────────────────────
builder.Services.AddSignalR();
builder.Services.AddScoped<NotificationService>();


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

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
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

var app = builder.Build();

// ────────────────────────────────────────────────────────────
// 6. MIGRACIJE + SEED
// ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    await seeder.SeedAsync();
}

// ────────────────────────────────────────────────────────────
// 7. MIDDLEWARE PIPELINE
// ────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseWhen(
    context => !IsLoopbackRequest(context),
    branch => branch.UseHttpsRedirection());

var imagesPhysicalPath = Path.Combine(app.Environment.ContentRootPath, "images");
Directory.CreateDirectory(imagesPhysicalPath);
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
app.UseAuthorization();
app.MapControllers();

// ── SignalR Hub ────────────────────────────────────────────────────────
app.MapHub<TouristGuide.Api.Hubs.AdminNotificationHub>("/hubs/notifications");

app.Run();

static bool IsLoopbackRequest(HttpContext context)
{
    var remoteIp = context.Connection.RemoteIpAddress;
    return remoteIp is not null && IPAddress.IsLoopback(remoteIp);
}
