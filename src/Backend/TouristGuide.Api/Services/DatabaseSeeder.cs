using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using BCrypt.Net;

namespace TouristGuide.Api.Services
{
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
            // ── Seed ide redom jer postoje FK zavisnosti ──
            await SeedPermissionsAsync();        
            await SeedOrganizationsAsync();      
            await SeedAdminUsersAsync();
            await SeedRegionsAsync();
            await SeedTagsAsync();               
            await SeedTouristsAsync();
            await SeedPostsAsync();
            await SeedPostTagsAsync();
            await SeedRoutesAsync();
            await SeedInteractionsAsync();
            await SeedPostViewsAsync();          
            await SeedReviewsAsync();            
            await SeedNotificationsAsync();      
            await SeedRegistrationRequestsAsync(); 
            await SeedUserPermissionsAsync();    
            await SeedAuditLogAsync();           
            await SeedTouristFavoritesAsync();   
            await SeedVisitPlannersAsync();      
            await SeedMailingListAsync();        

            _logger.LogInformation("[Seed] Seed završen.");
        }
        private async Task SeedPermissionsAsync()
        {
            if (await _db.AdminPermissions.AnyAsync()) return;
            _logger.LogInformation("[Seed] Permisije...");

            _db.AdminPermissions.AddRange(
                new AdminPermission { Code = "create_accommodation", Label = "Kreiranje smještaja", Category = "content", Description = "Dodavanje hotela, apartmana, privatnog smještaja" },
                new AdminPermission { Code = "create_restaurant", Label = "Kreiranje restorana", Category = "content", Description = "Dodavanje restorana i kafića" },
                new AdminPermission { Code = "create_club", Label = "Kreiranje klubova", Category = "content", Description = "Dodavanje noćnih klubova i barova" },
                new AdminPermission { Code = "create_event", Label = "Kreiranje dogadjaja", Category = "content", Description = "Dodavanje koncerata, takmičenja, tura" },
                new AdminPermission { Code = "create_route", Label = "Kreiranje ruta", Category = "content", Description = "Dodavanje pješačkih i biciklističkih ruta" },
                new AdminPermission { Code = "create_cultural_site", Label = "Kreiranje kulturnih mjesta", Category = "content", Description = "Dodavanje muzeja, galerija, kulturnih objekata" },
                new AdminPermission { Code = "create_monument", Label = "Kreiranje spomenika", Category = "content", Description = "Dodavanje istorijskih i prirodnih spomenika" },
                new AdminPermission { Code = "create_sports", Label = "Kreiranje sportskih obj.", Category = "content", Description = "Dodavanje sportskih terena i objekata" },
                new AdminPermission { Code = "create_shop", Label = "Kreiranje prodavnica", Category = "content", Description = "Dodavanje prodavnica i tržnih centara" },
                new AdminPermission { Code = "manage_reviews", Label = "Upravljanje recenzijama", Category = "content", Description = "Odobravanje i brisanje recenzija svojih objava" },
                new AdminPermission { Code = "view_analytics", Label = "Pregled analitike", Category = "analytics", Description = "Pregled statistika o objavama i turistima" },
                new AdminPermission { Code = "manage_own_posts", Label = "Upravljanje vlastitim obj.", Category = "content", Description = "Editovanje i brisanje vlastitih objava" },
                new AdminPermission { Code = "manage_tags", Label = "Upravljanje tagovima", Category = "content", Description = "Dodavanje i uredjivanje tagova na objavama" },
                new AdminPermission { Code = "manage_translations", Label = "Upravljanje prijevodima", Category = "content", Description = "Dodavanje prijevoda objava na druge jezike" },
                new AdminPermission { Code = "view_tourists", Label = "Pregled turista", Category = "analytics", Description = "Pregled podataka o turistima" },
                new AdminPermission { Code = "manage_tickets", Label = "Upravljanje kartama", Category = "content", Description = "Pregled i upravljanje digitalnim ulaznicama" }
            );
            await _db.SaveChangesAsync();
        }
        // ────────────────────────────────────────────────────────────────────
        //  ORGANIZACIJE
        // ────────────────────────────────────────────────────────────────────
        private async Task SeedOrganizationsAsync()
        {
            if (await _db.Organizations.AnyAsync()) return;
            _logger.LogInformation("[Seed] Organizacije...");

            _db.Organizations.AddRange(
                new Organization { Name = "NP Durmitor", Type = "government", ContactEmail = "info@npdurmitor.me", Phone = "+38269123002", Website = "https://npdurmitor.me", IsVerified = true },
                new Organization { Name = "TO Žabljak", Type = "tourism", ContactEmail = "info@tozabljak.me", Phone = "+38269123001", Website = "https://zabljak.travel", IsVerified = true },
                new Organization { Name = "Ski centar Durmitor", Type = "sports", ContactEmail = "info@skidurmitor.me", Phone = "+38268234001", Website = "https://skidurmitor.me", IsVerified = true },
                new Organization { Name = "TO Budva", Type = "tourism", ContactEmail = "info@budva.travel", Phone = "+38233452100", Website = "https://budva.travel", IsVerified = true },
                new Organization { Name = "TO Kotor", Type = "tourism", ContactEmail = "info@kotor.travel", Phone = "+38232325001", Website = "https://kotorheritage.me", IsVerified = true },
                new Organization { Name = "Adventure Montenegro", Type = "private", ContactEmail = "info@adventureme.com", Phone = "+38268456001", Website = "https://adventureme.com", IsVerified = false }
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
                new Region { Name = "Žabljak", Type = "city", Description = "Planinski grad na Durmitoru, najviši grad na Balkanu.", Country = "Montenegro", Lat = 43.1556m, Lng = 19.1225m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817714/zabljak1_vuzqhy.jpg" },
                new Region { Name = "Durmitor", Type = "national_park", Description = "Nacionalni park UNESCO svjetske baštine sa 18 ledničkih jezera.", Country = "Montenegro", Lat = 43.1500m, Lng = 19.0167m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817710/durmitor_gmcxfb.webp" },
                new Region { Name = "Crno jezero", Type = "lake", Description = "Najpoznatije jezero Durmitora.", Country = "Montenegro", Lat = 43.1378m, Lng = 19.0644m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794182/crnojezero1_zzmhcv.jpg" },
                new Region { Name = "Tara kanjon", Type = "national_park", Description = "Najdublji kanjon u Evropi.", Country = "Montenegro", Lat = 43.2000m, Lng = 19.2500m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817713/tara_zv8hpn.jpg" },
                new Region { Name = "Budva", Type = "city", Description = "Najpoznatije turističko odredište Crnogorskog primorja.", Country = "Montenegro", Lat = 42.2864m, Lng = 18.8400m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817750/budva_wc7qn8.jpg" },
                new Region { Name = "Kotor", Type = "city", Description = "UNESCO zaštićeni stari grad sa venetskom arhitekturom.", Country = "Montenegro", Lat = 42.4247m, Lng = 18.7712m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817714/kotor_bmjcuy.jpg" },
                new Region { Name = "Herceg Novi", Type = "city", Description = "Grad cvijeća na ulazu u Bokokotorski zaliv.", Country = "Montenegro", Lat = 42.4531m, Lng = 18.5375m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817712/hercegnovi_ljrvdi.jpg" },
                new Region { Name = "Ulcinj", Type = "city", Description = "Najjužniji grad Crne Gore, poznata dugačka plaža.", Country = "Montenegro", Lat = 41.9292m, Lng = 19.2253m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817714/ulcinj_dzrfao.jpg" },
                new Region { Name = "Sveti Stefan", Type = "village", Description = "Ikonski hotelijerski otočić — simbol crnogorskog turizma.", Country = "Montenegro", Lat = 42.2561m, Lng = 18.8925m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817713/svetistefan_hquvvl.jpg" },
                new Region { Name = "Podgorica", Type = "city", Description = "Glavni grad Crne Gore.", Country = "Montenegro", Lat = 42.4304m, Lng = 19.2594m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817712/podgorica_eal9hm.webp" },
                new Region { Name = "Skadarsko jezero", Type = "lake", Description = "Najveće jezero na Balkanu, raj za ptice.", Country = "Montenegro", Lat = 42.1667m, Lng = 19.2833m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817712/skadar_znw1cm.jpg" },
                new Region { Name = "Cetinje", Type = "city", Description = "Stara prijestolnica Crne Gore.", Country = "Montenegro", Lat = 42.3906m, Lng = 18.9228m, CoverImage = "https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817710/cetinje_nkzcot.jpg" }
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
                // Aktivnosti sa svim poljima
                new Tag { Name = "Pješačenje", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved", Description = "Pješačenje planinarskim stazama kroz netaknutu prirodu Crne Gore.", Duration = "2–6 sati", Difficulty = "MEDIUM" },
                new Tag { Name = "Biciklizam", Category = "aktivnost", Color = "SPORT|#3b82f6|approved", Description = "Biciklističke ture duž obale i planinskih puteva.", Duration = "2–4 sata", Difficulty = "MEDIUM" },
                new Tag { Name = "Plivanje", Category = "aktivnost", Color = "SPORT|#3b82f6|approved", Description = "Plivanje u kristalno čistim jezerima i moru.", Duration = "1–3 sata", Difficulty = "EASY" },
                new Tag { Name = "Noćni život", Category = "aktivnost", Color = "NIGHTLIFE|#1e1b4b|approved", Description = "Klubovi, barovi i beach party na crnogorskom primorju.", Duration = "4–8 sati" },
                new Tag { Name = "Sport", Category = "aktivnost", Color = "SPORT|#3b82f6|approved", Description = "Razne sportske aktivnosti prilagođene svim uzrastima.", Duration = "1–3 sata", Difficulty = "MEDIUM" },
                new Tag { Name = "Adrenalin", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved", Description = "Aktivnosti visokog adrenalina: zip-line, bungee, kanjoning.", Duration = "2–5 sati", Difficulty = "HARD", MaxCapacity = 20 },
                new Tag { Name = "Priroda", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved", Description = "Istraživanje prirodnih ljepota, pećina i kanjona.", Duration = "3–8 sati", Difficulty = "MEDIUM" },
                new Tag { Name = "Muzika", Category = "aktivnost", Color = "NIGHTLIFE|#1e1b4b|approved", Description = "Koncerti, festivali i muzički dogadjaji.", Duration = "2–5 sati" },
                new Tag { Name = "Gastronomija", Category = "aktivnost", Color = "DINING|#ef4444|approved", Description = "Degustacija tradicionalne crnogorske kuhinje i lokalnih specijaliteta.", Duration = "2–3 sata", Difficulty = "EASY", MaxCapacity = 15 },
                new Tag { Name = "Outdoor", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved", Description = "Kampovanje, prenoćišta pod zvijezdama i višednevne ture.", Duration = "Cijeli dan", Difficulty = "MEDIUM" },
                new Tag { Name = "Wellness", Category = "aktivnost", Color = "WELLNESS|#8b5cf6|approved", Description = "Spa tretmani, masaže, saune i holistički programi.", Duration = "2–4 sata", Difficulty = "EASY", MaxCapacity = 10 },
                new Tag { Name = "Rafting", Category = "aktivnost", Color = "ADVENTURE|#22c55e|approved", Description = "Rafting na rijeci Tari — najdubljem kanjonu u Evropi.", Duration = "4–6 sati", Difficulty = "MEDIUM", MaxCapacity = 12 },
                new Tag { Name = "Skijanje", Category = "aktivnost", Color = "SPORT|#3b82f6|approved", Description = "Skijanje i snowboarding na Savin Kuku i ostalim skijaltištima.", Duration = "Cijeli dan", Difficulty = "MEDIUM" },
                new Tag { Name = "Ronjenje", Category = "aktivnost", Color = "SPORT|#3b82f6|approved", Description = "Ronjenje u Jadranskom moru — podvodne pećine i bogat morski svijet.", Duration = "2–4 sata", Difficulty = "MEDIUM", MaxCapacity = 8 },
                new Tag { Name = "Kultura", Category = "aktivnost", Color = "CULTURE|#ec4899|approved", Description = "Posjeta muzejima, galerijama i kulturno-historijskim lokalitetima.", Duration = "2–5 sati", Difficulty = "EASY" },
                new Tag { Name = "Razgledanje", Category = "aktivnost", Color = "SIGHTSEEING|#06b6d4|approved", Description = "Vođene ture gradova, tvrdjava i prirodnih ljepota.", Duration = "2–4 sata", Difficulty = "EASY", MaxCapacity = 25 },
                new Tag { Name = "Fotografija", Category = "aktivnost", Color = "SIGHTSEEING|#06b6d4|approved", Description = "Fotografske ture na najfotogeničnijim lokacijama Crne Gore.", Duration = "3–5 sati", Difficulty = "EASY", MaxCapacity = 12 },
                new Tag { Name = "Shopping", Category = "aktivnost", Color = "SHOPPING|#f59e0b|approved", Description = "Suvenirnice, tržnice i lokalni zanatlije.", Duration = "1–3 sata", Difficulty = "EASY" },
                new Tag { Name = "Yoga", Category = "aktivnost", Color = "WELLNESS|#8b5cf6|pending", Description = "Jutarnja yoga na otvorenom uz pogled na planine ili more.", Duration = "1.5 sata", Difficulty = "EASY", MaxCapacity = 15 },
                new Tag { Name = "Paraglajding", Category = "aktivnost", Color = "ADVENTURE|#22c55e|pending", Description = "Tandem paraglajding sa planinskih vrhova — nezaboravni pogledi.", Duration = "1–2 sata", Difficulty = "MEDIUM", MaxCapacity = 1 },
                // Stilovi i ostali tagovi (bez novih polja)
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
                new Tourist { Name = "Emma Wilson", Email = "emma.wilson@gmail.com", PasswordHash = tHash, Language = "en", Interests = """["hiking","nature","photography","culture"]""" },
                new Tourist { Name = "Luca Rossi", Email = "luca.rossi@gmail.com", PasswordHash = tHash, Language = "en", Interests = """["food","nightlife","beach","history"]""" },
                new Tourist { Name = "Jana Novák", Email = "jana.novak@gmail.com", PasswordHash = tHash, Language = "de", Interests = """["hiking","skiing","culture","family"]""" },
                new Tourist { Name = "Aleksandra Popović", Email = "aleksandra.p@gmail.com", PasswordHash = tHash, Language = "sr", Interests = """["nature","culture","food"]""" },
                new Tourist { Name = "Thomas Müller", Email = "thomas.m@gmail.com", PasswordHash = tHash, Language = "de", Interests = """["skiing","adventure","sport"]""" },
                new Tourist { Name = "Sofia García", Email = "sofia.garcia@gmail.com", PasswordHash = tHash, Language = "en", Interests = """["beach","food","culture","nightlife"]""" },
                new Tourist { Name = "Andrei Popescu", Email = "andrei.p@gmail.com", PasswordHash = tHash, Language = "en", Interests = """["adventure","hiking","photography"]""" },
                new Tourist { Name = "Yuki Tanaka", Email = "yuki.t@gmail.com", PasswordHash = tHash, Language = "en", Interests = """["culture","food","sightseeing"]""" },
                new Tourist { Name = "Mohammed Al-Rashid", Email = "mohammed.r@gmail.com", PasswordHash = tHash, Language = "en", Interests = """["culture","history","food"]""" },
                new Tourist { Name = "Klara Svensson", Email = "klara.s@gmail.com", PasswordHash = tHash, Language = "en", Interests = """["nature","hiking","wellness"]""" }
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794176/jezera1_hxnc3o.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794176/jezera2_k0eg17.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794178/jezera3_qsoom8.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776793850/ap1_fhrjrj.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794175/apt2_h5zkwi.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817115/avala1_uma3dw.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817115/avala2_j418vr.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794178/soa1_qdtxrd.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794179/soa2_c43ang.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817118/portun1_gtuno5.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817118/portun2_fkrmj4.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817116/galion1_oqjami.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794178/muzej1_ew8ets.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817115/kotor2_jdnpec.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817117/kotor1_f6wqdi.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817115/kotor3_hqepgp.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817118/cetinje1_hzgdks.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794182/crnojezero1_zzmhcv.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794176/crnojezero2_aplt5y.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817119/tvrdjava1_zzqdzb.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794178/savinkuk1_iktvwv.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794178/savinkuk2_lura4i.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817118/rafting2_hrx3n4.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817118/rafting1_lxcvy3.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794175/aquarius2_vaqbyf.jpg","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794175/aquarius1_tno0bj.webp"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817119/tophill1_x2z0cv.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817118/suveniri1_uyz9am.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794177/fest2_gpx8hc.webp","https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776794176/fest_lvj126.webp"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817116/jazz1_lbqoyz.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817119/trail1_f1ayim.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817117/karneval1_xwsclk.jpg"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817116/beachparty1_jr21wu.webp"]""",
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
                    Images = """["https://res.cloudinary.com/dtnx7nnbc/image/upload/v1776817116/kotorart1_bptw6n.jpg"]""",
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
        private async Task SeedPostViewsAsync()
        {
            if (await _db.PostViews.AnyAsync()) return;
            _logger.LogInformation("[Seed] Post pregledi...");

            var now = DateTime.UtcNow;

            // (tourist_id nullable, post_id, dani_unazad, duration_sec)
            var views = new (uint? t, uint p, int d, uint s)[]
            {
        // Dan -30 do -25
        (1,  11, 30, 145), (2,  18, 30, 210), (3,   1, 29, 87),  (4,  11, 29, 93),
        (5,  14, 28, 320), (1,   9, 28, 180), (6,   3, 27, 240), (7,  11, 27, 110),
        (null,11, 27, 35), (2,   5, 26, 95),  (8,   9, 26, 175), (9,   9, 26, 200),
        (null,18, 25, 55), (10, 11, 25, 130), (3,  14, 25, 290),
        // Dan -24 do -18
        (1,  18, 24, 210), (2,  16, 24, 145), (4,   9, 24, 155), (null,11, 23, 40),
        (5,   1, 23, 112), (6,  19, 23, 185), (7,  15, 22, 280), (8,  10, 22, 165),
        (null, 9, 22, 75), (1,   9, 21, 190), (2,   6, 21, 220), (3,   9, 21, 135),
        (9,  12, 20, 250), (10,  1, 20, 140), (null,18, 20, 60), (4,  14, 19, 310),
        (5,  11, 19, 155), (null,11, 18, 45), (6,  16, 18, 175), (7,  18, 18, 225),
        // Dan -17 do -10 (pik)
        (1,  11, 17, 198), (2,  18, 17, 245), (3,   1, 17, 110), (8,   9, 16, 185),
        (9,  10, 16, 210), (null,11, 16, 50), (null,18, 16, 65), (4,  11, 15, 130),
        (5,  14, 15, 340), (6,   3, 15, 285), (10, 11, 15, 160), (1,  14, 14, 270),
        (2,   9, 14, 150), (7,  11, 14, 125), (null, 1, 14, 40), (3,  18, 13, 220),
        (4,   9, 13, 175), (8,  12, 13, 235), (null,11, 13, 55), (null, 9, 12, 80),
        (5,   9, 12, 165), (6,  19, 12, 200), (9,   9, 12, 215), (10, 14, 11, 295),
        (1,   1, 11, 120), (2,  15, 11, 255), (null,18, 11, 70), (3,  11, 10, 185),
        (7,   9, 10, 145), (null,11, 10, 55),
        // Dan -9 do -4
        (4,  11, 9, 175), (5,   1, 9, 135), (6,  16, 9, 195), (8,   9, 8, 225),
        (9,  10, 8, 190), (null,11, 8, 45), (null, 9, 8, 65),  (10, 18, 7, 250),
        (1,  11, 7, 165), (2,   6, 7, 215), (3,  14, 6, 310),  (4,   9, 6, 155),
        (null,18, 6, 60), (5,  11, 5, 145), (6,   3, 5, 265),  (7,  18, 5, 235),
        (null,11, 5, 50),
        // Dan -4 do -1
        (8,  11, 4, 175), (9,   9, 4, 195), (10,  1, 3, 130), (1,  18, 3, 225),
        (null, 9, 3, 70), (2,  11, 2, 160), (3,   9, 2, 140), (null,18, 1, 55),
        (4,  14, 1, 285), (5,  11, 1, 150)
            };

            foreach (var (t, p, d, s) in views)
            {
                _db.PostViews.Add(new PostView
                {
                    TouristId = t,
                    PostId = p,
                    CreatedAt = now.AddDays(-d),
                    DurationSec = s
                });
            }

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
                // NOVA recenzija — tourist 10 za Restoran Soa
                new Review { TouristId = 10, PostId = 5, Rating = 2, Comment = "Restoran Soa — očekivao sam više za tu cijenu. Usluga spora.", Status = "PENDING", IsApproved = false, CreatedAt = now.AddDays(-1) },
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
                // SuperAdmin (id=1)
                new AdminNotification { AdminUserId = 1, Type = "new_registration", Title = "Novi zahtjev za registraciju", Body = "Milica Stanković čeka odobrenje naloga.", Payload = """{"registration_id":1,"url":"/admin/zahtevi"}""", IsRead = false, CreatedAt = now.AddDays(-2) },
                new AdminNotification { AdminUserId = 1, Type = "new_registration", Title = "Novi zahtjev za registraciju", Body = "Boris Nikolić (Adventure Montenegro) čeka odobrenje.", Payload = """{"registration_id":2,"url":"/admin/zahtevi"}""", IsRead = false, CreatedAt = now.AddDays(-1) },
                new AdminNotification { AdminUserId = 1, Type = "pending_review", Title = "Recenzija čeka moderaciju", Body = "Nova recenzija za Crno jezero — ocjena 2/5.", Payload = """{"post_id":11,"url":"/admin/reviews"}""", IsRead = false, CreatedAt = now.AddDays(-3) },
                new AdminNotification { AdminUserId = 1, Type = "pending_review", Title = "Negativna recenzija", Body = "Ocjena 1/5 za Club Aquarius čeka pregled.", Payload = """{"post_id":16,"url":"/admin/reviews"}""", IsRead = true, CreatedAt = now.AddDays(-5) },
                new AdminNotification { AdminUserId = 1, Type = "system", Title = "Platforma dostigla 100 korisnika", Body = "Broj aktivnih turista prešao je 100. Odličan napredak!", Payload = """{"url":"/admin/dashboard"}""", IsRead = true, CreatedAt = now.AddDays(-7) },
                // Ana (id=2)
                new AdminNotification { AdminUserId = 2, Type = "post_approved", Title = "Muzej Žabljaka odobren", Body = "Vaša objava \"Muzej Žabljaka\" je odobrena i objavljena.", Payload = """{"post_id":8,"url":"/admin/lokacije"}""", IsRead = false, CreatedAt = now.AddDays(-10) },
                new AdminNotification { AdminUserId = 2, Type = "pending_review", Title = "Nova recenzija na vašoj objavi", Body = "Turista je ostavio recenziju za Muzej Žabljaka — ocjena 4/5.", Payload = """{"post_id":8,"url":"/admin/reviews"}""", IsRead = false, CreatedAt = now.AddDays(-3) },
                // Nikola (id=3)
                new AdminNotification { AdminUserId = 3, Type = "system", Title = "Dobrodošli na platformu", Body = "Vaš nalog je aktivan. Počnite sa kreiranjem sadržaja.", Payload = """{"url":"/admin/dashboard"}""", IsRead = true, CreatedAt = now.AddDays(-30) },
                new AdminNotification { AdminUserId = 3, Type = "pending_review", Title = "Nova recenzija za Crno jezero", Body = "Ocjena 5/5 — odlična recenzija!", Payload = """{"post_id":11,"url":"/admin/reviews"}""", IsRead = false, CreatedAt = now.AddDays(-4) },
                // Ivana (id=7)
                new AdminNotification { AdminUserId = 7, Type = "post_approved", Title = "Hotel Avala odobren", Body = "Vaša objava \"Hotel Avala Budva\" je odobrena.", Payload = """{"post_id":3,"url":"/admin/lokacije"}""", IsRead = false, CreatedAt = now.AddDays(-5) },
                new AdminNotification { AdminUserId = 7, Type = "pending_review", Title = "Nova recenzija na Club Aquarius", Body = "Recenzija na čekanju — ocjena 1/5. Potrebna moderacija.", Payload = """{"post_id":16,"url":"/admin/reviews"}""", IsRead = false, CreatedAt = now.AddDays(-1) },
                // Aleksandar (id=8)
                new AdminNotification { AdminUserId = 8, Type = "post_approved", Title = "Stari grad Kotor odobren", Body = "Vaša objava je odobrena i vidljiva turistima.", Payload = """{"post_id":9,"url":"/admin/lokacije"}""", IsRead = true, CreatedAt = now.AddDays(-8) },
                new AdminNotification { AdminUserId = 8, Type = "pending_review", Title = "3 nove recenzije čekaju moderaciju", Body = "Recenzije za Stari grad Kotor su na čekanju.", Payload = """{"url":"/admin/reviews"}""", IsRead = false, CreatedAt = now.AddDays(-2) }
            );
            await _db.SaveChangesAsync();
        }
        private async Task SeedRegistrationRequestsAsync()
        {
            if (await _db.AdminRegistrationRequests.AnyAsync()) return;
            _logger.LogInformation("[Seed] Zahtjevi za registraciju...");

            string hash = BCrypt.Net.BCrypt.HashPassword("Admin123!", workFactor: 12);

            _db.AdminRegistrationRequests.AddRange(
                new AdminRegistrationRequest
                {
                    FullName = "Milica Stanković",
                    Email = "milica.s@gmail.com",
                    PasswordHash = hash,
                    IsOrganization = false,
                    IsIndividual = true,
                    Status = "pending",
                    SubmittedAt = DateTime.UtcNow.AddDays(-2)
                },
                new AdminRegistrationRequest
                {
                    FullName = "Boris Nikolić",
                    Email = "boris@adventureme.com",
                    PasswordHash = hash,
                    IsOrganization = true,
                    IsIndividual = false,
                    OrganizationName = "Adventure Montenegro",
                    OrganizationEmail = "info@adventureme.com",
                    Status = "pending",
                    SubmittedAt = DateTime.UtcNow.AddDays(-1)
                },
                new AdminRegistrationRequest
                {
                    FullName = "Tijana Jovanović",
                    Email = "tijana.j@hercegnovi.me",
                    PasswordHash = hash,
                    IsOrganization = true,
                    IsIndividual = false,
                    OrganizationName = "TO Herceg Novi",
                    OrganizationEmail = "info@hercegnovi.me",
                    Status = "pending",
                    SubmittedAt = DateTime.UtcNow.AddDays(-3)
                }
            );
            await _db.SaveChangesAsync();

            // Verification documents
            var requests = await _db.AdminRegistrationRequests.OrderBy(r => r.Id).ToListAsync();
            _db.VerificationDocuments.AddRange(
                new VerificationDocument { RegistrationRequestId = requests[0].Id, FilePath = "/uploads/docs/milica_licna.pdf", FileName = "licna_karta.pdf", FileType = "pdf", FileSizeKb = 320 },
                new VerificationDocument { RegistrationRequestId = requests[1].Id, FilePath = "/uploads/docs/boris_registracija.pdf", FileName = "rjesenje_o_registraciji.pdf", FileType = "pdf", FileSizeKb = 890 },
                new VerificationDocument { RegistrationRequestId = requests[2].Id, FilePath = "/uploads/docs/tijana_org.pdf", FileName = "rjesenje_hercegnovi.pdf", FileType = "pdf", FileSizeKb = 650 }
            );

            // Terms acceptances
            _db.TermsAcceptances.AddRange(
                new TermsAcceptance { RegistrationRequestId = requests[0].Id, TermsVersion = "1.0", IpAddress = "93.87.12.45" },
                new TermsAcceptance { RegistrationRequestId = requests[1].Id, TermsVersion = "1.0", IpAddress = "178.220.45.11" },
                new TermsAcceptance { RegistrationRequestId = requests[2].Id, TermsVersion = "1.0", IpAddress = "141.138.92.30" }
            );
            await _db.SaveChangesAsync();
        }
        private async Task SeedUserPermissionsAsync()
        {
            if (await _db.AdminUserPermissions.AnyAsync()) return;
            _logger.LogInformation("[Seed] Permisije po adminima...");

            // Dohvati permisije po kodu
            var perms = await _db.AdminPermissions.ToDictionaryAsync(p => p.Code, p => p.Id);

            // Ana (AdminId=2) — turistička org.
            var anaPerms = new[] { "create_event", "create_route", "create_cultural_site", "create_monument", "view_analytics", "manage_reviews", "manage_own_posts" };
            foreach (var code in anaPerms)
                _db.AdminUserPermissions.Add(new AdminUserPermission { AdminUserId = 2, PermissionId = perms[code], GrantedBy = 1 });

            // Nikola (AdminId=3) — NP Durmitor
            var nikolaPerms = new[] { "create_route", "create_monument", "create_sports", "manage_own_posts", "view_analytics" };
            foreach (var code in nikolaPerms)
                _db.AdminUserPermissions.Add(new AdminUserPermission { AdminUserId = 3, PermissionId = perms[code], GrantedBy = 1 });

            // Marija (AdminId=4) — fizičko lice
            var marijaPerms = new[] { "create_event", "create_route", "create_restaurant", "manage_reviews", "manage_own_posts" };
            foreach (var code in marijaPerms)
                _db.AdminUserPermissions.Add(new AdminUserPermission { AdminUserId = 4, PermissionId = perms[code], GrantedBy = 1 });

            // Dragana (AdminId=5) — hotel/smještaj
            var draganaPerms = new[] { "create_accommodation", "create_restaurant", "manage_reviews", "manage_own_posts" };
            foreach (var code in draganaPerms)
                _db.AdminUserPermissions.Add(new AdminUserPermission { AdminUserId = 5, PermissionId = perms[code], GrantedBy = 1 });

            // Stefan (AdminId=6) — ski centar
            var stefanPerms = new[] { "create_route", "create_sports", "manage_own_posts" };
            foreach (var code in stefanPerms)
                _db.AdminUserPermissions.Add(new AdminUserPermission { AdminUserId = 6, PermissionId = perms[code], GrantedBy = 1 });

            // Ivana (AdminId=7) — Budva
            var ivanaPerms = new[] { "create_accommodation", "create_restaurant", "create_club", "create_event", "view_analytics", "manage_reviews", "manage_own_posts" };
            foreach (var code in ivanaPerms)
                _db.AdminUserPermissions.Add(new AdminUserPermission { AdminUserId = 7, PermissionId = perms[code], GrantedBy = 1 });

            // Aleksandar (AdminId=8) — Kotor
            var aleksandarPerms = new[] { "create_cultural_site", "create_monument", "create_route", "create_event", "manage_reviews", "manage_own_posts", "view_analytics" };
            foreach (var code in aleksandarPerms)
                _db.AdminUserPermissions.Add(new AdminUserPermission { AdminUserId = 8, PermissionId = perms[code], GrantedBy = 1 });

            await _db.SaveChangesAsync();
        }
        private async Task SeedAuditLogAsync()
        {
            if (await _db.AdminAuditLogs.AnyAsync()) return;
            _logger.LogInformation("[Seed] Audit log...");

            var now = DateTime.UtcNow;
            _db.AdminAuditLogs.AddRange(
                new AdminAuditLog { AdminUserId = 1, PerformedBy = 1, Action = "approve", EntityType = "admin_registration_request", EntityId = 1, NewValue = """{"email":"ana.kovacevic@zabljak.travel","status":"approved"}""", PerformedAt = now.AddDays(-60) },
                new AdminAuditLog { AdminUserId = 1, PerformedBy = 1, Action = "approve", EntityType = "admin_registration_request", EntityId = 2, NewValue = """{"email":"nikola.djuric@npdurmitor.me","status":"approved"}""", PerformedAt = now.AddDays(-55) },
                new AdminAuditLog { AdminUserId = 1, PerformedBy = 1, Action = "suspend", EntityType = "admin_user", EntityId = 9, NewValue = """{"email":"dragan.lazovic@outdoorme.me","status":"suspended"}""", PerformedAt = now.AddDays(-10) },
                new AdminAuditLog { AdminUserId = 2, PerformedBy = 2, Action = "create", EntityType = "post", EntityId = 8, NewValue = """{"title":"Muzej Žabljaka","post_type":"cultural_site","status":"published"}""", PerformedAt = now.AddDays(-40) },
                new AdminAuditLog { AdminUserId = 3, PerformedBy = 3, Action = "create", EntityType = "route", EntityId = 1, NewValue = """{"name":"Staza oko Crnog jezera","difficulty":"easy"}""", PerformedAt = now.AddDays(-35) },
                new AdminAuditLog { AdminUserId = 4, PerformedBy = 4, Action = "create", EntityType = "post", EntityId = 18, NewValue = """{"title":"Durmitor Summer Fest 2025","post_type":"event"}""", PerformedAt = now.AddDays(-20) },
                new AdminAuditLog { AdminUserId = 7, PerformedBy = 7, Action = "create", EntityType = "post", EntityId = 3, NewValue = """{"title":"Hotel Avala Budva","post_type":"accommodation"}""", PerformedAt = now.AddDays(-15) },
                new AdminAuditLog { AdminUserId = 8, PerformedBy = 8, Action = "create", EntityType = "post", EntityId = 9, NewValue = """{"title":"Stari grad Kotor","post_type":"cultural_site"}""", PerformedAt = now.AddDays(-12) }
            );
            await _db.SaveChangesAsync();
        }
        private async Task SeedTouristFavoritesAsync()
        {
            if (await _db.TouristFavorites.AnyAsync()) return;
            _logger.LogInformation("[Seed] Omiljene rute...");

            var favorites = new (uint t, uint r)[]
            {
        (1,1),(3,1),(4,1),(7,1),(10,1),
        (5,2),(1,3),(8,4),(6,5),(2,3)
            };

            foreach (var (t, r) in favorites)
                _db.TouristFavorites.Add(new TouristFavorite { TouristId = t, RouteId = r });

            await _db.SaveChangesAsync();
        }
        private async Task SeedVisitPlannersAsync()
        {
            if (await _db.VisitPlanners.AnyAsync()) return;
            _logger.LogInformation("[Seed] Visit planeri...");

            _db.VisitPlanners.AddRange(
                new VisitPlanner { TouristId = 1, Title = "Ljetnji odmor — Durmitor", StartDate = new DateOnly(2025, 7, 15), EndDate = new DateOnly(2025, 7, 21), Notes = "Planinarenje, jezera i festival." },
                new VisitPlanner { TouristId = 3, Title = "Zimski odmor — Žabljak", StartDate = new DateOnly(2025, 1, 20), EndDate = new DateOnly(2025, 1, 27), Notes = "Skijanje na Savin Kuku." },
                new VisitPlanner { TouristId = 6, Title = "Budva weekend", StartDate = new DateOnly(2025, 8, 8), EndDate = new DateOnly(2025, 8, 10), Notes = "Plaža, konobe, noćni život." }
            );
            await _db.SaveChangesAsync();

            var planners = await _db.VisitPlanners.OrderBy(p => p.Id).ToListAsync();

            _db.PlannerItems.AddRange(
                // Planner 1 — Durmitor
                new PlannerItem { PlannerId = planners[0].Id, PostId = 1, DayNumber = 1, OrderInDay = 1, Notes = "Check-in Hotel Jezera", ScheduledTime = new TimeOnly(15, 0) },
                new PlannerItem { PlannerId = planners[0].Id, RouteId = 1, DayNumber = 1, OrderInDay = 2, Notes = "Šetnja oko Crnog jezera", ScheduledTime = new TimeOnly(17, 0) },
                new PlannerItem { PlannerId = planners[0].Id, PostId = 5, DayNumber = 1, OrderInDay = 3, Notes = "Večera u Restauranu Soa", ScheduledTime = new TimeOnly(20, 0) },
                new PlannerItem { PlannerId = planners[0].Id, RouteId = 2, DayNumber = 2, OrderInDay = 1, Notes = "Tura na Bobotov Kuk", ScheduledTime = new TimeOnly(7, 0) },
                new PlannerItem { PlannerId = planners[0].Id, PostId = 18, DayNumber = 4, OrderInDay = 1, Notes = "Durmitor Summer Fest", ScheduledTime = new TimeOnly(19, 0) },
                // Planner 2 — Žabljak zima
                new PlannerItem { PlannerId = planners[1].Id, PostId = 1, DayNumber = 1, OrderInDay = 1, Notes = "Check-in Hotel Jezera", ScheduledTime = new TimeOnly(14, 0) },
                new PlannerItem { PlannerId = planners[1].Id, PostId = 14, DayNumber = 2, OrderInDay = 1, Notes = "Ski dan na Savin Kuku", ScheduledTime = new TimeOnly(9, 0) },
                // Planner 3 — Budva
                new PlannerItem { PlannerId = planners[2].Id, PostId = 3, DayNumber = 1, OrderInDay = 1, Notes = "Check-in Hotel Avala", ScheduledTime = new TimeOnly(16, 0) },
                new PlannerItem { PlannerId = planners[2].Id, PostId = 6, DayNumber = 1, OrderInDay = 2, Notes = "Večera u Portunu", ScheduledTime = new TimeOnly(20, 0) },
                new PlannerItem { PlannerId = planners[2].Id, PostId = 16, DayNumber = 2, OrderInDay = 1, Notes = "Aquarius beach club", ScheduledTime = new TimeOnly(22, 0) }
            );
            await _db.SaveChangesAsync();
        }
        private async Task SeedMailingListAsync()
        {
            if (await _db.MailingList.AnyAsync()) return;
            _logger.LogInformation("[Seed] Mailing lista...");

            var entries = new (uint id, string email, string prefs)[]
            {
        (1,  "emma.wilson@gmail.com",   """{"events":true,"offers":true,"news":true}"""),
        (2,  "luca.rossi@gmail.com",    """{"events":true,"offers":true,"news":false}"""),
        (3,  "jana.novak@gmail.com",    """{"events":true,"offers":false,"news":true}"""),
        (4,  "aleksandra.p@gmail.com",  """{"events":false,"offers":true,"news":true}"""),
        (5,  "thomas.m@gmail.com",      """{"events":true,"offers":true,"news":true}"""),
        (6,  "sofia.garcia@gmail.com",  """{"events":true,"offers":true,"news":false}"""),
        (7,  "andrei.p@gmail.com",      """{"events":false,"offers":false,"news":true}"""),
        (8,  "yuki.t@gmail.com",        """{"events":true,"offers":false,"news":true}"""),
        (9,  "mohammed.r@gmail.com",    """{"events":true,"offers":true,"news":false}"""),
        (10, "klara.s@gmail.com",       """{"events":true,"offers":true,"news":true}""")
            };

            foreach (var (id, email, prefs) in entries)
                _db.MailingList.Add(new MailingList { TouristId = id, Email = email, Preferences = prefs, IsSubscribed = true });

            await _db.SaveChangesAsync();
        }
    }
}