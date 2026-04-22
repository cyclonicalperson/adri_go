using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
// 👇 DODATO: Neophodno za čitanje foldera sa slikama
using Microsoft.Extensions.FileProviders; 
using TouristGuide.Api.Data;
using TouristGuide.Api.Services;
using TouristGuide.Api.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// ────────────────────────────────────────────────────────────
// 1. CORS — dozvoljava frontendu da komunicira sa backendom
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
            .AllowCredentials(); // Dozvoljava slanje kolačića
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
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSecret)
        ),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ────────────────────────────────────────────────────────────
// 3. REGISTRACIJA SERVISA
// ────────────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AdminIdentityService>();
builder.Services.AddScoped<AdminPermissionService>();
builder.Services.AddScoped<ILocationService, LocationService>();

// Servis za Review-ove
builder.Services.AddScoped<IReviewService, ReviewService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ────────────────────────────────────────────────────────────
// 4. SWAGGER SA JWT PODRŠKOM
// ────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TouristGuide API",
        Version = "v1"
    });

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

// MySQL konekcija
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    ));

var app = builder.Build();

// ────────────────────────────────────────────────────────────
// 5. MIDDLEWARE PIPELINE — Redosled je izuzetno bitan!
// ────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// 👇 NOVO: Omogućava pristup osnovnim statičkim fajlovima (iz wwwroot)
app.UseStaticFiles();

// 👇 NOVO: Omogućava direktan pristup tvom "images" folderu
// 👇 Pametni deo: Proverava da li folder postoji, a ako ne, pravi ga!
var imagesPath = Path.Combine(builder.Environment.ContentRootPath, "images");
if (!Directory.Exists(imagesPath))
{
    Directory.CreateDirectory(imagesPath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(imagesPath),
    RequestPath = "/images"
});

// CORS mora biti PRE autentifikacije
app.UseCors("AllowFrontends");

// Autentifikacija PRE autorizacije
app.UseAuthentication();  
app.UseAuthorization();   

app.MapControllers();
app.Run();
