using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using TouristGuide.Api.Data;
using TouristGuide.Api.Services;
using TouristGuide.Api.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// ────────────────────────────────────────────────────────────
// 1. CORS — dozvoljava frontendu da komunicira sa backendom
//    Bez ovoga browser blokira sve zahteve (sigurnosna politika)
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
            .AllowAnyHeader()    // Dozvoljava Authorization header
            .AllowAnyMethod()    // Dozvoljava GET, POST, PUT, DELETE
            .AllowCredentials(); // Dozvoljava slanje kolačića (ako zatreba)
    });
});

// ────────────────────────────────────────────────────────────
// 2. JWT AUTENTIFIKACIJA
//    Ovde kažemo .NET-u: "Tokene proveri ovako"
// ────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret nije postavljen u appsettings.json");

builder.Services.AddAuthentication(options =>
{
    // Podrazumevana šema je JWT Bearer
    // "Bearer" dolazi od toga što token "nosiš" (bear) uz zahtev
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        // Proveravamo ko je izdao token (mora biti "TouristGuideApi")
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],

        // Proveravamo kome je token namenjen
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],

        // Proveravamo da token nije istekao
        ValidateLifetime = true,

        // Proveravamo digitalni potpis — najvažnija provera
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSecret)
        ),

        // Bez tolerancije na razliku u vremenu između servera
        ClockSkew = TimeSpan.Zero
    };
});

// Autorizacija — sistem dozvola na osnovu uloga
builder.Services.AddAuthorization();

// ────────────────────────────────────────────────────────────
// 3. REGISTRACIJA SERVISA
// ────────────────────────────────────────────────────────────

// Naš JwtService — registrujemo ga da ga možemo ubrizgati u kontrolere
builder.Services.AddScoped<JwtService>();

// Potrebno za AdminIdentityService koji cita JWT claims van kontrolera
builder.Services.AddHttpContextAccessor();
// Pomocni servis koji odredjuje identitet prijavljenog admina iz tokena
builder.Services.AddScoped<AdminIdentityService>();

// Servis za lokacije (Admin panel)
builder.Services.AddScoped<ILocationService, LocationService>();

// Servis za Review-ove
builder.Services.AddScoped<IReviewService, ReviewService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ────────────────────────────────────────────────────────────
// 4. SWAGGER SA JWT PODRŠKOM
//    Dodaje "Authorize" dugme u Swagger UI da možemo testirati
// ────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TouristGuide API",
        Version = "v1"
    });

    // Definišemo kako se JWT šalje (u Authorization headeru)
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Unesi JWT token ovako: Bearer {token}"
    });

    // Kažemo Swagger-u da automatski šalje token uz zaštićene rute
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
});

// MySQL konekcija — ostaje isto
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    ));

var app = builder.Build();

// ────────────────────────────────────────────────────────────
// 5. MIDDLEWARE PIPELINE — redosled je bitan!
// ────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// CORS mora biti PRE autentifikacije
app.UseCors("AllowFrontends");

// Autentifikacija PRE autorizacije — uvek ovim redom
app.UseAuthentication();  // ← NOVO: "Ko si ti?"
app.UseAuthorization();   // ← postojeće: "Šta smeš da radiš?"

app.MapControllers();
app.Run();
