using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using BCrypt.Net;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Pokrenuti pri svakom startu aplikacije.
    /// 1. Kreira sve tabele ako ne postoje (EnsureCreated).
    /// 2. Puni bazu početnim podacima ako je prazna.
    /// </summary>
    public class DatabaseSeeder
    {
        private readonly AppDbContext _db;
        private readonly ILogger<DatabaseSeeder> _logger;

        public DatabaseSeeder(AppDbContext db, ILogger<DatabaseSeeder> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task SeedAsync()
        {
            // ── Kreira sve tabele ako ne postoje (bez brisanja podataka) ──
            _logger.LogInformation("[Seed] Provjera i kreiranje tabela...");
            await _db.Database.EnsureCreatedAsync();
            _logger.LogInformation("[Seed] Tabele su OK.");

            // ── Seed ide redom jer postoje FK zavisnosti ──
            await SeedOrganizationsAsync();
            await SeedAdminUsersAsync();
            await SeedRegionsAsync();
            await SeedTagsAsync();
            await SeedTouristsAsync();
            await SeedPostsAsync();
            await SeedPostTagsAsync();
            await SeedRoutesAsync();
            await SeedInteractionsAsync();
            await SeedReviewsAsync();
            await SeedNotificationsAsync();

            _logger.LogInformation("[Seed] Seed završen.");
        }

        // ────────────────────────────────────────────────────────────────────
        //  ORGANIZACIJE
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedOrganizationsAsync()
        {
            if (await _db.Organizations.AnyAsync()) return;
            _logger.LogInformation("[Seed] Organizacije...");

            _db.Organizations.AddRange(
                new Organization { Name = "NP Durmitor", Type = "government", ContactEmail = "info@npdurmitor.me", IsVerified = true },
                new Organization { Name = "TO Žabljak", Type = "tourism", ContactEmail = "info@tozabljak.me", IsVerified = true },
                new Organization { Name = "Ski centar Durmitor", Type = "sports", ContactEmail = "info@skidurmitor.me", IsVerified = true },
                new Organization { Name = "TO Budva", Type = "tourism", ContactEmail = "info@budva.travel", IsVerified = true },
                new Organization { Name = "TO Kotor", Type = "tourism", ContactEmail = "info@kotor.travel", IsVerified = true },
                new Organization { Name = "Adventure Montenegro", Type = "private", ContactEmail = "info@adventureme.com", IsVerified = false }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  ADMIN KORISNICI
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedAdminUsersAsync()
        {
            if (await _db.AdminUsers.AnyAsync()) return;
            _logger.LogInformation("[Seed] Admin korisnici...");

            // BCrypt hash — isti cost factor kao u originalnoj bazi (12)
            string superHash = BCrypt.Net.BCrypt.HashPassword("Admin123!", workFactor: 12);
            string adminHash = BCrypt.Net.BCrypt.HashPassword("Admin123!", workFactor: 12);
            string suspHash = BCrypt.Net.BCrypt.HashPassword("Admin123!", workFactor: 12);

            _db.AdminUsers.AddRange(
                // SuperAdmin
                new AdminUser
                {
                    FullName = "Super Admin",
                    Email = "superadmin@touristguide.me",
                    PasswordHash = superHash,
                    Role = "superadmin",
                    AccountStatus = "active",
                    IsIndividual = true,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                // Admini
                new AdminUser
                {
                    OrganizationId = 1,
                    FullName = "Ana Kovačević",
                    Email = "ana.kovacevic@zabljak.travel",
                    PasswordHash = adminHash,
                    Role = "admin",
                    AccountStatus = "active",
                    IsIndividual = false,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AdminUser
                {
                    OrganizationId = 1,
                    FullName = "Nikola Đurić",
                    Email = "nikola.djuric@npdurmitor.me",
                    PasswordHash = adminHash,
                    Role = "admin",
                    AccountStatus = "active",
                    IsIndividual = false,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AdminUser
                {
                    FullName = "Marija Petrović",
                    Email = "marija.p@touristguide.me",
                    PasswordHash = adminHash,
                    Role = "admin",
                    AccountStatus = "active",
                    IsIndividual = true,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AdminUser
                {
                    OrganizationId = 2,
                    FullName = "Dragana Milić",
                    Email = "dragana.m@tozabljak.me",
                    PasswordHash = adminHash,
                    Role = "admin",
                    AccountStatus = "active",
                    IsIndividual = false,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AdminUser
                {
                    OrganizationId = 3,
                    FullName = "Stefan Vukovic",
                    Email = "stefan.v@skidurmitor.me",
                    PasswordHash = adminHash,
                    Role = "admin",
                    AccountStatus = "active",
                    IsIndividual = false,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AdminUser
                {
                    OrganizationId = 4,
                    FullName = "Ivana Jovanović",
                    Email = "ivana.j@budva.travel",
                    PasswordHash = adminHash,
                    Role = "admin",
                    AccountStatus = "active",
                    IsIndividual = false,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AdminUser
                {
                    OrganizationId = 5,
                    FullName = "Aleksandar Bošković",
                    Email = "aleksandar.b@kotor.travel",
                    PasswordHash = adminHash,
                    Role = "admin",
                    AccountStatus = "active",
                    IsIndividual = false,
                    EmailVerifiedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                // Suspendovan admin (za testiranje login-a)
                new AdminUser
                {
                    FullName = "Dragan Lazović",
                    Email = "dragan.lazovic@outdoorme.me",
                    PasswordHash = suspHash,
                    Role = "admin",
                    AccountStatus = "suspended",
                    IsIndividual = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  REGIJE
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedRegionsAsync()
        {
            if (await _db.Regions.AnyAsync()) return;
            _logger.LogInformation("[Seed] Regije...");

            _db.Regions.AddRange(
                new Region { Name = "Žabljak", Type = "city", Description = "Planinski grad na Durmitoru, najviši grad na Balkanu.", Country = "Montenegro", Lat = 43.1556m, Lng = 19.1225m, CoverImage = "/images/regions/zabljak.jpg" },
                new Region { Name = "Durmitor", Type = "national_park", Description = "Nacionalni park UNESCO svjetske baštine sa 18 ledničkih jezera.", Country = "Montenegro", Lat = 43.1500m, Lng = 19.0167m, CoverImage = "/images/regions/durmitor.jpg" },
                new Region { Name = "Crno jezero", Type = "lake", Description = "Najpoznatije jezero Durmitora.", Country = "Montenegro", Lat = 43.1378m, Lng = 19.0644m, CoverImage = "/images/regions/crnojezero.jpg" },
                new Region { Name = "Tara kanjon", Type = "national_park", Description = "Najdublji kanjon u Evropi.", Country = "Montenegro", Lat = 43.2000m, Lng = 19.2500m, CoverImage = "/images/regions/tara.jpg" },
                new Region { Name = "Budva", Type = "city", Description = "Najpoznatije turističko odredište Crnogorskog primorja.", Country = "Montenegro", Lat = 42.2864m, Lng = 18.8400m, CoverImage = "/images/regions/budva.jpg" },
                new Region { Name = "Kotor", Type = "city", Description = "UNESCO zaštićeni stari grad sa venetskom arhitekturom.", Country = "Montenegro", Lat = 42.4247m, Lng = 18.7712m, CoverImage = "/images/regions/kotor.jpg" },
                new Region { Name = "Herceg Novi", Type = "city", Description = "Grad cvijeća na ulazu u Bokokotorski zaliv.", Country = "Montenegro", Lat = 42.4531m, Lng = 18.5375m, CoverImage = "/images/regions/hercegnovi.jpg" },
                new Region { Name = "Ulcinj", Type = "city", Description = "Najjužniji grad Crne Gore, poznata dugačka plaža.", Country = "Montenegro", Lat = 41.9292m, Lng = 19.2253m, CoverImage = "/images/regions/ulcinj.jpg" },
                new Region { Name = "Sveti Stefan", Type = "village", Description = "Ikonski hotelijerski otočić — simbol crnogorskog turizma.", Country = "Montenegro", Lat = 42.2561m, Lng = 18.8925m, CoverImage = "/images/regions/svetistefan.jpg" },
                new Region { Name = "Podgorica", Type = "city", Description = "Glavni grad Crne Gore.", Country = "Montenegro", Lat = 42.4304m, Lng = 19.2594m, CoverImage = "/images/regions/podgorica.jpg" },
                new Region { Name = "Skadarsko jezero", Type = "lake", Description = "Najveće jezero na Balkanu, raj za ptice.", Country = "Montenegro", Lat = 42.1667m, Lng = 19.2833m, CoverImage = "/images/regions/skadar.jpg" },
                new Region { Name = "Cetinje", Type = "city", Description = "Stara prijestolnica Crne Gore.", Country = "Montenegro", Lat = 42.3906m, Lng = 18.9228m, CoverImage = "/images/regions/cetinje.jpg" }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  TAGOVI
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedTagsAsync()
        {
            if (await _db.Tags.AnyAsync()) return;
            _logger.LogInformation("[Seed] Tagovi...");

            _db.Tags.AddRange(
                // Aktivnosti
                new Tag { Name = "Pješačenje", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved" },
                new Tag { Name = "Biciklizam", Category = "aktivnost", Color = "SPORT|#3b82f6|approved" },
                new Tag { Name = "Plivanje", Category = "aktivnost", Color = "SPORT|#3b82f6|approved" },
                new Tag { Name = "Noćni život", Category = "aktivnost", Color = "NIGHTLIFE|#1e1b4b|approved" },
                new Tag { Name = "Sport", Category = "aktivnost", Color = "SPORT|#3b82f6|approved" },
                new Tag { Name = "Adrenalin", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved" },
                new Tag { Name = "Priroda", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved" },
                new Tag { Name = "Muzika", Category = "aktivnost", Color = "NIGHTLIFE|#1e1b4b|approved" },
                new Tag { Name = "Gastronomija", Category = "aktivnost", Color = "DINING|#ef4444|approved" },
                new Tag { Name = "Outdoor", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved" },
                new Tag { Name = "Wellness", Category = "aktivnost", Color = "WELLNESS|#8b5cf6|approved" },
                new Tag { Name = "Rafting", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved" },
                new Tag { Name = "Skijanje", Category = "aktivnost", Color = "SPORT|#3b82f6|approved" },
                new Tag { Name = "Ronjenje", Category = "aktivnost", Color = "SPORT|#3b82f6|approved" },
                new Tag { Name = "Kultura", Category = "aktivnost", Color = "CULTURE|#ec4899|approved" },
                new Tag { Name = "Razgledanje", Category = "aktivnost", Color = "SIGHTSEEING|#06b6d4|approved" },
                new Tag { Name = "Fotografija", Category = "aktivnost", Color = "SIGHTSEEING|#06b6d4|approved" },
                new Tag { Name = "Shopping", Category = "aktivnost", Color = "SHOPPING|#f59e0b|approved" },
                new Tag { Name = "Yoga", Category = "aktivnost", Color = "WELLNESS|#8b5cf6|pending" },
                new Tag { Name = "Paraglajding", Category = "aktivnost", Color = "ADVENTURE|#22c55e|pending" },
                // Stilovi
                new Tag { Name = "Porodično", Category = "stil", Color = "#4A90E2" },
                new Tag { Name = "Romantično", Category = "stil", Color = "#E24A7C" },
                new Tag { Name = "Besplatno", Category = "cijena", Color = "#27AE60" },
                new Tag { Name = "Parking", Category = "amenity", Color = "#7F8C8D" },
                new Tag { Name = "WiFi", Category = "amenity", Color = "#2980B9" },
                new Tag { Name = "UNESCO", Category = "oznaka", Color = "#C0392B" },
                new Tag { Name = "Historijsko", Category = "oznaka", Color = "#D35400" },
                new Tag { Name = "Kulturno", Category = "oznaka", Color = "#9B59B6" },
                new Tag { Name = "Restoran", Category = "tip", Color = "#E74C3C" },
                new Tag { Name = "Kafić", Category = "tip", Color = "#935116" }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  TURISTI
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedTouristsAsync()
        {
            if (await _db.Tourists.AnyAsync()) return;
            _logger.LogInformation("[Seed] Turisti...");

            string tHash = BCrypt.Net.BCrypt.HashPassword("Tourist123!", workFactor: 12);

            _db.Tourists.AddRange(
                new Tourist { Name = "Emma Wilson", Email = "emma.wilson@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "en", Interests = """["hiking","nature","photography","culture"]""" },
                new Tourist { Name = "Luca Rossi", Email = "luca.rossi@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "en", Interests = """["food","nightlife","beach","history"]""" },
                new Tourist { Name = "Jana Novák", Email = "jana.novak@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "de", Interests = """["hiking","skiing","culture","family"]""" },
                new Tourist { Name = "Aleksandra Popović", Email = "aleksandra.p@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "sr", Interests = """["nature","culture","food"]""" },
                new Tourist { Name = "Thomas Müller", Email = "thomas.m@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "de", Interests = """["skiing","adventure","sport"]""" },
                new Tourist { Name = "Sofia García", Email = "sofia.garcia@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "en", Interests = """["beach","food","culture","nightlife"]""" },
                new Tourist { Name = "Andrei Popescu", Email = "andrei.p@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "en", Interests = """["adventure","hiking","photography"]""" },
                new Tourist { Name = "Yuki Tanaka", Email = "yuki.t@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "en", Interests = """["culture","food","sightseeing"]""" },
                new Tourist { Name = "Mohammed Al-Rashid", Email = "mohammed.r@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "en", Interests = """["culture","history","food"]""" },
                new Tourist { Name = "Klara Svensson", Email = "klara.s@gmail.com", PasswordHash = tHash, IsEmailVerified = true, Language = "en", Interests = """["nature","hiking","wellness"]""" }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  OBJAVE (POSTS)
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedPostsAsync()
        {
            if (await _db.Posts.AnyAsync()) return;
            _logger.LogInformation("[Seed] Objave...");

            // Slike se čuvaju kao JSON niz putanja — URL-ovi koji se serviraju
            // preko /images/posts/ static files endpointa.
            // Nema podataka u bazi — samo putanje ka fajlovima na disku.

            _db.Posts.AddRange(
                // ── SMJEŠTAJ ─────────────────────────────────────────────────
                new Post
                {
                    AdminId = 5,
                    RegionId = 1,
                    Title = "Hotel Jezera Žabljak",
                    PostType = "accommodation",
                    Description = "Četvorozvjezdičani hotel smješten na obali Crnog jezera. Panoramski pogled na Durmitor, restoran, spa i besplatan ski servis.",
                    Lat = 43.1378m,
                    Lng = 19.0644m,
                    Address = "Žabljak bb, 84210 Žabljak",
                    ExternalUrl = "https://www.booking.com/hotel/me/jezera-zabljak.html",
                    ExternalUrlLabel = "Rezerviši na Booking",
                    Images = """["/images/posts/jezera1.jpg","/images/posts/jezera2.jpg","/images/posts/jezera3.jpg"]""",
                    OpeningHours = """{"mon":"00:00-24:00","tue":"00:00-24:00","wed":"00:00-24:00","thu":"00:00-24:00","fri":"00:00-24:00","sat":"00:00-24:00","sun":"00:00-24:00"}""",
                    Details = """{"stars":4,"rooms":86,"price_from":85,"currency":"EUR","amenities":["spa","restaurant","ski_service","parking","wifi","pool"]}""",
                    Status = "published",
                    ViewCount = 312,
                    LikeCount = 47,
                    SaveCount = 28,
                    ReviewCount = 6,
                    AvgRating = 4.58m,
                    PublishedAt = new DateTime(2024, 3, 1, 9, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 2,
                    RegionId = 1,
                    Title = "Apartmani Durmitor View",
                    PostType = "accommodation",
                    Description = "Privatni apartmani sa pogledom na Durmitor. Potpuno opremljeni, idealni za porodice. Besplatan parking i WiFi.",
                    Lat = 43.1570m,
                    Lng = 19.1235m,
                    Address = "Vuka Karadžića 8, Žabljak",
                    ExternalUrl = "https://www.airbnb.com/rooms/durmitorview",
                    ExternalUrlLabel = "Rezerviši na Airbnb",
                    Images = """["/images/posts/apt1.jpg","/images/posts/apt2.jpg"]""",
                    Details = """{"price_from":45,"currency":"EUR","num_apartments":6,"amenities":["parking","wifi","kitchen","bbq"]}""",
                    Status = "published",
                    ViewCount = 178,
                    LikeCount = 31,
                    SaveCount = 19,
                    ReviewCount = 3,
                    AvgRating = 4.33m,
                    PublishedAt = new DateTime(2024, 3, 20, 10, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 7,
                    RegionId = 5,
                    Title = "Hotel Avala Budva",
                    PostType = "accommodation",
                    Description = "Luksuzni hotel tik uz plažu u Budvi. Bazen, wellness, 5 restorana i direktan izlaz na more.",
                    Lat = 42.2837m,
                    Lng = 18.8412m,
                    Address = "Mediteranska bb, Budva",
                    ExternalUrl = "https://www.booking.com/hotel/me/avala.html",
                    ExternalUrlLabel = "Rezerviši",
                    Images = """["/images/posts/avala1.jpg","/images/posts/avala2.jpg"]""",
                    Details = """{"stars":5,"rooms":204,"price_from":180,"currency":"EUR"}""",
                    Status = "published",
                    ViewCount = 445,
                    LikeCount = 89,
                    SaveCount = 52,
                    PublishedAt = new DateTime(2024, 4, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 7,
                    RegionId = 5,
                    Title = "Boutique apartmani Mogren (nacrt)",
                    PostType = "accommodation",
                    Description = "Novi apartmani na Mogren plaži. U pripremi za sezonu 2025.",
                    Lat = 42.2780m,
                    Lng = 18.8350m,
                    Address = "Mogren bb, Budva",
                    Details = """{"price_from":70,"currency":"EUR"}""",
                    Status = "draft"
                },
                // ── RESTORANI ────────────────────────────────────────────────
                new Post
                {
                    AdminId = 5,
                    RegionId = 1,
                    Title = "Restoran Soa",
                    PostType = "restaurant",
                    Description = "Tradicionalna crnogorska kuhinja sa lokalno uzgojenim namirnicama. Specijalitet: jagnjetina ispod sača.",
                    Lat = 43.1556m,
                    Lng = 19.1225m,
                    Address = "Njegoševa 12, Žabljak",
                    Images = """["/images/posts/soa1.jpg","/images/posts/soa2.jpg"]""",
                    OpeningHours = """{"mon":"12:00-22:00","tue":"12:00-22:00","wed":"12:00-22:00","thu":"12:00-22:00","fri":"12:00-23:00","sat":"12:00-23:00","sun":"12:00-21:00"}""",
                    Details = """{"cuisine":"Montenegrin","price_range":"€€","capacity":60}""",
                    Status = "published",
                    ViewCount = 201,
                    LikeCount = 38,
                    ReviewCount = 4,
                    AvgRating = 4.50m,
                    PublishedAt = new DateTime(2024, 3, 5, 10, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 7,
                    RegionId = 5,
                    Title = "Konoba Portun Budva",
                    PostType = "restaurant",
                    Description = "Riblja konoba u starom gradu Budve. Svježe ribe i plodovi mora direktno iz Jadranskog mora.",
                    Lat = 42.2791m,
                    Lng = 18.8378m,
                    Address = "Stari grad, Budva",
                    Images = """["/images/posts/portun1.jpg","/images/posts/portun2.jpg"]""",
                    OpeningHours = """{"mon":"12:00-23:00","tue":"12:00-23:00","wed":"12:00-23:00","thu":"12:00-23:00","fri":"12:00-24:00","sat":"12:00-24:00","sun":"12:00-22:00"}""",
                    Details = """{"cuisine":"Seafood","price_range":"€€€","capacity":45}""",
                    Status = "published",
                    ViewCount = 167,
                    LikeCount = 29,
                    ReviewCount = 3,
                    AvgRating = 4.67m,
                    PublishedAt = new DateTime(2024, 5, 10, 12, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 8,
                    RegionId = 6,
                    Title = "Restaurant Galion Kotor",
                    PostType = "restaurant",
                    Description = "Jedini restoran na vodi u Kotoru. Romantična atmosfera, mediteranska kuhinja, pogled na tvrdjavu.",
                    Lat = 42.4205m,
                    Lng = 18.7698m,
                    Address = "Šuranj bb, Kotor",
                    Images = """["/images/posts/galion1.jpg"]""",
                    OpeningHours = """{"mon":"13:00-23:00","tue":"13:00-23:00","wed":"13:00-23:00","thu":"13:00-23:00","fri":"13:00-24:00","sat":"13:00-24:00","sun":"13:00-22:00"}""",
                    Details = """{"cuisine":"Mediterranean","price_range":"€€€","capacity":30}""",
                    Status = "published",
                    ViewCount = 134,
                    LikeCount = 24,
                    ReviewCount = 2,
                    AvgRating = 4.50m,
                    PublishedAt = new DateTime(2024, 6, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                // ── KULTURNI OBJEKTI ─────────────────────────────────────────
                new Post
                {
                    AdminId = 2,
                    RegionId = 1,
                    Title = "Muzej Žabljaka",
                    PostType = "cultural_site",
                    Description = "Muzej posvećen historiji i prirodnim bogatstvima Durmitora.",
                    Lat = 43.1548m,
                    Lng = 19.1218m,
                    Address = "Trg Durmitorskih ratnika 2, Žabljak",
                    ExternalUrl = "https://muzejzabljak.me",
                    ExternalUrlLabel = "Saznaj više",
                    Images = """["/images/posts/muzej1.jpg"]""",
                    OpeningHours = """{"mon":"closed","tue":"09:00-17:00","wed":"09:00-17:00","thu":"09:00-17:00","fri":"09:00-17:00","sat":"10:00-16:00","sun":"closed"}""",
                    Details = """{"entrance_fee":3,"currency":"EUR","guided_tours":true}""",
                    Status = "published",
                    ViewCount = 143,
                    LikeCount = 21,
                    ReviewCount = 2,
                    AvgRating = 4.00m,
                    PublishedAt = new DateTime(2024, 3, 8, 11, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 8,
                    RegionId = 6,
                    Title = "Stari grad Kotor",
                    PostType = "cultural_site",
                    Description = "Savršeno očuvani medievalni grad okružen moćnim zidinama. UNESCO svjetska baština.",
                    Lat = 42.4236m,
                    Lng = 18.7711m,
                    Address = "Stari grad, Kotor",
                    Images = """["/images/posts/kotor1.jpg","/images/posts/kotor2.jpg","/images/posts/kotor3.jpg"]""",
                    OpeningHours = """{"mon":"00:00-24:00","tue":"00:00-24:00","wed":"00:00-24:00","thu":"00:00-24:00","fri":"00:00-24:00","sat":"00:00-24:00","sun":"00:00-24:00"}""",
                    Details = """{"entrance_fee":0,"wall_climb_fee":8,"currency":"EUR"}""",
                    Status = "published",
                    ViewCount = 523,
                    LikeCount = 112,
                    ReviewCount = 5,
                    AvgRating = 4.80m,
                    PublishedAt = new DateTime(2024, 4, 15, 9, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 8,
                    RegionId = 12,
                    Title = "Cetinjski manastir",
                    PostType = "cultural_site",
                    Description = "Pravoslavni manastir u Cetinju, duhovno središte Crnogorske crkve.",
                    Lat = 42.3900m,
                    Lng = 18.9200m,
                    Address = "Cetinje",
                    Images = """["/images/posts/cetinje1.jpg"]""",
                    Details = """{"entrance_fee":0,"dress_code":true}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 5, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                // ── ATRAKCIJE / MONUMENTI ────────────────────────────────────
                new Post
                {
                    AdminId = 3,
                    RegionId = 3,
                    Title = "Crno jezero",
                    PostType = "attraction",
                    Description = "Simbol Durmitora. Glacijalnog porijekla, sastoji se od Malog i Velikog jezera.",
                    Lat = 43.1378m,
                    Lng = 19.0644m,
                    Address = "NP Durmitor, Žabljak",
                    Images = """["/images/posts/crnojezero1.jpg","/images/posts/crnojezero2.jpg"]""",
                    Details = """{"entrance_fee":5,"currency":"EUR","perimeter_km":3.6,"altitude_m":1416}""",
                    Status = "published",
                    ViewCount = 687,
                    LikeCount = 143,
                    PublishedAt = new DateTime(2024, 2, 15, 8, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 3,
                    RegionId = 2,
                    Title = "Đavolja varoš Durmitor",
                    PostType = "monument",
                    Description = "Vulkanski oblici terena koji izgledaju kao kamene figure. Mistično i fotografski spektakularno.",
                    Lat = 43.1450m,
                    Lng = 19.0890m,
                    Address = "NP Durmitor",
                    Images = """["/images/posts/djavaros1.jpg"]""",
                    Details = """{"entrance_fee":0,"guided_tours":true}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 5, 20, 9, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 8,
                    RegionId = 6,
                    Title = "Tvrdjava San Giovanni",
                    PostType = "monument",
                    Description = "Monumentalna tvrdjava iznad Kotora na 280m visine. Panorama Bokokotorskog zaliva je nezaboravna.",
                    Lat = 42.4267m,
                    Lng = 18.7719m,
                    Address = "Kotor",
                    Images = """["/images/posts/sangiovanni1.jpg"]""",
                    Details = """{"entrance_fee":8,"currency":"EUR","altitude_m":280}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 6, 10, 10, 0, 0, DateTimeKind.Utc)
                },
                // ── SPORTSKI OBJEKTI ─────────────────────────────────────────
                new Post
                {
                    AdminId = 6,
                    RegionId = 2,
                    Title = "Ski centar Savin Kuk",
                    PostType = "sports_facility",
                    Description = "Skijalište na 2313m. 4 žičare, 12 staza ukupne dužine 18km. Škola skijanja i rent servisi.",
                    Lat = 43.1789m,
                    Lng = 19.0456m,
                    Address = "Savin Kuk, NP Durmitor",
                    Images = """["/images/posts/savinkuk1.jpg","/images/posts/savinkuk2.jpg"]""",
                    OpeningHours = """{"mon":"09:00-16:00","tue":"09:00-16:00","wed":"09:00-16:00","thu":"09:00-16:00","fri":"09:00-16:00","sat":"09:00-16:30","sun":"09:00-16:30"}""",
                    Details = """{"lifts":4,"slopes":12,"total_km":18,"ski_school":true,"day_pass":25,"currency":"EUR"}""",
                    Status = "published",
                    ViewCount = 289,
                    LikeCount = 67,
                    ReviewCount = 3,
                    AvgRating = 4.67m,
                    PublishedAt = new DateTime(2024, 11, 1, 8, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 6,
                    RegionId = 4,
                    Title = "Rafting centar Tara",
                    PostType = "sports_facility",
                    Description = "Profesionalni rafting na rijeci Tari. Opcije za početnike i iskusne raftere.",
                    Lat = 43.2050m,
                    Lng = 19.2450m,
                    Address = "Šćepan Polje, Tara",
                    Images = """["/images/posts/rafting1.jpg","/images/posts/rafting2.jpg"]""",
                    OpeningHours = """{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"08:00-18:00","thu":"08:00-18:00","fri":"08:00-18:00","sat":"07:00-19:00","sun":"07:00-19:00"}""",
                    Details = """{"price_from":35,"currency":"EUR","duration_h":4,"min_age":12}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 4, 1, 9, 0, 0, DateTimeKind.Utc)
                },
                // ── KLUBOVI ──────────────────────────────────────────────────
                new Post
                {
                    AdminId = 7,
                    RegionId = 5,
                    Title = "Club Aquarius Budva",
                    PostType = "club",
                    Description = "Najpopularniji beach club na Crnogorskom primorju. DJ evenings, bazen, VIP zone.",
                    Lat = 42.2820m,
                    Lng = 18.8390m,
                    Address = "Slovenska plaža, Budva",
                    Images = """["/images/posts/aquarius1.jpg","/images/posts/aquarius2.jpg"]""",
                    OpeningHours = """{"fri":"22:00-06:00","sat":"22:00-06:00","sun":"22:00-05:00"}""",
                    Details = """{"capacity":1500,"entry_fee":10,"currency":"EUR"}""",
                    Status = "published",
                    ViewCount = 334,
                    LikeCount = 78,
                    PublishedAt = new DateTime(2024, 5, 1, 12, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 7,
                    RegionId = 5,
                    Title = "Top Hill Club Budva",
                    PostType = "club",
                    Description = "Open air klub na brdu iznad Budve. Poznat kao jedan od najljepših klubova u regionu.",
                    Lat = 42.2950m,
                    Lng = 18.8500m,
                    Address = "Topliš bb, Budva",
                    Images = """["/images/posts/tophill1.jpg"]""",
                    Details = """{"capacity":5000,"entry_fee":15,"currency":"EUR"}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 5, 15, 12, 0, 0, DateTimeKind.Utc)
                },
                // ── PRODAVNICA ───────────────────────────────────────────────
                new Post
                {
                    AdminId = 2,
                    RegionId = 1,
                    Title = "Suvenirnica Durmitor",
                    PostType = "shop",
                    Description = "Originalni suveniri iz Crne Gore: domaći med, rakija, nakit, planinske trave.",
                    Lat = 43.1552m,
                    Lng = 19.1220m,
                    Address = "Trg bb, Žabljak",
                    Images = """["/images/posts/suveniri1.jpg"]""",
                    OpeningHours = """{"mon":"09:00-20:00","tue":"09:00-20:00","wed":"09:00-20:00","thu":"09:00-20:00","fri":"09:00-21:00","sat":"09:00-21:00","sun":"10:00-19:00"}""",
                    Details = """{"price_range":"€"}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 4, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                // ── DOGADJAJI ────────────────────────────────────────────────
                new Post
                {
                    AdminId = 4,
                    RegionId = 1,
                    Title = "Durmitor Summer Fest 2025",
                    PostType = "event",
                    Description = "Trodnevni muzički festival pod vedrim nebom na Žabljaku. Domaći i regionalni izvođači.",
                    Lat = 43.1560m,
                    Lng = 19.1230m,
                    Address = "Stadion Žabljak",
                    ExternalUrl = "https://durmitorsummerfest.me/karte",
                    ExternalUrlLabel = "Kupi kartu",
                    Images = """["/images/posts/fest1.jpg","/images/posts/fest2.jpg"]""",
                    Details = """{"category":"FESTIVAL","startAt":"2025-07-18T18:00:00","endAt":"2025-07-20T23:59:00","ticketUrl":"https://durmitorsummerfest.me/karte","price":15,"currency":"EUR","capacity":2000}""",
                    Status = "published",
                    ViewCount = 423,
                    LikeCount = 87,
                    SaveCount = 45,
                    PublishedAt = new DateTime(2024, 4, 1, 9, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 7,
                    RegionId = 5,
                    Title = "Jazz na tvrdjavi — Budva",
                    PostType = "event",
                    Description = "Jedina noć jazza na zidinama Budvanske tvrdjave. Internacionalni jazz muzičari.",
                    Lat = 42.2791m,
                    Lng = 18.8385m,
                    Address = "Tvrdjava Citadela, Budva",
                    ExternalUrl = "https://budvajazz.me",
                    ExternalUrlLabel = "Rezerviši mjesta",
                    Images = """["/images/posts/jazz1.jpg"]""",
                    Details = """{"category":"CONCERT","startAt":"2025-08-15T21:00:00","endAt":"2025-08-15T23:30:00","ticketUrl":"https://budvajazz.me","price":20,"currency":"EUR","capacity":300}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 6, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 6,
                    RegionId = 2,
                    Title = "Durmitor Ultra Trail 2025",
                    PostType = "event",
                    Description = "Planinski ultra maraton po stazama Durmitora. Kategorije 25km, 50km i 100km.",
                    Lat = 43.1556m,
                    Lng = 19.1225m,
                    Address = "Žabljak",
                    Images = """["/images/posts/trail1.jpg"]""",
                    Details = """{"category":"SPORT","startAt":"2025-09-06T06:00:00","endAt":"2025-09-07T20:00:00","price":30,"currency":"EUR"}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 5, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                new Post
                {
                    AdminId = 8,
                    RegionId = 6,
                    Title = "Kotorski karneval 2024",
                    PostType = "event",
                    Description = "Najstariji karneval na Jadranskom moru. Maskenbal, povorka, zabava.",
                    Lat = 42.4247m,
                    Lng = 18.7712m,
                    Address = "Stari grad, Kotor",
                    Images = """["/images/posts/karneval1.jpg"]""",
                    Details = """{"category":"FESTIVAL","startAt":"2024-02-12T10:00:00","endAt":"2024-02-13T23:00:00"}""",
                    Status = "archived"
                },
                new Post
                {
                    AdminId = 4,
                    RegionId = 5,
                    Title = "Beach party Budva — septembar",
                    PostType = "event",
                    Description = "Zatvaranje sezone na Slovenskoj plaži. DJ nastup, hrana, piće.",
                    Lat = 42.2820m,
                    Lng = 18.8380m,
                    Address = "Slovenska plaža, Budva",
                    Images = """["/images/posts/beachparty1.jpg"]""",
                    Details = """{"category":"OTHER","startAt":"2025-09-20T20:00:00","endAt":"2025-09-21T04:00:00","price":5,"currency":"EUR"}""",
                    Status = "draft"
                },
                new Post
                {
                    AdminId = 8,
                    RegionId = 6,
                    Title = "Kotor Art Festival 2025",
                    PostType = "event",
                    Description = "Medjunarodni festival savremene umjetnosti. Izložbe, performansi, radionice.",
                    Lat = 42.4236m,
                    Lng = 18.7711m,
                    Address = "Stari grad, Kotor",
                    Images = """["/images/posts/kotorart1.jpg"]""",
                    Details = """{"category":"EXHIBITION","startAt":"2025-07-05T10:00:00","endAt":"2025-07-12T22:00:00","price":0,"currency":"EUR"}""",
                    Status = "published",
                    PublishedAt = new DateTime(2024, 5, 20, 10, 0, 0, DateTimeKind.Utc)
                }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  TAGOVI NA OBJAVAMA
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedPostTagsAsync()
        {
            if (await _db.PostTags.AnyAsync()) return;
            _logger.LogInformation("[Seed] Post tagovi...");

            var tags = await _db.Tags.ToDictionaryAsync(t => t.Name, t => t.Id);
            var posts = await _db.Posts.OrderBy(p => p.Id).Select(p => new { p.Id, p.Title }).ToListAsync();

            // Mapiranje: naziv posta → tagovi  (ID-evi su auto-generirani)
            var map = new Dictionary<string, string[]>
            {
                ["Hotel Jezera Žabljak"] = ["Parking", "WiFi", "Wellness", "Porodično"],
                ["Apartmani Durmitor View"] = ["Parking", "WiFi", "Porodično"],
                ["Hotel Avala Budva"] = ["Wellness", "Romantično"],
                ["Restoran Soa"] = ["Gastronomija", "Kulturno"],
                ["Konoba Portun Budva"] = ["Gastronomija", "Romantično"],
                ["Muzej Žabljaka"] = ["Kulturno", "Historijsko", "Razgledanje"],
                ["Stari grad Kotor"] = ["UNESCO", "Historijsko", "Razgledanje", "Fotografija"],
                ["Crno jezero"] = ["Priroda", "Outdoor", "Besplatno", "Fotografija"],
                ["Ski centar Savin Kuk"] = ["Skijanje", "Sport", "Adrenalin"],
                ["Rafting centar Tara"] = ["Rafting", "Adrenalin", "Outdoor"],
                ["Club Aquarius Budva"] = ["Noćni život", "Muzika"],
                ["Durmitor Summer Fest 2025"] = ["Muzika", "Noćni život"],
                ["Jazz na tvrdjavi — Budva"] = ["Muzika", "Kulturno", "Romantično"],
            };

            foreach (var post in posts)
            {
                if (!map.TryGetValue(post.Title, out var tagNames)) continue;
                foreach (var tagName in tagNames)
                {
                    if (!tags.TryGetValue(tagName, out var tagId)) continue;
                    _db.PostTags.Add(new PostTag { PostId = post.Id, TagId = tagId });
                }
            }
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  RUTE
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedRoutesAsync()
        {
            if (await _db.Routes.AnyAsync()) return;
            _logger.LogInformation("[Seed] Rute...");

            _db.Routes.AddRange(
                new Models.Route
                {
                    AdminId = 3,
                    RegionId = 2,
                    Name = "Staza oko Crnog jezera",
                    Difficulty = "easy",
                    DistanceKm = 3.6m,
                    DurationMin = 60,
                    ElevationGain = 30,
                    Description = "Kružna staza oko Crnog jezera. Idealna za početnike i porodice.",
                    Waypoints = """[{"lat":43.1378,"lng":19.0644,"name":"Ulaz — parking"},{"lat":43.1395,"lng":19.0580,"name":"Malo jezero"},{"lat":43.1420,"lng":19.0610,"name":"Vidikovac"},{"lat":43.1400,"lng":19.0700,"name":"Veliko jezero"},{"lat":43.1378,"lng":19.0644,"name":"Povratak"}]""",
                    Status = "published",
                    ViewCount = 234,
                    SaveCount = 45
                },
                new Models.Route
                {
                    AdminId = 6,
                    RegionId = 2,
                    Name = "Vrh Bobotov Kuk",
                    Difficulty = "hard",
                    DistanceKm = 14.0m,
                    DurationMin = 360,
                    ElevationGain = 900,
                    Description = "Najzahtjevnija tura na najviši vrh Durmitora (2523m). Za iskusne planinare.",
                    Waypoints = """[{"lat":43.1378,"lng":19.0644,"name":"Polazište"},{"lat":43.1450,"lng":19.0500,"name":"Ledena pećina"},{"lat":43.1500,"lng":19.0400,"name":"Planinski dom"},{"lat":43.1550,"lng":19.0300,"name":"Vrh 2523m"}]""",
                    Status = "published",
                    ViewCount = 156,
                    SaveCount = 38
                },
                new Models.Route
                {
                    AdminId = 3,
                    RegionId = 4,
                    Name = "Kanjon Tare — pješačka staza",
                    Difficulty = "moderate",
                    DistanceKm = 8.5m,
                    DurationMin = 180,
                    ElevationGain = 420,
                    Description = "Staza duž kanjona rijeke Tare. Kroz šumu crnog bora, uz rijeku do vidikovca.",
                    Waypoints = """[{"lat":43.2000,"lng":19.2500,"name":"Polazište"},{"lat":43.2100,"lng":19.2400,"name":"Šuma bora"},{"lat":43.2200,"lng":19.2300,"name":"Korito Tare"},{"lat":43.2300,"lng":19.2200,"name":"Vidikovac"}]""",
                    Status = "published",
                    ViewCount = 112,
                    SaveCount = 27
                },
                new Models.Route
                {
                    AdminId = 8,
                    RegionId = 6,
                    Name = "Zidine Kotora",
                    Difficulty = "moderate",
                    DistanceKm = 4.5m,
                    DurationMin = 120,
                    ElevationGain = 300,
                    Description = "Uspinjanje na zidine starog grada Kotora. Nevjerovatan pogled na zaliv.",
                    Waypoints = """[{"lat":42.4236,"lng":18.7711,"name":"Ulaz u stari grad"},{"lat":42.4250,"lng":18.7720,"name":"Crkva Sv. Ivana"},{"lat":42.4267,"lng":18.7719,"name":"Vrh — tvrdjava"}]""",
                    Status = "published",
                    ViewCount = 89,
                    SaveCount = 21
                },
                new Models.Route
                {
                    AdminId = 7,
                    RegionId = 5,
                    Name = "Budva — Sveti Stefan biciklistička tura",
                    Difficulty = "easy",
                    DistanceKm = 12.0m,
                    DurationMin = 90,
                    ElevationGain = 80,
                    Description = "Biciklistička staza duž obale od Budve do Svetog Stefana. Spektakularni pogledi.",
                    Waypoints = """[{"lat":42.2864,"lng":18.8400,"name":"Budva — centar"},{"lat":42.2700,"lng":18.8600,"name":"Bečići"},{"lat":42.2600,"lng":18.8750,"name":"Rafailovići"},{"lat":42.2561,"lng":18.8925,"name":"Sveti Stefan"}]""",
                    Status = "published"
                }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  INTERAKCIJE (lajkovi, saveovi, pregledi)
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedInteractionsAsync()
        {
            if (await _db.PostLikes.AnyAsync()) return;
            _logger.LogInformation("[Seed] Interakcije...");

            // post_like
            var likes = new (uint t, uint p)[]
            {
                (1,11),(1,1),(1,9),(1,14),(1,18),
                (2,18),(2,16),(2,5),(2,19),(2,6),
                (3,1),(3,11),(3,14),(3,18),
                (4,11),(4,9),(4,5),(4,8),
                (5,14),(5,1),(5,11),(5,15),
                (6,3),(6,16),(6,19),(6,6),
                (7,11),(7,9),(7,15),(7,18),
                (8,9),(8,10),(8,8),(8,12),
                (9,9),(9,10),(9,12),(9,8),
                (10,11),(10,1),(10,14)
            };
            foreach (var (t, p) in likes)
                _db.PostLikes.Add(new PostLike { TouristId = t, PostId = p, CreatedAt = DateTime.UtcNow });

            // post_save
            var saves = new (uint t, uint p)[]
            {
                (1,1),(1,11),(1,18),(2,18),(2,16),(3,1),(3,14),(4,11),(4,9),
                (5,14),(5,1),(6,3),(6,19),(7,11),(7,18),(8,9),(9,9),(9,10),(10,11),(10,1)
            };
            foreach (var (t, p) in saves)
                _db.SavedPosts.Add(new SavedPost { TouristId = t, PostId = p, CreatedAt = DateTime.UtcNow });

            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  RECENZIJE
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedReviewsAsync()
        {
            if (await _db.Reviews.AnyAsync()) return;
            _logger.LogInformation("[Seed] Recenzije...");

            var now = DateTime.UtcNow;
            _db.Reviews.AddRange(
                new Review { TouristId = 1, PostId = 11, Rating = 5, Comment = "Nevjerovatno lijepo! Crno jezero je jedno od najljepših mjesta na svetu.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-25) },
                new Review { TouristId = 2, PostId = 11, Rating = 4, Comment = "Preljepo, ali malo previše turista u augustu. Preporučujem jutarnje sate.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-22) },
                new Review { TouristId = 3, PostId = 1, Rating = 5, Comment = "Odličan hotel, predivna lokacija i ljubazno osoblje. Spa je vrhunski.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-20) },
                new Review { TouristId = 4, PostId = 8, Rating = 4, Comment = "Zanimljiv muzej sa dobrom zbirkom. Vodič je bio informativan.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-18) },
                new Review { TouristId = 5, PostId = 14, Rating = 5, Comment = "Savin Kuk je fantastičan ski centar! Staze dobro uredjene, žičare moderne.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-15) },
                new Review { TouristId = 6, PostId = 9, Rating = 5, Comment = "Stari grad Kotor je apsolutno nevjerovatan. Zidine su spektakularne!", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-14) },
                new Review { TouristId = 7, PostId = 9, Rating = 5, Comment = "Najljepše mjesto u Crnoj Gori. Obavezno posjetiti!", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-12) },
                new Review { TouristId = 8, PostId = 9, Rating = 4, Comment = "Fantastično ali puno turista ljeti. Dodjite van sezone.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-10) },
                new Review { TouristId = 9, PostId = 10, Rating = 5, Comment = "Cetinjski manastir — duhovno iskustvo. Savjetujem svima.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-8) },
                new Review { TouristId = 10, PostId = 1, Rating = 4, Comment = "Hotel Jezera je odličan. Lokacija savršena, osoblje ljubazno.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-7) },
                new Review { TouristId = 1, PostId = 5, Rating = 5, Comment = "Restoran Soa — autentična crnogorska hrana. Jagnjetina je bila savršena!", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-6) },
                new Review { TouristId = 2, PostId = 18, Rating = 5, Comment = "Durmitor Fest je bio odličan! Atmosfera neopisiva, muzičari vrhunski!", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-5) },
                new Review { TouristId = 3, PostId = 6, Rating = 4, Comment = "Konoba Portun — svježa riba, ljubazno osoblje. Malo skuplje, ali vrijedi.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-4) },
                // Recenzije za rute
                new Review { TouristId = 1, RouteId = 1, Rating = 5, Comment = "Prekrasna staza! Crno jezero je zadivljujuće sa svakog ugla.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-16) },
                new Review { TouristId = 5, RouteId = 2, Rating = 4, Comment = "Teška tura ali vrijedna svake kapi znoja. Pogled sa vrha je nestvaran.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-11) },
                new Review { TouristId = 7, RouteId = 4, Rating = 5, Comment = "Zidine Kotora — moraju se popeti! Pogled na zaliv je predivan.", Status = "APPROVED", IsApproved = true, CreatedAt = now.AddDays(-9) },
                // PENDING
                new Review { TouristId = 4, RouteId = 2, Rating = 3, Comment = "Staza je lijepa ali signalizacija loša. Skoro sam se izgubio.", Status = "PENDING", IsApproved = false, CreatedAt = now.AddDays(-3) },
                new Review { TouristId = 6, PostId = 3, Rating = 2, Comment = "Previše buke od susjednog apartmana, nisam mogla spavati.", Status = "PENDING", IsApproved = false, CreatedAt = now.AddDays(-2) },
                new Review { TouristId = 8, PostId = 14, Rating = 3, Comment = "Ski centar ok, ali gužve vikendom su strašne. Čekanje na žičaru 45 min.", Status = "PENDING", IsApproved = false, CreatedAt = now.AddDays(-2) },
                new Review { TouristId = 9, PostId = 1, Rating = 4, Comment = "Hotel je odličan ali cijena doručka je previsoka za ono što dobijate.", Status = "PENDING", IsApproved = false, CreatedAt = now.AddDays(-1) },
                // REJECTED
                new Review { TouristId = 2, PostId = 16, Rating = 1, Comment = "Spam komentar bez sadržaja xxxx", Status = "REJECTED", IsApproved = false, CreatedAt = now.AddDays(-20) },
                new Review { TouristId = 3, PostId = 3, Rating = 1, Comment = "Neprimjeren sadržaj — obrisano.", Status = "REJECTED", IsApproved = false, CreatedAt = now.AddDays(-15) }
            );
            await _db.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  ADMIN NOTIFIKACIJE
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedNotificationsAsync()
        {
            if (await _db.AdminNotifications.AnyAsync()) return;
            _logger.LogInformation("[Seed] Notifikacije...");

            var now = DateTime.UtcNow;
            _db.AdminNotifications.AddRange(
                new AdminNotification { AdminUserId = 1, Type = "new_registration", Title = "Novi zahtjev za registraciju", Body = "Milica Stanković čeka odobrenje naloga.", Payload = """{"registration_id":1,"url":"/admin/zahtevi"}""", IsRead = false, CreatedAt = now.AddDays(-2) },
                new AdminNotification { AdminUserId = 1, Type = "new_registration", Title = "Novi zahtjev za registraciju", Body = "Boris Nikolić (Adventure Montenegro) čeka odobrenje.", Payload = """{"registration_id":2,"url":"/admin/zahtevi"}""", IsRead = false, CreatedAt = now.AddDays(-1) },
                new AdminNotification { AdminUserId = 1, Type = "pending_review", Title = "Recenzija čeka moderaciju", Body = "Nova recenzija za Crno jezero — ocjena 2/5.", Payload = """{"post_id":11,"url":"/admin/reviews"}""", IsRead = false, CreatedAt = now.AddDays(-3) },
                new AdminNotification { AdminUserId = 1, Type = "system", Title = "Platforma dostigla 100 korisnika", Body = "Broj aktivnih turista prešao je 100.", Payload = """{"url":"/admin/dashboard"}""", IsRead = true, CreatedAt = now.AddDays(-7) },
                new AdminNotification { AdminUserId = 2, Type = "post_approved", Title = "Muzej Žabljaka odobren", Body = "Vaša objava \"Muzej Žabljaka\" je odobrena.", Payload = """{"post_id":8,"url":"/admin/lokacije"}""", IsRead = false, CreatedAt = now.AddDays(-10) },
                new AdminNotification { AdminUserId = 3, Type = "system", Title = "Dobrodošli na platformu", Body = "Vaš nalog je aktivan. Počnite sa kreiranjem sadržaja.", Payload = """{"url":"/admin/dashboard"}""", IsRead = true, CreatedAt = now.AddDays(-30) },
                new AdminNotification { AdminUserId = 7, Type = "post_approved", Title = "Hotel Avala odobren", Body = "Vaša objava \"Hotel Avala Budva\" je odobrena.", Payload = """{"post_id":3,"url":"/admin/lokacije"}""", IsRead = false, CreatedAt = now.AddDays(-5) },
                new AdminNotification { AdminUserId = 8, Type = "post_approved", Title = "Stari grad Kotor odobren", Body = "Vaša objava je odobrena i vidljiva turistima.", Payload = """{"post_id":9,"url":"/admin/lokacije"}""", IsRead = true, CreatedAt = now.AddDays(-8) }
            );
            await _db.SaveChangesAsync();
        }
    }
}