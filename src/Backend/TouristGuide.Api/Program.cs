using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using Microsoft.Extensions.FileProviders; 
using TouristGuide.Api.Data;
using TouristGuide.Api.Services;
using TouristGuide.Api.Interfaces;

    var builder = WebApplication.CreateBuilder(args);

    // ────────────────────────────────────────────────────────────
    // 1. CORS
    // ────────────────────────────────────────────────────────────
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontends", policy =>
        {
            policy
                .WithOrigins(
                    "http://localhost:4200",   // Admin Angular app
                    "http://localhost:4201"    // Turista Angular app
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
    });

    builder.Services.AddAuthorization();

// ────────────────────────────────────────────────────────────
// 3. REGISTRACIJA SERVISA
// ────────────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<EmailService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AdminIdentityService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<ILocationService, LocationService>();
builder.Services.AddSingleton<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<DatabaseSeeder>();
// Servis za Review-ove
builder.Services.AddScoped<IReviewService, ReviewService>();
    builder.Services.AddScoped<DatabaseSeeder>();

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
    // MigrateAsync kreira tabele i primjenjuje sve migracije.
    // Seeder puni početnim podacima ako su tabele prazne.
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

    app.UseHttpsRedirection();
    app.UseStaticFiles();
    app.UseCors("AllowFrontends");
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.Run();