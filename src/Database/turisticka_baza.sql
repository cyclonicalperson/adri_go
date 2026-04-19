-- ============================================================
--  TURISTIČKA APLIKACIJA — Kompletna MySQL baza podataka v3
--  Izmjene v3:
--    - tag.color format promijenjen na SUBCATEGORY|#hex|status
--    - Prošireni seed podaci za testiranje svih funkcionalnosti
--    - Više regija, postova svih tipova, dogadjaja, ruta
--    - Realistični post_view podaci po danima (grafikon poseta)
--    - Više recenzija (PENDING/APPROVED/REJECTED)
--    - Više turista i interakcija
--    - Suspendovan admin za testiranje login-a
--    - Zahtjev za registraciju na čekanju
--    - Admin notifikacije za sve admina
-- ============================================================

CREATE DATABASE IF NOT EXISTS turisticka_baza;
USE turisticka_baza;

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Briši sve postojeće tablice (redosled zbog FK)
DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS admin_notification;
DROP TABLE IF EXISTS terms_acceptance;
DROP TABLE IF EXISTS verification_document;
DROP TABLE IF EXISTS admin_registration_request;
DROP TABLE IF EXISTS admin_user_permission;
DROP TABLE IF EXISTS admin_permission;
DROP TABLE IF EXISTS mailing_list;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS ticket;
DROP TABLE IF EXISTS planner_item;
DROP TABLE IF EXISTS visit_planner;
DROP TABLE IF EXISTS tourist_favorite;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS content_share;
DROP TABLE IF EXISTS direction_request;
DROP TABLE IF EXISTS external_click;
DROP TABLE IF EXISTS post_view;
DROP TABLE IF EXISTS post_save;
DROP TABLE IF EXISTS post_like;
DROP TABLE IF EXISTS post_translation;
DROP TABLE IF EXISTS post_tag;
DROP TABLE IF EXISTS post;
DROP TABLE IF EXISTS route;
DROP TABLE IF EXISTS tag;
DROP TABLE IF EXISTS region;
DROP TABLE IF EXISTS tourist;
DROP TABLE IF EXISTS admin_user;
DROP TABLE IF EXISTS organization;

-- Briši viewove
DROP VIEW IF EXISTS v_posts_full;
DROP VIEW IF EXISTS v_post_stats;
DROP VIEW IF EXISTS v_routes_full;
DROP VIEW IF EXISTS v_reviews_full;
DROP VIEW IF EXISTS v_admin_users_full;
DROP VIEW IF EXISTS v_superadmin_overview;
DROP VIEW IF EXISTS v_region_popularity;


-- ============================================================
--  1. ORGANIZACIJE
-- ============================================================

CREATE TABLE organization (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(100) NOT NULL,
    contact_email   VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    address         VARCHAR(300),
    website         VARCHAR(300),
    is_verified     TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  2. ADMIN KORISNICI
-- ============================================================

CREATE TABLE admin_user (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id  INT UNSIGNED,
    full_name        VARCHAR(200) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at DATETIME,
    password_hash    VARCHAR(255) NOT NULL,
    role             ENUM('superadmin','admin') NOT NULL DEFAULT 'admin',
    is_individual    TINYINT(1) NOT NULL DEFAULT 1,
    account_status   ENUM('active','suspended','pending') NOT NULL DEFAULT 'pending',
    profile_image    VARCHAR(500),
    last_login_at    DATETIME,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_org FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  3. PERMISIJE
-- ============================================================

CREATE TABLE admin_permission (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE,
    label       VARCHAR(200) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    description VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE admin_user_permission (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id   INT UNSIGNED NOT NULL,
    permission_id   INT UNSIGNED NOT NULL,
    region_id       INT UNSIGNED,
    granted_by      INT UNSIGNED NOT NULL,
    granted_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_perm (admin_user_id, permission_id),
    CONSTRAINT fk_aup_user    FOREIGN KEY (admin_user_id) REFERENCES admin_user(id)       ON DELETE CASCADE,
    CONSTRAINT fk_aup_perm    FOREIGN KEY (permission_id) REFERENCES admin_permission(id)  ON DELETE CASCADE,
    CONSTRAINT fk_aup_granted FOREIGN KEY (granted_by)    REFERENCES admin_user(id),
    CONSTRAINT fk_aup_region  FOREIGN KEY (region_id)     REFERENCES region(id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  4. REGISTRACIJA ADMINA
-- ============================================================

CREATE TABLE admin_registration_request (
    id                         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name                  VARCHAR(200) NOT NULL,
    email                      VARCHAR(255) NOT NULL,
    password_hash              VARCHAR(255) NOT NULL,
    email_verification_token   VARCHAR(100),
    email_verified_at          DATETIME,
    is_organization            TINYINT(1) NOT NULL DEFAULT 0,
    is_individual              TINYINT(1) NOT NULL DEFAULT 1,
    organization_name          VARCHAR(200),
    organization_email         VARCHAR(255),
    status                     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    rejection_reason           TEXT,
    submitted_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at                DATETIME,
    reviewed_by                INT UNSIGNED,
    CONSTRAINT fk_reg_reviewed FOREIGN KEY (reviewed_by) REFERENCES admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE verification_document (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    registration_request_id INT UNSIGNED NOT NULL,
    file_path               VARCHAR(500) NOT NULL,
    file_name               VARCHAR(255) NOT NULL,
    file_type               ENUM('pdf','jpg','png') NOT NULL,
    file_size_kb            INT UNSIGNED NOT NULL,
    uploaded_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vd_request FOREIGN KEY (registration_request_id)
        REFERENCES admin_registration_request(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE terms_acceptance (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id           INT UNSIGNED,
    registration_request_id INT UNSIGNED,
    terms_version           VARCHAR(20) NOT NULL,
    accepted_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address              VARCHAR(45),
    CONSTRAINT fk_ta_user    FOREIGN KEY (admin_user_id)           REFERENCES admin_user(id)                    ON DELETE SET NULL,
    CONSTRAINT fk_ta_request FOREIGN KEY (registration_request_id) REFERENCES admin_registration_request(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  5. ADMIN NOTIFIKACIJE
-- ============================================================

CREATE TABLE admin_notification (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id INT UNSIGNED NOT NULL,
    type          VARCHAR(50) NOT NULL,
    title         VARCHAR(200) NOT NULL,
    body          TEXT,
    payload       JSON,
    is_read       TINYINT(1) NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at       DATETIME,
    CONSTRAINT fk_an_user FOREIGN KEY (admin_user_id) REFERENCES admin_user(id) ON DELETE CASCADE,
    INDEX idx_an_admin   (admin_user_id),
    INDEX idx_an_read    (is_read),
    INDEX idx_an_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  6. AUDIT LOG
-- ============================================================

CREATE TABLE admin_audit_log (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id   INT UNSIGNED,
    performed_by    INT UNSIGNED,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       INT UNSIGNED,
    old_value       JSON,
    new_value       JSON,
    performed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address      VARCHAR(45),
    CONSTRAINT fk_aal_user FOREIGN KEY (admin_user_id) REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT fk_aal_by   FOREIGN KEY (performed_by)  REFERENCES admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  7. REGIJE
-- ============================================================

CREATE TABLE region (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    type        ENUM('city','mountain','lake','national_park','coast','village','other') NOT NULL,
    description TEXT,
    country     VARCHAR(100) NOT NULL DEFAULT 'Montenegro',
    lat         DECIMAL(10,7),
    lng         DECIMAL(10,7),
    cover_image VARCHAR(500),
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  8. OBJAVE (POSTS)
-- ============================================================

CREATE TABLE post (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id            INT UNSIGNED NOT NULL,
    region_id           INT UNSIGNED,
    title               VARCHAR(300) NOT NULL,
    post_type           ENUM('accommodation','restaurant','club','cultural_site','monument',
                             'sports_facility','event','attraction','shop','other') NOT NULL,
    description         TEXT,
    lat                 DECIMAL(10,7),
    lng                 DECIMAL(10,7),
    address             VARCHAR(300),
    external_url        VARCHAR(500),
    external_url_label  VARCHAR(100),
    images              JSON,
    opening_hours       JSON,
    details             JSON,
    status              ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    view_count          INT UNSIGNED NOT NULL DEFAULT 0,
    like_count          INT UNSIGNED NOT NULL DEFAULT 0,
    save_count          INT UNSIGNED NOT NULL DEFAULT 0,
    review_count        INT UNSIGNED NOT NULL DEFAULT 0,
    avg_rating          DECIMAL(3,2),
    published_at        DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_admin  FOREIGN KEY (admin_id)  REFERENCES admin_user(id),
    CONSTRAINT fk_post_region FOREIGN KEY (region_id) REFERENCES region(id) ON DELETE SET NULL,
    INDEX idx_post_type   (post_type),
    INDEX idx_post_status (status),
    INDEX idx_post_admin  (admin_id),
    INDEX idx_post_region (region_id),
    INDEX idx_post_coords (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE post_translation (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id     INT UNSIGNED NOT NULL,
    lang_code   VARCHAR(5) NOT NULL,
    title       VARCHAR(300) NOT NULL,
    description TEXT,
    UNIQUE KEY uq_post_lang (post_id, lang_code),
    CONSTRAINT fk_pt_post FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  9. TAGOVI  (v3: color format = SUBCATEGORY|#hex|status)
-- ============================================================

CREATE TABLE tag (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name     VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100),
    color    VARCHAR(100) COMMENT 'Format za aktivnosti: SUBCATEGORY|#hexcolor|status; za ostale: plain hex'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE post_tag (
    post_id INT UNSIGNED NOT NULL,
    tag_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_postag_post FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    CONSTRAINT fk_postag_tag  FOREIGN KEY (tag_id)  REFERENCES tag(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  10. RUTE
-- ============================================================

CREATE TABLE route (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id        INT UNSIGNED NOT NULL,
    region_id       INT UNSIGNED,
    name            VARCHAR(200) NOT NULL,
    difficulty      ENUM('easy','moderate','hard','expert') NOT NULL DEFAULT 'moderate',
    distance_km     DECIMAL(7,2),
    duration_min    INT UNSIGNED,
    elevation_gain  INT UNSIGNED,
    description     TEXT,
    waypoints       JSON,
    gpx_file_path   VARCHAR(500),
    images          JSON,
    status          ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    view_count      INT UNSIGNED NOT NULL DEFAULT 0,
    save_count      INT UNSIGNED NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_route_admin  FOREIGN KEY (admin_id)  REFERENCES admin_user(id),
    CONSTRAINT fk_route_region FOREIGN KEY (region_id) REFERENCES region(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  11. TURISTI
-- ============================================================

CREATE TABLE tourist (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(200),
    email         VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    language      VARCHAR(5) NOT NULL DEFAULT 'en',
    interests     JSON,
    home_lat      DECIMAL(10,7),
    home_lng      DECIMAL(10,7),
    profile_image VARCHAR(500),
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  12. INTERAKCIJE
-- ============================================================

CREATE TABLE post_like (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT UNSIGNED NOT NULL,
    post_id    INT UNSIGNED NOT NULL,
    liked_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_like (tourist_id, post_id),
    CONSTRAINT fk_like_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE,
    CONSTRAINT fk_like_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_save (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT UNSIGNED NOT NULL,
    post_id    INT UNSIGNED NOT NULL,
    saved_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_save (tourist_id, post_id),
    CONSTRAINT fk_save_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE,
    CONSTRAINT fk_save_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_view (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id   INT UNSIGNED,
    post_id      INT UNSIGNED NOT NULL,
    viewed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_sec INT UNSIGNED,
    CONSTRAINT fk_view_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_view_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    INDEX idx_view_post    (post_id),
    INDEX idx_view_tourist (tourist_id),
    INDEX idx_view_date    (viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE external_click (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT UNSIGNED,
    post_id    INT UNSIGNED NOT NULL,
    url        VARCHAR(500),
    clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ec_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_ec_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE direction_request (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id   INT UNSIGNED,
    post_id      INT UNSIGNED NOT NULL,
    from_lat     DECIMAL(10,7),
    from_lng     DECIMAL(10,7),
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dr_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_dr_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_share (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT UNSIGNED,
    post_id    INT UNSIGNED,
    route_id   INT UNSIGNED,
    platform   VARCHAR(50),
    shared_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_cs_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    CONSTRAINT fk_cs_route   FOREIGN KEY (route_id)   REFERENCES route(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  13. RECENZIJE
-- ============================================================

CREATE TABLE review (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED,
    post_id     INT UNSIGNED,
    route_id    INT UNSIGNED,
    rating      TINYINT UNSIGNED NOT NULL,
    comment     TEXT,
    status      ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    is_approved TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rev_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_rev_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    CONSTRAINT fk_rev_route   FOREIGN KEY (route_id)   REFERENCES route(id)   ON DELETE CASCADE,
    INDEX idx_review_post   (post_id),
    INDEX idx_review_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  14-18. OSTALE TABLICE
-- ============================================================

CREATE TABLE tourist_favorite (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT UNSIGNED NOT NULL,
    post_id    INT UNSIGNED,
    route_id   INT UNSIGNED,
    saved_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fav_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE,
    CONSTRAINT fk_fav_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    CONSTRAINT fk_fav_route   FOREIGN KEY (route_id)   REFERENCES route(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE visit_planner (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT UNSIGNED NOT NULL,
    title      VARCHAR(200) NOT NULL,
    start_date DATE,
    end_date   DATE,
    notes      TEXT,
    is_public  TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vp_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE planner_item (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    planner_id     INT UNSIGNED NOT NULL,
    post_id        INT UNSIGNED,
    route_id       INT UNSIGNED,
    day_number     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    order_in_day   TINYINT UNSIGNED NOT NULL DEFAULT 1,
    notes          TEXT,
    scheduled_time TIME,
    CONSTRAINT fk_pi_planner FOREIGN KEY (planner_id) REFERENCES visit_planner(id) ON DELETE CASCADE,
    CONSTRAINT fk_pi_post    FOREIGN KEY (post_id)    REFERENCES post(id)          ON DELETE SET NULL,
    CONSTRAINT fk_pi_route   FOREIGN KEY (route_id)   REFERENCES route(id)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id     INT UNSIGNED NOT NULL,
    tourist_id  INT UNSIGNED,
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    qr_code     VARCHAR(500),
    price_paid  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status      ENUM('issued','used','cancelled','refunded') NOT NULL DEFAULT 'issued',
    issued_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at     DATETIME,
    CONSTRAINT fk_tick_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    CONSTRAINT fk_tick_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT UNSIGNED NOT NULL,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    payload    JSON,
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at    DATETIME,
    CONSTRAINT fk_notif_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mailing_list (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id      INT UNSIGNED,
    email           VARCHAR(255) NOT NULL,
    preferences     JSON,
    is_subscribed   TINYINT(1) NOT NULL DEFAULT 1,
    subscribed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME,
    CONSTRAINT fk_ml_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- ============================================================
--  SEED DATA v3
-- ============================================================
-- ============================================================


-- ============================================================
--  PERMISIJE
-- ============================================================

INSERT INTO admin_permission (code, label, category, description) VALUES
('create_accommodation',  'Kreiranje smještaja',        'content',   'Dodavanje hotela, apartmana, privatnog smještaja'),
('create_restaurant',     'Kreiranje restorana',        'content',   'Dodavanje restorana i kafića'),
('create_club',           'Kreiranje klubova',          'content',   'Dodavanje noćnih klubova i barova'),
('create_event',          'Kreiranje dogadjaja',        'content',   'Dodavanje koncerata, takmičenja, tura'),
('create_route',          'Kreiranje ruta',             'content',   'Dodavanje pješačkih i biciklističkih ruta'),
('create_cultural_site',  'Kreiranje kulturnih mjesta', 'content',   'Dodavanje muzeja, galerija, kulturnih objekata'),
('create_monument',       'Kreiranje spomenika',        'content',   'Dodavanje istorijskih i prirodnih spomenika'),
('create_sports',         'Kreiranje sportskih obj.',   'content',   'Dodavanje sportskih terena i objekata'),
('create_shop',           'Kreiranje prodavnica',       'content',   'Dodavanje prodavnica i tržnih centara'),
('manage_reviews',        'Upravljanje recenzijama',    'content',   'Odobravanje i brisanje recenzija svojih objava'),
('view_analytics',        'Pregled analitike',          'analytics', 'Pregled statistika o objavama i turistima'),
('manage_own_posts',      'Upravljanje vlastitim obj.', 'content',   'Editovanje i brisanje vlastitih objava'),
('manage_tags',           'Upravljanje tagovima',       'content',   'Dodavanje i uredjivanje tagova na objavama'),
('manage_translations',   'Upravljanje prijevodima',    'content',   'Dodavanje prijevoda objava na druge jezike'),
('view_tourists',         'Pregled turista',            'analytics', 'Pregled podataka o turistima'),
('manage_tickets',        'Upravljanje kartama',        'content',   'Pregled i upravljanje digitalnim ulaznicama');


-- ============================================================
--  ORGANIZACIJE
-- ============================================================

INSERT INTO organization (name, type, contact_email, phone, website, is_verified) VALUES
('Turistička organizacija Žabljak',  'municipality',   'info@zabljak.travel',   '+38269123001', 'https://zabljak.travel',   1),
('NP Durmitor',                      'municipality',   'info@npdurmitor.me',    '+38269123002', 'https://npdurmitor.me',    1),
('Montenegro Adventures d.o.o.',     'tourist_agency', 'hello@mnadv.me',        '+38268234001', 'https://montenegroadv.me', 1),
('Hotel Jezera Žabljak',             'hotel_chain',    'rezervacije@jezera.me', '+38269345001', 'https://hoteljezera.me',   1),
('Outdoor Montenegro',               'tourist_agency', 'info@outdoorme.me',     '+38268456001', 'https://outdoorme.me',     0),
('Turistička org. Budva',            'municipality',   'info@budva.travel',     '+38233452100', 'https://budva.travel',     1),
('Kotor Heritage Tours',             'tourist_agency', 'tours@kotorheritage.me','+38232325001', 'https://kotorheritage.me', 1);


-- ============================================================
--  ADMIN KORISNICI
--  Lozinke (bcrypt, cost=12):
--    superadmin@touristhub.me  → SuperAdmin123!
--    ostali admini             → Admin123!
--    suspendovan               → Admin123!
-- ============================================================

-- SuperAdmin
INSERT INTO admin_user (organization_id, full_name, email, email_verified_at, password_hash, role, is_individual, account_status) VALUES
(NULL, 'Marko Petrović', 'superadmin@touristhub.me',
 '2024-01-01 00:00:00',
 '01cVBRfT5lroSYX3twWtmf3Dg3KiLs6gzsr4qvggokk=',
 'superadmin', 1, 'active');

-- Aktivni admini
INSERT INTO admin_user (organization_id, full_name, email, email_verified_at, password_hash, role, is_individual, account_status) VALUES
(1, 'Ana Kovačević',   'ana.kovacevic@zabljak.travel',
 '2024-01-15 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 0, 'active'),
(2, 'Nikola Đurić',    'nikola.djuric@npdurmitor.me',
 '2024-01-16 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 0, 'active'),
(3, 'Jovana Milić',    'jovana.milic@mnadv.me',
 '2024-01-17 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 0, 'active'),
(4, 'Stefan Radović',  'stefan.radovic@hoteljezera.me',
 '2024-01-18 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 0, 'active'),
(NULL, 'Petar Vuković', 'petar.vukovic@gmail.com',
 '2024-01-19 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 1, 'active'),
(6, 'Ivana Bošković',  'ivana.boskovic@budva.travel',
 '2024-02-01 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 0, 'active'),
(7, 'Aleksandar Vujić','aleksandar.vujic@kotorheritage.me',
 '2024-02-05 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 0, 'active');

-- Suspendovan admin (za testiranje login poruke)
INSERT INTO admin_user (organization_id, full_name, email, email_verified_at, password_hash, role, is_individual, account_status) VALUES
(5, 'Dragan Lazović', 'dragan.lazovic@outdoorme.me',
 '2024-03-01 10:00:00', 'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=', 'admin', 0, 'suspended');


-- ============================================================
--  PERMISIJE PO ADMINIMA
-- ============================================================

-- Ana (id=2) — turistička org.
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(2, (SELECT id FROM admin_permission WHERE code='create_event'),        1),
(2, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(2, (SELECT id FROM admin_permission WHERE code='create_cultural_site'),1),
(2, (SELECT id FROM admin_permission WHERE code='create_monument'),     1),
(2, (SELECT id FROM admin_permission WHERE code='view_analytics'),      1),
(2, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(2, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Nikola (id=3) — NP Durmitor
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(3, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(3, (SELECT id FROM admin_permission WHERE code='create_monument'),     1),
(3, (SELECT id FROM admin_permission WHERE code='create_sports'),       1),
(3, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1),
(3, (SELECT id FROM admin_permission WHERE code='view_analytics'),      1);

-- Jovana (id=4) — agencija
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(4, (SELECT id FROM admin_permission WHERE code='create_event'),        1),
(4, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(4, (SELECT id FROM admin_permission WHERE code='create_restaurant'),   1),
(4, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(4, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Stefan (id=5) — hotel
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(5, (SELECT id FROM admin_permission WHERE code='create_accommodation'),1),
(5, (SELECT id FROM admin_permission WHERE code='create_restaurant'),   1),
(5, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(5, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Petar (id=6) — fizičko lice
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(6, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(6, (SELECT id FROM admin_permission WHERE code='create_sports'),       1),
(6, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Ivana (id=7) — Budva
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(7, (SELECT id FROM admin_permission WHERE code='create_accommodation'),1),
(7, (SELECT id FROM admin_permission WHERE code='create_restaurant'),   1),
(7, (SELECT id FROM admin_permission WHERE code='create_club'),         1),
(7, (SELECT id FROM admin_permission WHERE code='create_event'),        1),
(7, (SELECT id FROM admin_permission WHERE code='view_analytics'),      1),
(7, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(7, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Aleksandar (id=8) — Kotor
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(8, (SELECT id FROM admin_permission WHERE code='create_cultural_site'),1),
(8, (SELECT id FROM admin_permission WHERE code='create_monument'),     1),
(8, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(8, (SELECT id FROM admin_permission WHERE code='create_event'),        1),
(8, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(8, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1),
(8, (SELECT id FROM admin_permission WHERE code='view_analytics'),      1);


-- ============================================================
--  ZAHTJEVI ZA REGISTRACIJU
-- ============================================================

INSERT INTO admin_registration_request
    (full_name, email, password_hash, is_organization, is_individual, organization_name, organization_email, status)
VALUES
('Milica Stanković',  'milica.s@gmail.com',       'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=',
 0, 1, NULL, NULL, 'pending'),
('Boris Nikolić',     'boris@adventureme.com',     'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=',
 1, 0, 'Adventure Montenegro', 'info@adventureme.com', 'pending'),
('Tijana Jovanović',  'tijana.j@hercegnovi.me',    'PrP+ZrMeO00Q+nC1ytSccRIpSvauTkdqHEBRVdRaoSE=',
 1, 0, 'TO Herceg Novi', 'info@hercegnovi.me', 'pending');

INSERT INTO verification_document (registration_request_id, file_path, file_name, file_type, file_size_kb) VALUES
(1, '/uploads/docs/milica_licna.pdf',       'licna_karta.pdf',             'pdf', 320),
(2, '/uploads/docs/boris_registracija.pdf', 'rjesenje_o_registraciji.pdf', 'pdf', 890),
(3, '/uploads/docs/tijana_org.pdf',         'rjesenje_hercegnovi.pdf',     'pdf', 650);

INSERT INTO terms_acceptance (registration_request_id, terms_version, ip_address) VALUES
(1, '1.0', '93.87.12.45'),
(2, '1.0', '178.220.45.11'),
(3, '1.0', '141.138.92.30');


-- ============================================================
--  REGIJE (proširene — sve regije Crne Gore)
-- ============================================================

INSERT INTO region (name, type, description, country, lat, lng, cover_image) VALUES
-- Durmitor oblast
('Žabljak',        'city',          'Planinski grad na Durmitoru, najviši grad na Balkanu.',           'Montenegro', 43.1556, 19.1225, '/images/regions/zabljak.jpg'),
('Durmitor',       'national_park', 'Nacionalni park UNESCO svjetske baštine sa 18 ledničkih jezera.', 'Montenegro', 43.1500, 19.0167, '/images/regions/durmitor.jpg'),
('Crno jezero',    'lake',          'Najpoznatije jezero Durmitora.',                                  'Montenegro', 43.1378, 19.0644, '/images/regions/crnojezero.jpg'),
('Tara kanjon',    'national_park', 'Najdublji kanjon u Evropi.',                                      'Montenegro', 43.2000, 19.2500, '/images/regions/tara.jpg'),
-- Primorje
('Budva',          'city',          'Najpoznatije turističko odredište Crnogorskog primorja.',          'Montenegro', 42.2864, 18.8400, '/images/regions/budva.jpg'),
('Kotor',          'city',          'UNESCO zaštićeni stari grad sa venetskom arhitekturom.',           'Montenegro', 42.4247, 18.7712, '/images/regions/kotor.jpg'),
('Herceg Novi',    'city',          'Grad cvijeća na ulazu u Bokokotorski zaliv.',                     'Montenegro', 42.4531, 18.5375, '/images/regions/hercegnovi.jpg'),
('Ulcinj',         'city',          'Najjužniji grad Crne Gore, poznata dugačka plaža.',               'Montenegro', 41.9292, 19.2253, '/images/regions/ulcinj.jpg'),
('Sveti Stefan',   'village',       'Ikonski hotelijerski otočić — simbol crnogorskog turizma.',       'Montenegro', 42.2561, 18.8925, '/images/regions/svetistefan.jpg'),
-- Unutrašnjost
('Podgorica',      'city',          'Glavni grad Crne Gore.',                                          'Montenegro', 42.4304, 19.2594, '/images/regions/podgorica.jpg'),
('Skadarsko jezero','lake',         'Najveće jezero na Balkanu, raj za ptice.',                        'Montenegro', 42.1667, 19.2833, '/images/regions/skadar.jpg'),
('Cetinje',        'city',          'Stara prijestolnica Crne Gore.',                                  'Montenegro', 42.3906, 18.9228, '/images/regions/cetinje.jpg');


-- ============================================================
--  TAGOVI (v3: aktivnosti sa SUBCATEGORY|#hex|status formatom)
-- ============================================================

INSERT INTO tag (name, category, color) VALUES
-- Aktivnosti (format: SUBCATEGORY|#hex|approved ili pending)
('Pješačenje',      'aktivnost',  'ADVENTURE|#22c55e|approved'),
('Biciklizam',      'aktivnost',  'SPORT|#3b82f6|approved'),
('Plivanje',        'aktivnost',  'SPORT|#3b82f6|approved'),
('Noćni život',     'aktivnost',  'NIGHTLIFE|#1e1b4b|approved'),
('Sport',           'aktivnost',  'SPORT|#3b82f6|approved'),
('Adrenalin',       'aktivnost',  'ADVENTURE|#22c55e|approved'),
('Priroda',         'aktivnost',  'ADVENTURE|#22c55e|approved'),
('Muzika',          'aktivnost',  'NIGHTLIFE|#1e1b4b|approved'),
('Gastronomija',    'aktivnost',  'DINING|#ef4444|approved'),
('Outdoor',         'aktivnost',  'ADVENTURE|#22c55e|approved'),
('Wellness',        'aktivnost',  'WELLNESS|#8b5cf6|approved'),
('Rafting',         'aktivnost',  'ADVENTURE|#22c55e|approved'),
('Skijanje',        'aktivnost',  'SPORT|#3b82f6|approved'),
('Ronjenje',        'aktivnost',  'SPORT|#3b82f6|approved'),
('Kultura',         'aktivnost',  'CULTURE|#ec4899|approved'),
('Razgledanje',     'aktivnost',  'SIGHTSEEING|#06b6d4|approved'),
('Fotografija',     'aktivnost',  'SIGHTSEEING|#06b6d4|approved'),
('Shopping',        'aktivnost',  'SHOPPING|#f59e0b|approved'),
('Yoga',            'aktivnost',  'WELLNESS|#8b5cf6|pending'),
('Paraglajding',    'aktivnost',  'ADVENTURE|#22c55e|pending'),
-- Stilovi / ostali tagovi (plain format)
('Porodično',       'stil',       '#4A90E2'),
('Romantično',      'stil',       '#E24A7C'),
('Besplatno',       'cijena',     '#27AE60'),
('Parking',         'amenity',    '#7F8C8D'),
('WiFi',            'amenity',    '#2980B9'),
('UNESCO',          'oznaka',     '#C0392B'),
('Historijsko',     'oznaka',     '#D35400'),
('Kulturno',        'oznaka',     '#9B59B6'),
('Restoran',        'tip',        '#E74C3C'),
('Kafić',           'tip',        '#935116');


-- ============================================================
--  TURISTI
-- ============================================================

INSERT INTO tourist (name, email, password_hash, language, interests) VALUES
('Emma Wilson',        'emma.wilson@gmail.com',    '$2a$12$touristHash001', 'en', JSON_ARRAY('hiking','nature','photography','culture')),
('Luca Rossi',         'luca.rossi@gmail.com',     '$2a$12$touristHash002', 'en', JSON_ARRAY('food','nightlife','beach','history')),
('Jana Novák',         'jana.novak@gmail.com',     '$2a$12$touristHash003', 'de', JSON_ARRAY('hiking','skiing','culture','family')),
('Aleksandra Popović', 'aleksandra.p@gmail.com',   '$2a$12$touristHash004', 'sr', JSON_ARRAY('nature','culture','food')),
('Thomas Müller',      'thomas.m@gmail.com',       '$2a$12$touristHash005', 'de', JSON_ARRAY('skiing','adventure','sport')),
('Sofia García',       'sofia.garcia@gmail.com',   '$2a$12$touristHash006', 'en', JSON_ARRAY('beach','food','culture','nightlife')),
('Andrei Popescu',     'andrei.p@gmail.com',       '$2a$12$touristHash007', 'en', JSON_ARRAY('adventure','hiking','photography')),
('Yuki Tanaka',        'yuki.t@gmail.com',         '$2a$12$touristHash008', 'en', JSON_ARRAY('culture','food','sightseeing')),
('Mohammed Al-Rashid', 'mohammed.r@gmail.com',     '$2a$12$touristHash009', 'en', JSON_ARRAY('culture','history','food')),
('Klara Svensson',     'klara.s@gmail.com',        '$2a$12$touristHash010', 'en', JSON_ARRAY('nature','hiking','wellness'));


-- ============================================================
--  OBJAVE (POSTS) — sve kategorije, svi statusi
-- ============================================================

-- ── SMJEŠTAJ ─────────────────────────────────────────────────

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, opening_hours, details, status,
                  view_count, like_count, save_count, review_count, avg_rating, published_at)
VALUES (
  5, 1, 'Hotel Jezera Žabljak', 'accommodation',
  'Četvorozvjezdičani hotel smješten na obali Crnog jezera. Panoramski pogled na Durmitor, restoran, spa i besplatan ski servis.',
  43.1378, 19.0644, 'Žabljak bb, 84210 Žabljak',
  'https://www.booking.com/hotel/me/jezera-zabljak.html', 'Rezerviši na Booking',
  JSON_ARRAY('/images/posts/jezera1.jpg','/images/posts/jezera2.jpg','/images/posts/jezera3.jpg'),
  JSON_OBJECT('mon','00:00-24:00','tue','00:00-24:00','wed','00:00-24:00','thu','00:00-24:00','fri','00:00-24:00','sat','00:00-24:00','sun','00:00-24:00'),
  JSON_OBJECT('stars',4,'rooms',86,'price_from',85,'currency','EUR','amenities',JSON_ARRAY('spa','restaurant','ski_service','parking','wifi','pool')),
  'published', 312, 47, 28, 6, 4.58,
  '2024-03-01 09:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, details, status,
                  view_count, like_count, save_count, review_count, avg_rating, published_at)
VALUES (
  2, 1, 'Apartmani Durmitor View', 'accommodation',
  'Privatni apartmani sa pogledom na Durmitor. Potpuno opremljeni, idealni za porodice. Besplatan parking i WiFi.',
  43.1570, 19.1235, 'Vuka Karadžića 8, Žabljak',
  'https://www.airbnb.com/rooms/durmitorview', 'Rezerviši na Airbnb',
  JSON_ARRAY('/images/posts/apt1.jpg','/images/posts/apt2.jpg'),
  JSON_OBJECT('price_from',45,'currency','EUR','num_apartments',6,'amenities',JSON_ARRAY('parking','wifi','kitchen','bbq')),
  'published', 178, 31, 19, 3, 4.33,
  '2024-03-20 10:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, details, status,
                  view_count, like_count, save_count, published_at)
VALUES (
  7, 5, 'Hotel Avala Budva', 'accommodation',
  'Luksuzni hotel tik uz plažu u Budvi. Bazen, wellness, 5 restorana i direktan izlaz na more.',
  42.2837, 18.8412, 'Mediteranska bb, Budva',
  'https://www.booking.com/hotel/me/avala.html', 'Rezerviši',
  JSON_ARRAY('/images/posts/avala1.jpg','/images/posts/avala2.jpg'),
  JSON_OBJECT('stars',5,'rooms',204,'price_from',180,'currency','EUR'),
  'published', 445, 89, 52,
  '2024-04-01 10:00:00'
);

-- Draft smještaj za testiranje
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  details, status)
VALUES (
  7, 5, 'Boutique apartmani Mogren (nacrt)', 'accommodation',
  'Novi apartmani na Mogren plaži. U pripremi za sezonu 2025.',
  42.2780, 18.8350, 'Mogren bb, Budva',
  JSON_OBJECT('price_from',70,'currency','EUR'),
  'draft'
);

-- ── RESTORANI ────────────────────────────────────────────────

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status,
                  view_count, like_count, review_count, avg_rating, published_at)
VALUES (
  5, 1, 'Restoran Soa', 'restaurant',
  'Tradicionalna crnogorska kuhinja sa lokalno uzgojenim namirnicama. Specijalitet: jagnjetina ispod sača.',
  43.1556, 19.1225, 'Njegoševa 12, Žabljak',
  JSON_ARRAY('/images/posts/soa1.jpg','/images/posts/soa2.jpg'),
  JSON_OBJECT('mon','12:00-22:00','tue','12:00-22:00','wed','12:00-22:00','thu','12:00-22:00','fri','12:00-23:00','sat','12:00-23:00','sun','12:00-21:00'),
  JSON_OBJECT('cuisine','Montenegrin','price_range','€€','capacity',60),
  'published', 201, 38, 4, 4.50,
  '2024-03-05 10:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status,
                  view_count, like_count, review_count, avg_rating, published_at)
VALUES (
  7, 5, 'Konoba Portun Budva', 'restaurant',
  'Riblja konoba u starom gradu Budve. Svježe ribe i plodovi mora direktno iz Jadranskog mora.',
  42.2791, 18.8378, 'Stari grad, Budva',
  JSON_ARRAY('/images/posts/portun1.jpg','/images/posts/portun2.jpg'),
  JSON_OBJECT('mon','12:00-23:00','tue','12:00-23:00','wed','12:00-23:00','thu','12:00-23:00','fri','12:00-24:00','sat','12:00-24:00','sun','12:00-22:00'),
  JSON_OBJECT('cuisine','Seafood','price_range','€€€','capacity',45),
  'published', 167, 29, 3, 4.67,
  '2024-05-10 12:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status,
                  view_count, like_count, review_count, avg_rating, published_at)
VALUES (
  8, 6, 'Restaurant Galion Kotor', 'restaurant',
  'Jedini restoran na vodi u Kotoru. Romantična atmosfera, mediteranska kuhinja, pogled na tvrdjavu.',
  42.4205, 18.7698, 'Šuranj bb, Kotor',
  JSON_ARRAY('/images/posts/galion1.jpg'),
  JSON_OBJECT('mon','13:00-23:00','tue','13:00-23:00','wed','13:00-23:00','thu','13:00-23:00','fri','13:00-24:00','sat','13:00-24:00','sun','13:00-22:00'),
  JSON_OBJECT('cuisine','Mediterranean','price_range','€€€','capacity',30),
  'published', 134, 24, 2, 4.50,
  '2024-06-01 10:00:00'
);

-- ── KULTURNI OBJEKTI ─────────────────────────────────────────

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, opening_hours, details, status,
                  view_count, like_count, review_count, avg_rating, published_at)
VALUES (
  2, 1, 'Muzej Žabljaka', 'cultural_site',
  'Muzej posvećen historiji i prirodnim bogatstvima Durmitora.',
  43.1548, 19.1218, 'Trg Durmitorskih ratnika 2, Žabljak',
  'https://muzejzabljak.me', 'Saznaj više',
  JSON_ARRAY('/images/posts/muzej1.jpg'),
  JSON_OBJECT('mon','closed','tue','09:00-17:00','wed','09:00-17:00','thu','09:00-17:00','fri','09:00-17:00','sat','10:00-16:00','sun','closed'),
  JSON_OBJECT('entrance_fee',3,'currency','EUR','guided_tours',true),
  'published', 143, 21, 2, 4.00,
  '2024-03-08 11:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status,
                  view_count, like_count, review_count, avg_rating, published_at)
VALUES (
  8, 6, 'Stari grad Kotor', 'cultural_site',
  'Savršeno očuvani medievalni grad okružen moćnim zidinama. UNESCO svjetska baština.',
  42.4236, 18.7711, 'Stari grad, Kotor',
  JSON_ARRAY('/images/posts/kotor1.jpg','/images/posts/kotor2.jpg','/images/posts/kotor3.jpg'),
  JSON_OBJECT('mon','00:00-24:00','tue','00:00-24:00','wed','00:00-24:00','thu','00:00-24:00','fri','00:00-24:00','sat','00:00-24:00','sun','00:00-24:00'),
  JSON_OBJECT('entrance_fee',0,'wall_climb_fee',8,'currency','EUR'),
  'published', 523, 112, 5, 4.80,
  '2024-04-15 09:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status, published_at)
VALUES (
  8, 12, 'Cetinjski manastir', 'cultural_site',
  'Pravoslavni manastir u Cetinju, duhovno središte Crnogorske crkve. Čuva mošti Svetog Petra Cetinjskog.',
  42.3900, 18.9200, 'Cetinje',
  JSON_ARRAY('/images/posts/cetinje1.jpg'),
  JSON_OBJECT('entrance_fee',0,'dress_code',true),
  'published', '2024-05-01 10:00:00'
);

-- ── MONUMENTI ────────────────────────────────────────────────

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status,
                  view_count, like_count, published_at)
VALUES (
  3, 3, 'Crno jezero', 'attraction',
  'Simbol Durmitora. Glacijalnog porijekla, sastoji se od Malog i Velikog jezera.',
  43.1378, 19.0644, 'NP Durmitor, Žabljak',
  JSON_ARRAY('/images/posts/crnojezero1.jpg','/images/posts/crnojezero2.jpg'),
  JSON_OBJECT('entrance_fee',5,'currency','EUR','perimeter_km',3.6,'altitude_m',1416),
  'published', 687, 143,
  '2024-02-15 08:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status, published_at)
VALUES (
  3, 2, 'Đavolja varoš Durmitor', 'monument',
  'Vulkanski oblici terena koji izgledaju kao kamene figure. Mistično i fotografski spektakularno.',
  43.1450, 19.0890, 'NP Durmitor',
  JSON_ARRAY('/images/posts/djavaros1.jpg'),
  JSON_OBJECT('entrance_fee',0,'guided_tours',true),
  'published', '2024-05-20 09:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status, published_at)
VALUES (
  8, 6, 'Tvrdjava San Giovanni', 'monument',
  'Monumentalna tvrdjava iznad Kotora na 280m visine. Panorama Bokokotorskog zaliva je nezaboravna.',
  42.4267, 18.7719, 'Kotor',
  JSON_ARRAY('/images/posts/sangiovanni1.jpg'),
  JSON_OBJECT('entrance_fee',8,'currency','EUR','altitude_m',280),
  'published', '2024-06-10 10:00:00'
);

-- ── SPORTSKI OBJEKTI ─────────────────────────────────────────

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status,
                  view_count, like_count, review_count, avg_rating, published_at)
VALUES (
  6, 2, 'Ski centar Savin Kuk', 'sports_facility',
  'Skijalište na 2313m. 4 žičare, 12 staza ukupne dužine 18km. Škola skijanja i rent servisi.',
  43.1789, 19.0456, 'Savin Kuk, NP Durmitor',
  JSON_ARRAY('/images/posts/savinkuk1.jpg','/images/posts/savinkuk2.jpg'),
  JSON_OBJECT('mon','09:00-16:00','tue','09:00-16:00','wed','09:00-16:00','thu','09:00-16:00','fri','09:00-16:00','sat','09:00-16:30','sun','09:00-16:30'),
  JSON_OBJECT('lifts',4,'slopes',12,'total_km',18,'ski_school',true,'day_pass',25,'currency','EUR'),
  'published', 289, 67, 3, 4.67,
  '2024-11-01 08:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status, published_at)
VALUES (
  6, 4, 'Rafting centar Tara', 'sports_facility',
  'Profesionalni rafting na rijeci Tari. Opcije za početnike i iskusne raftere.',
  43.2050, 19.2450, 'Šćepan Polje, Tara',
  JSON_ARRAY('/images/posts/rafting1.jpg','/images/posts/rafting2.jpg'),
  JSON_OBJECT('mon','08:00-18:00','tue','08:00-18:00','wed','08:00-18:00','thu','08:00-18:00','fri','08:00-18:00','sat','07:00-19:00','sun','07:00-19:00'),
  JSON_OBJECT('price_from',35,'currency','EUR','duration_h',4,'min_age',12),
  'published', '2024-04-01 09:00:00'
);

-- ── KLUBOVI ──────────────────────────────────────────────────

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status,
                  view_count, like_count, published_at)
VALUES (
  7, 5, 'Club Aquarius Budva', 'club',
  'Najpopularniji beach club na Crnogorskom primorju. DJ evenings, bazen, VIP zone.',
  42.2820, 18.8390, 'Slovenska plaža, Budva',
  JSON_ARRAY('/images/posts/aquarius1.jpg','/images/posts/aquarius2.jpg'),
  JSON_OBJECT('fri','22:00-06:00','sat','22:00-06:00','sun','22:00-05:00'),
  JSON_OBJECT('capacity',1500,'entry_fee',10,'currency','EUR'),
  'published', 334, 78,
  '2024-05-01 12:00:00'
);

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status, published_at)
VALUES (
  7, 5, 'Top Hill Club Budva', 'club',
  'Open air klub na brdu iznad Budve. Poznat kao jedan od najljepših klubova u regionu.',
  42.2950, 18.8500, 'Topliš bb, Budva',
  JSON_ARRAY('/images/posts/tophill1.jpg'),
  JSON_OBJECT('capacity',5000,'entry_fee',15,'currency','EUR'),
  'published', '2024-05-15 12:00:00'
);

-- ── PRODAVNICE ───────────────────────────────────────────────

INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status, published_at)
VALUES (
  2, 1, 'Suvenirnica Durmitor', 'shop',
  'Originalni suveniri iz Crne Gore: domaći med, rakija, nakit, planinske trave.',
  43.1552, 19.1220, 'Trg bb, Žabljak',
  JSON_ARRAY('/images/posts/suveniri1.jpg'),
  JSON_OBJECT('mon','09:00-20:00','tue','09:00-20:00','wed','09:00-20:00','thu','09:00-20:00','fri','09:00-21:00','sat','09:00-21:00','sun','10:00-19:00'),
  JSON_OBJECT('price_range','€'),
  'published', '2024-04-01 10:00:00'
);

-- ── DOGADJAJI ────────────────────────────────────────────────

-- Predstojeći (budući datum)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, details, status,
                  view_count, like_count, save_count, published_at)
VALUES (
  4, 1, 'Durmitor Summer Fest 2025', 'event',
  'Trodnevni muzički festival pod vedrim nebom na Žabljaku. Domaći i regionalni izvođači.',
  43.1560, 19.1230, 'Stadion Žabljak',
  'https://durmitorsummerfest.me/karte', 'Kupi kartu',
  JSON_ARRAY('/images/posts/fest1.jpg','/images/posts/fest2.jpg'),
  JSON_OBJECT(
    'category','FESTIVAL',
    'startAt','2025-07-18T18:00:00',
    'endAt','2025-07-20T23:59:00',
    'ticketUrl','https://durmitorsummerfest.me/karte',
    'price',15,'currency','EUR','capacity',2000
  ),
  'published', 423, 87, 45,
  '2024-04-01 09:00:00'
);

-- Predstojeći koncert
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, details, status, published_at)
VALUES (
  7, 5, 'Jazz na tvrdjavi — Budva', 'event',
  'Jedina noć jazza na zidinama Budvanske tvrdjave. Internacionalni jazz muzičari.',
  42.2791, 18.8385, 'Tvrdjava Citadela, Budva',
  'https://budvajazz.me', 'Rezerviši mjesta',
  JSON_ARRAY('/images/posts/jazz1.jpg'),
  JSON_OBJECT(
    'category','CONCERT',
    'startAt','2025-08-15T21:00:00',
    'endAt','2025-08-15T23:30:00',
    'ticketUrl','https://budvajazz.me',
    'price',20,'currency','EUR','capacity',300
  ),
  'published', '2024-06-01 10:00:00'
);

-- Predstojeće sportsko takmičenje
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status, published_at)
VALUES (
  6, 2, 'Durmitor Ultra Trail 2025', 'event',
  'Planinski ultra maraton po stazama Durmitora. Kategorije 25km, 50km i 100km.',
  43.1556, 19.1225, 'Žabljak',
  JSON_ARRAY('/images/posts/trail1.jpg'),
  JSON_OBJECT(
    'category','SPORT',
    'startAt','2025-09-06T06:00:00',
    'endAt','2025-09-07T20:00:00',
    'price',30,'currency','EUR'
  ),
  'published', '2024-05-01 10:00:00'
);

-- Završen dogadjaj (arhiviran)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status)
VALUES (
  8, 6, 'Kotorski karneval 2024', 'event',
  'Najstariji karneval na Jadranskom moru. Maskenbal, povorka, zabava.',
  42.4247, 18.7712, 'Stari grad, Kotor',
  JSON_ARRAY('/images/posts/karneval1.jpg'),
  JSON_OBJECT(
    'category','FESTIVAL',
    'startAt','2024-02-12T10:00:00',
    'endAt','2024-02-13T23:00:00'
  ),
  'archived'
);

-- Event u nacrtu (čeka odobrenje)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status)
VALUES (
  4, 5, 'Beach party Budva — septembar', 'event',
  'Zatvaranje sezone na Slovenskoj plaži. DJ nastup, hrana, piće.',
  42.2820, 18.8380, 'Slovenska plaža, Budva',
  JSON_ARRAY('/images/posts/beachparty1.jpg'),
  JSON_OBJECT(
    'category','OTHER',
    'startAt','2025-09-20T20:00:00',
    'endAt','2025-09-21T04:00:00',
    'price',5,'currency','EUR'
  ),
  'draft'
);

-- Još jedan predstojeći event
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, details, status, published_at)
VALUES (
  8, 6, 'Kotor Art Festival 2025', 'event',
  'Medjunarodni festival savremene umjetnosti. Izložbe, performansi, radionice.',
  42.4236, 18.7711, 'Stari grad, Kotor',
  JSON_ARRAY('/images/posts/kotorart1.jpg'),
  JSON_OBJECT(
    'category','EXHIBITION',
    'startAt','2025-07-05T10:00:00',
    'endAt','2025-07-12T22:00:00',
    'price',0,'currency','EUR'
  ),
  'published', '2024-05-20 10:00:00'
);


-- ── TAGOVI NA OBJAVAMA ───────────────────────────────────────

INSERT INTO post_tag (post_id, tag_id) VALUES
-- Hotel Jezera (1)
(1,  (SELECT id FROM tag WHERE name='Parking')),
(1,  (SELECT id FROM tag WHERE name='WiFi')),
(1,  (SELECT id FROM tag WHERE name='Wellness')),
(1,  (SELECT id FROM tag WHERE name='Porodično')),
-- Apartmani Durmitor View (2)
(2,  (SELECT id FROM tag WHERE name='Parking')),
(2,  (SELECT id FROM tag WHERE name='WiFi')),
(2,  (SELECT id FROM tag WHERE name='Porodično')),
-- Hotel Avala (3)
(3,  (SELECT id FROM tag WHERE name='Wellness')),
(3,  (SELECT id FROM tag WHERE name='Romantično')),
-- Restoran Soa (5)
(5,  (SELECT id FROM tag WHERE name='Gastronomija')),
(5,  (SELECT id FROM tag WHERE name='Kulturno')),
-- Portun (6)
(6,  (SELECT id FROM tag WHERE name='Gastronomija')),
(6,  (SELECT id FROM tag WHERE name='Romantično')),
-- Muzej Žabljaka (8)
(8,  (SELECT id FROM tag WHERE name='Kulturno')),
(8,  (SELECT id FROM tag WHERE name='Historijsko')),
(8,  (SELECT id FROM tag WHERE name='Razgledanje')),
-- Stari grad Kotor (9)
(9,  (SELECT id FROM tag WHERE name='UNESCO')),
(9,  (SELECT id FROM tag WHERE name='Historijsko')),
(9,  (SELECT id FROM tag WHERE name='Razgledanje')),
(9,  (SELECT id FROM tag WHERE name='Fotografija')),
-- Crno jezero (11)
(11, (SELECT id FROM tag WHERE name='Priroda')),
(11, (SELECT id FROM tag WHERE name='Outdoor')),
(11, (SELECT id FROM tag WHERE name='Besplatno')),
(11, (SELECT id FROM tag WHERE name='Fotografija')),
-- Ski centar (14)
(14, (SELECT id FROM tag WHERE name='Skijanje')),
(14, (SELECT id FROM tag WHERE name='Sport')),
(14, (SELECT id FROM tag WHERE name='Adrenalin')),
-- Rafting (15)
(15, (SELECT id FROM tag WHERE name='Rafting')),
(15, (SELECT id FROM tag WHERE name='Adrenalin')),
(15, (SELECT id FROM tag WHERE name='Outdoor')),
-- Club Aquarius (16)
(16, (SELECT id FROM tag WHERE name='Noćni život')),
(16, (SELECT id FROM tag WHERE name='Muzika')),
-- Durmitor Fest (18)
(18, (SELECT id FROM tag WHERE name='Muzika')),
(18, (SELECT id FROM tag WHERE name='Noćni život')),
-- Jazz (19)
(19, (SELECT id FROM tag WHERE name='Muzika')),
(19, (SELECT id FROM tag WHERE name='Kulturno')),
(19, (SELECT id FROM tag WHERE name='Romantično'));


-- ============================================================
--  RUTE
-- ============================================================

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status, view_count, save_count)
VALUES (
  3, 2, 'Staza oko Crnog jezera', 'easy', 3.6, 60, 30,
  'Kružna staza oko Crnog jezera. Idealna za početnike i porodice.',
  JSON_ARRAY(
    JSON_OBJECT('lat',43.1378,'lng',19.0644,'name','Ulaz — parking'),
    JSON_OBJECT('lat',43.1395,'lng',19.0580,'name','Malo jezero'),
    JSON_OBJECT('lat',43.1420,'lng',19.0610,'name','Vidikovac'),
    JSON_OBJECT('lat',43.1400,'lng',19.0700,'name','Veliko jezero'),
    JSON_OBJECT('lat',43.1378,'lng',19.0644,'name','Povratak')
  ),
  'published', 234, 45
);

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status, view_count, save_count)
VALUES (
  6, 2, 'Vrh Bobotov Kuk', 'hard', 14.0, 360, 900,
  'Najzahtjevnija tura na najviši vrh Durmitora (2523m). Za iskusne planinarе.',
  JSON_ARRAY(
    JSON_OBJECT('lat',43.1378,'lng',19.0644,'name','Polazište'),
    JSON_OBJECT('lat',43.1450,'lng',19.0500,'name','Ledena pećina'),
    JSON_OBJECT('lat',43.1500,'lng',19.0400,'name','Planinski dom'),
    JSON_OBJECT('lat',43.1550,'lng',19.0300,'name','Vrh 2523m')
  ),
  'published', 156, 38
);

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status, view_count, save_count)
VALUES (
  3, 4, 'Kanjon Tare — pješačka staza', 'moderate', 8.5, 180, 420,
  'Staza duž kanjona rijeke Tare. Kroz šumu crnog bora, uz rijeku do vidikovca.',
  JSON_ARRAY(
    JSON_OBJECT('lat',43.2000,'lng',19.2500,'name','Polazište'),
    JSON_OBJECT('lat',43.2100,'lng',19.2400,'name','Šuma bora'),
    JSON_OBJECT('lat',43.2200,'lng',19.2300,'name','Korito Tare'),
    JSON_OBJECT('lat',43.2300,'lng',19.2200,'name','Vidikovac')
  ),
  'published', 112, 27
);

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status, view_count, save_count)
VALUES (
  8, 6, 'Zidine Kotora', 'moderate', 4.5, 120, 300,
  'Uspinjanje na zidine starog grada Kotora. Nevjerovatan pogled na zaliv.',
  JSON_ARRAY(
    JSON_OBJECT('lat',42.4236,'lng',18.7711,'name','Ulaz u stari grad'),
    JSON_OBJECT('lat',42.4250,'lng',18.7720,'name','Crkva Sv. Ivana'),
    JSON_OBJECT('lat',42.4267,'lng',18.7719,'name','Vrh — tvrdjava')
  ),
  'published', 89, 21
);

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status)
VALUES (
  7, 5, 'Budva — Sveti Stefan biciklistička tura', 'easy', 12.0, 90, 80,
  'Biciklistička staza duž obale od Budve do Svetog Stefana. Spektakularni pogledi.',
  JSON_ARRAY(
    JSON_OBJECT('lat',42.2864,'lng',18.8400,'name','Budva — centar'),
    JSON_OBJECT('lat',42.2700,'lng',18.8600,'name','Bečići'),
    JSON_OBJECT('lat',42.2600,'lng',18.8750,'name','Rafailovići'),
    JSON_OBJECT('lat',42.2561,'lng',18.8925,'name','Sveti Stefan')
  ),
  'published'
);

-- Draft ruta
INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min,
                   description, waypoints, status)
VALUES (
  4, 11, 'Skadarsko jezero — čamcem', 'easy', 15.0, 240,
  'Obilazak Skadarskog jezera čamcem. U izradi — biće dostupno u proljeće.',
  JSON_ARRAY(
    JSON_OBJECT('lat',42.1667,'lng',19.2833,'name','Virpazar')
  ),
  'draft'
);


-- ============================================================
--  INTERAKCIJE — post_like, post_save
-- ============================================================

INSERT INTO post_like (tourist_id, post_id) VALUES
(1,11),(1,1),(1,9),(1,14),(1,18),
(2,18),(2,16),(2,5),(2,19),(2,6),
(3,1),(3,11),(3,14),(3,18),
(4,11),(4,9),(4,5),(4,8),
(5,14),(5,1),(5,11),(5,15),
(6,3),(6,16),(6,19),(6,6),
(7,11),(7,9),(7,15),(7,18),
(8,9),(8,10),(8,8),(8,12),
(9,9),(9,10),(9,12),(9,8),
(10,11),(10,1),(10,14);

INSERT INTO post_save (tourist_id, post_id) VALUES
(1,1),(1,11),(1,18),
(2,18),(2,16),
(3,1),(3,14),
(4,11),(4,9),
(5,14),(5,1),
(6,3),(6,19),
(7,11),(7,18),
(8,9),
(9,9),(9,10),
(10,11),(10,1);


-- ============================================================
--  POST_VIEW — raspoređeni po danima (zadnjih 30 dana)
--  Ovo napuni grafikon "Posete platformi" sa realnim podacima
-- ============================================================

-- Dan -30 do -25 (početak perioda, manje poseta)
INSERT INTO post_view (tourist_id, post_id, viewed_at, duration_sec) VALUES
(1, 11, DATE_SUB(NOW(), INTERVAL 30 DAY), 145),
(2, 18, DATE_SUB(NOW(), INTERVAL 30 DAY), 210),
(3,  1, DATE_SUB(NOW(), INTERVAL 29 DAY), 87),
(4, 11, DATE_SUB(NOW(), INTERVAL 29 DAY), 93),
(5, 14, DATE_SUB(NOW(), INTERVAL 28 DAY), 320),
(1,  9, DATE_SUB(NOW(), INTERVAL 28 DAY), 180),
(6,  3, DATE_SUB(NOW(), INTERVAL 27 DAY), 240),
(7, 11, DATE_SUB(NOW(), INTERVAL 27 DAY), 110),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 27 DAY), 35),
(2,  5, DATE_SUB(NOW(), INTERVAL 26 DAY), 95),
(8,  9, DATE_SUB(NOW(), INTERVAL 26 DAY), 175),
(9,  9, DATE_SUB(NOW(), INTERVAL 26 DAY), 200),
(NULL, 18, DATE_SUB(NOW(), INTERVAL 25 DAY), 55),
(10, 11, DATE_SUB(NOW(), INTERVAL 25 DAY), 130),
(3,  14, DATE_SUB(NOW(), INTERVAL 25 DAY), 290),
-- Dan -24 do -18 (rast)
(1,  18, DATE_SUB(NOW(), INTERVAL 24 DAY), 210),
(2,  16, DATE_SUB(NOW(), INTERVAL 24 DAY), 145),
(4,   9, DATE_SUB(NOW(), INTERVAL 24 DAY), 155),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 23 DAY), 40),
(5,   1, DATE_SUB(NOW(), INTERVAL 23 DAY), 112),
(6,  19, DATE_SUB(NOW(), INTERVAL 23 DAY), 185),
(7,  15, DATE_SUB(NOW(), INTERVAL 22 DAY), 280),
(8,  10, DATE_SUB(NOW(), INTERVAL 22 DAY), 165),
(NULL, 9, DATE_SUB(NOW(), INTERVAL 22 DAY), 75),
(1,   9, DATE_SUB(NOW(), INTERVAL 21 DAY), 190),
(2,   6, DATE_SUB(NOW(), INTERVAL 21 DAY), 220),
(3,   9, DATE_SUB(NOW(), INTERVAL 21 DAY), 135),
(9,  12, DATE_SUB(NOW(), INTERVAL 20 DAY), 250),
(10,  1, DATE_SUB(NOW(), INTERVAL 20 DAY), 140),
(NULL, 18, DATE_SUB(NOW(), INTERVAL 20 DAY), 60),
(4,  14, DATE_SUB(NOW(), INTERVAL 19 DAY), 310),
(5,  11, DATE_SUB(NOW(), INTERVAL 19 DAY), 155),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 18 DAY), 45),
(6,  16, DATE_SUB(NOW(), INTERVAL 18 DAY), 175),
(7,  18, DATE_SUB(NOW(), INTERVAL 18 DAY), 225),
-- Dan -17 do -10 (pik)
(1,  11, DATE_SUB(NOW(), INTERVAL 17 DAY), 198),
(2,  18, DATE_SUB(NOW(), INTERVAL 17 DAY), 245),
(3,   1, DATE_SUB(NOW(), INTERVAL 17 DAY), 110),
(8,   9, DATE_SUB(NOW(), INTERVAL 16 DAY), 185),
(9,  10, DATE_SUB(NOW(), INTERVAL 16 DAY), 210),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 16 DAY), 50),
(NULL, 18, DATE_SUB(NOW(), INTERVAL 16 DAY), 65),
(4,  11, DATE_SUB(NOW(), INTERVAL 15 DAY), 130),
(5,  14, DATE_SUB(NOW(), INTERVAL 15 DAY), 340),
(6,   3, DATE_SUB(NOW(), INTERVAL 15 DAY), 285),
(10, 11, DATE_SUB(NOW(), INTERVAL 15 DAY), 160),
(1,  14, DATE_SUB(NOW(), INTERVAL 14 DAY), 270),
(2,   9, DATE_SUB(NOW(), INTERVAL 14 DAY), 150),
(7,  11, DATE_SUB(NOW(), INTERVAL 14 DAY), 125),
(NULL, 1, DATE_SUB(NOW(), INTERVAL 14 DAY), 40),
(3,  18, DATE_SUB(NOW(), INTERVAL 13 DAY), 220),
(4,   9, DATE_SUB(NOW(), INTERVAL 13 DAY), 175),
(8,  12, DATE_SUB(NOW(), INTERVAL 13 DAY), 235),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 13 DAY), 55),
(NULL, 9, DATE_SUB(NOW(), INTERVAL 12 DAY), 80),
(5,   9, DATE_SUB(NOW(), INTERVAL 12 DAY), 165),
(6,  19, DATE_SUB(NOW(), INTERVAL 12 DAY), 200),
(9,   9, DATE_SUB(NOW(), INTERVAL 12 DAY), 215),
(10, 14, DATE_SUB(NOW(), INTERVAL 11 DAY), 295),
(1,   1, DATE_SUB(NOW(), INTERVAL 11 DAY), 120),
(2,  15, DATE_SUB(NOW(), INTERVAL 11 DAY), 255),
(NULL, 18, DATE_SUB(NOW(), INTERVAL 11 DAY), 70),
(3,  11, DATE_SUB(NOW(), INTERVAL 10 DAY), 185),
(7,   9, DATE_SUB(NOW(), INTERVAL 10 DAY), 145),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 10 DAY), 55),
-- Dan -9 do -4 (stabilno visoko)
(4,  11, DATE_SUB(NOW(), INTERVAL 9 DAY), 175),
(5,   1, DATE_SUB(NOW(), INTERVAL 9 DAY), 135),
(6,  16, DATE_SUB(NOW(), INTERVAL 9 DAY), 195),
(8,   9, DATE_SUB(NOW(), INTERVAL 8 DAY), 225),
(9,  10, DATE_SUB(NOW(), INTERVAL 8 DAY), 190),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 8 DAY), 45),
(NULL, 9, DATE_SUB(NOW(), INTERVAL 8 DAY), 65),
(10, 18, DATE_SUB(NOW(), INTERVAL 7 DAY), 250),
(1,  11, DATE_SUB(NOW(), INTERVAL 7 DAY), 165),
(2,   6, DATE_SUB(NOW(), INTERVAL 7 DAY), 215),
(3,  14, DATE_SUB(NOW(), INTERVAL 6 DAY), 310),
(4,   9, DATE_SUB(NOW(), INTERVAL 6 DAY), 155),
(NULL, 18, DATE_SUB(NOW(), INTERVAL 6 DAY), 60),
(5,  11, DATE_SUB(NOW(), INTERVAL 5 DAY), 145),
(6,   3, DATE_SUB(NOW(), INTERVAL 5 DAY), 265),
(7,  18, DATE_SUB(NOW(), INTERVAL 5 DAY), 235),
(NULL, 11, DATE_SUB(NOW(), INTERVAL 5 DAY), 50),
-- Dan -4 do -1 (pad ka kraju perioda)
(8,  11, DATE_SUB(NOW(), INTERVAL 4 DAY), 175),
(9,   9, DATE_SUB(NOW(), INTERVAL 4 DAY), 195),
(10,  1, DATE_SUB(NOW(), INTERVAL 3 DAY), 130),
(1,  18, DATE_SUB(NOW(), INTERVAL 3 DAY), 225),
(NULL, 9, DATE_SUB(NOW(), INTERVAL 3 DAY), 70),
(2,  11, DATE_SUB(NOW(), INTERVAL 2 DAY), 160),
(3,   9, DATE_SUB(NOW(), INTERVAL 2 DAY), 140),
(NULL, 18, DATE_SUB(NOW(), INTERVAL 1 DAY), 55),
(4,  14, DATE_SUB(NOW(), INTERVAL 1 DAY), 285),
(5,  11, DATE_SUB(NOW(), INTERVAL 1 DAY), 150);


-- ============================================================
--  RECENZIJE (PENDING / APPROVED / REJECTED)
-- ============================================================

INSERT INTO review (tourist_id, post_id, route_id, rating, comment, status, is_approved, created_at) VALUES
-- APPROVED recenzije
(1,  11, NULL, 5, 'Nevjerovatno lijepo! Crno jezero je jedno od najljepših mjesta na svetu.', 'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 25 DAY)),
(2,  11, NULL, 4, 'Preljepo, ali malo previše turista u augustu. Preporučujem jutarnje sate.',  'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(3,   1, NULL, 5, 'Odličan hotel, predivna lokacija i ljubazno osoblje. Spa je vrhunski.',       'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(4,   8, NULL, 4, 'Zanimljiv muzej sa dobrom zbirkom. Vodič je bio informativan.',              'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(5,  14, NULL, 5, 'Savin Kuk je fantastičan ski centar! Staze dobro uredjene, žičare moderne.','APPROVED', 1, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(6,   9, NULL, 5, 'Stari grad Kotor je apsolutno nevjerovatan. Zidine su spektakularne!',       'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(7,   9, NULL, 5, 'Najljepše mjesto u Crnoj Gori. Obavezno posjetiti!',                        'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(8,   9, NULL, 4, 'Fantastično ali puno turista ljeti. Dodjite van sezone.',                   'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(9,  10, NULL, 5, 'Cetinjski manastir — duhovno iskustvo. Savjetujem svima.',                  'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(10,  1, NULL, 4, 'Hotel Jezera je odličan. Lokacija savršena, osoblje ljubazno.',             'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(1,   5, NULL, 5, 'Restoran Soa — autentična crnogorska hrana. Jagnjetina je bila savršena!', 'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 6 DAY)),
(2,  18, NULL, 5, 'Durmitor Fest je bio odličan! Atmosfera neopisiva, muzičari vrhunski!',     'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(3,   6, NULL, 4, 'Konoba Portun — svježa riba, ljubazno osoblje. Malo skuplje, ali vrijedi.','APPROVED', 1, DATE_SUB(NOW(), INTERVAL 4 DAY)),
-- Recenzija za rutu (APPROVED)
(1,  NULL, 1, 5, 'Prekrasna staza! Crno jezero je zadivljujuće sa svakog ugla.',             'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 16 DAY)),
(5,  NULL, 2, 4, 'Teška tura ali vrijedna svake kapi znoja. Pogled sa vrha je nestvaran.',   'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 11 DAY)),
(7,  NULL, 4, 5, 'Zidine Kotora — moraju se popeti! Pogled na zaliv je predivan.',            'APPROVED', 1, DATE_SUB(NOW(), INTERVAL 9 DAY)),
-- PENDING recenzije (čekaju moderaciju)
(4,  NULL, 2, 3, 'Staza je lijepa ali signalizacija loša. Skoro sam se izgubio.',            'PENDING',  0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6,   3, NULL, 2, 'Previše buke od susjednog apartmana, nisam mogla spavati.',                'PENDING',  0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8,  14, NULL, 3, 'Ski centar ok, ali gužve vikendom su strašne. Čekanje na žičaru 45 min.', 'PENDING',  0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(9,   1, NULL, 4, 'Hotel je odličan ali cijena doručka je previsoka za ono što dobijate.',    'PENDING',  0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(10,  5, NULL, 2, 'Restoran Soa — očekivao sam više za tu cijenu. Usluga spora.',            'PENDING',  0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
-- REJECTED recenzije
(2,  16, NULL, 1, 'Spam komentar bez sadržaja xxxx',                                          'REJECTED', 0, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(3,   3, NULL, 1, 'Neprimjeren sadržaj — obrisano.',                                          'REJECTED', 0, DATE_SUB(NOW(), INTERVAL 15 DAY));


-- ============================================================
--  OMILJENE RUTE
-- ============================================================

INSERT INTO tourist_favorite (tourist_id, route_id) VALUES
(1, 1),(3, 1),(4, 1),(7, 1),(10, 1),
(5, 2),(1, 3),(8, 4),(6, 5),(2, 3);


-- ============================================================
--  KARTE ZA DOGADJAJE
-- ============================================================

INSERT INTO ticket (post_id, tourist_id, ticket_code, qr_code, price_paid, status) VALUES
(18, 1, 'DSF2025-A001', '/qr/DSF2025-A001.png', 15.00, 'issued'),
(18, 2, 'DSF2025-A002', '/qr/DSF2025-A002.png', 15.00, 'issued'),
(18, 4, 'DSF2025-A003', '/qr/DSF2025-A003.png', 15.00, 'issued'),
(18, 7, 'DSF2025-A004', '/qr/DSF2025-A004.png', 15.00, 'issued'),
(18, 9, 'DSF2025-A005', '/qr/DSF2025-A005.png', 15.00, 'issued'),
(19, 6, 'JAZZ2025-B001', '/qr/JAZZ2025-B001.png', 20.00, 'issued'),
(19, 8, 'JAZZ2025-B002', '/qr/JAZZ2025-B002.png', 20.00, 'issued'),
(19, 3, 'JAZZ2025-B003', '/qr/JAZZ2025-B003.png', 20.00, 'used');


-- ============================================================
--  ADMIN NOTIFIKACIJE (za sve admine)
-- ============================================================

INSERT INTO admin_notification (admin_user_id, type, title, body, payload, is_read, created_at) VALUES
-- SuperAdmin (id=1) — sve vrste
(1, 'new_registration', 'Novi zahtjev za registraciju',
 'Milica Stanković čeka odobrenje naloga.',
 JSON_OBJECT('registration_id',1,'url','/admin/zahtevi'), 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'new_registration', 'Novi zahtjev za registraciju',
 'Boris Nikolić (Adventure Montenegro) čeka odobrenje.',
 JSON_OBJECT('registration_id',2,'url','/admin/zahtevi'), 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 'pending_review', 'Recenzija čeka moderaciju',
 'Nova recenzija za Crno jezero — ocjena 2/5.',
 JSON_OBJECT('post_id',11,'url','/admin/reviews'), 0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 'pending_review', 'Negativna recenzija',
 'Ocjena 1/5 za Club Aquarius čeka pregled.',
 JSON_OBJECT('post_id',16,'url','/admin/reviews'), 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 'system', 'Platforma dostigla 100 korisnika',
 'Broj aktivnih turista prešao je 100. Odličan napredak!',
 JSON_OBJECT('url','/admin/dashboard'), 1, DATE_SUB(NOW(), INTERVAL 7 DAY)),
-- Ana (id=2)
(2, 'post_approved', 'Muzej Žabljaka odobren',
 'Vaša objava "Muzej Žabljaka" je odobrena i objavljena.',
 JSON_OBJECT('post_id',8,'url','/admin/lokacije'), 0, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(2, 'pending_review', 'Nova recenzija na vašoj objavi',
 'Turista je ostavio recenziju za Muzej Žabljaka — ocjena 4/5.',
 JSON_OBJECT('post_id',8,'url','/admin/reviews'), 0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
-- Nikola (id=3)
(3, 'system', 'Dobrodošli na platformu',
 'Vaš nalog je aktivan. Počnite sa kreiranjem sadržaja.',
 JSON_OBJECT('url','/admin/dashboard'), 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(3, 'pending_review', 'Nova recenzija za Crno jezero',
 'Ocjena 5/5 — odlična recenzija!',
 JSON_OBJECT('post_id',11,'url','/admin/reviews'), 0, DATE_SUB(NOW(), INTERVAL 4 DAY)),
-- Ivana (id=7)
(7, 'post_approved', 'Hotel Avala odobren',
 'Vaša objava "Hotel Avala Budva" je odobrena.',
 JSON_OBJECT('post_id',3,'url','/admin/lokacije'), 0, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(7, 'pending_review', 'Nova recenzija na Club Aquarius',
 'Recenzija na čekanju — ocjena 1/5. Potrebna moderacija.',
 JSON_OBJECT('post_id',16,'url','/admin/reviews'), 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
-- Aleksandar (id=8)
(8, 'post_approved', 'Stari grad Kotor odobren',
 'Vaša objava je odobrena i vidljiva turistima.',
 JSON_OBJECT('post_id',9,'url','/admin/lokacije'), 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(8, 'pending_review', '3 nove recenzije čekaju moderaciju',
 'Recenzije za Stari grad Kotor su na čekanju.',
 JSON_OBJECT('url','/admin/reviews'), 0, DATE_SUB(NOW(), INTERVAL 2 DAY));


-- ============================================================
--  AUDIT LOG
-- ============================================================

INSERT INTO admin_audit_log (admin_user_id, performed_by, action, entity_type, entity_id, new_value, performed_at) VALUES
(1, 1, 'approve', 'admin_registration_request', 2,
 JSON_OBJECT('email','ana.kovacevic@zabljak.travel','status','approved'), DATE_SUB(NOW(), INTERVAL 60 DAY)),
(1, 1, 'approve', 'admin_registration_request', 3,
 JSON_OBJECT('email','nikola.djuric@npdurmitor.me','status','approved'), DATE_SUB(NOW(), INTERVAL 55 DAY)),
(1, 1, 'suspend', 'admin_user', 9,
 JSON_OBJECT('email','dragan.lazovic@outdoorme.me','status','suspended'), DATE_SUB(NOW(), INTERVAL 10 DAY)),
(2, 2, 'create', 'post', 8,
 JSON_OBJECT('title','Muzej Žabljaka','post_type','cultural_site','status','published'), DATE_SUB(NOW(), INTERVAL 40 DAY)),
(3, 3, 'create', 'route', 1,
 JSON_OBJECT('name','Staza oko Crnog jezera','difficulty','easy'), DATE_SUB(NOW(), INTERVAL 35 DAY)),
(4, 4, 'create', 'post', 18,
 JSON_OBJECT('title','Durmitor Summer Fest 2025','post_type','event'), DATE_SUB(NOW(), INTERVAL 20 DAY)),
(7, 7, 'create', 'post', 3,
 JSON_OBJECT('title','Hotel Avala Budva','post_type','accommodation'), DATE_SUB(NOW(), INTERVAL 15 DAY)),
(8, 8, 'create', 'post', 9,
 JSON_OBJECT('title','Stari grad Kotor','post_type','cultural_site'), DATE_SUB(NOW(), INTERVAL 12 DAY));


-- ============================================================
--  MAILING LISTA
-- ============================================================

INSERT INTO mailing_list (tourist_id, email, preferences, is_subscribed) VALUES
(1,  'emma.wilson@gmail.com',   JSON_OBJECT('events',true,'offers',true,'news',true),  1),
(2,  'luca.rossi@gmail.com',    JSON_OBJECT('events',true,'offers',true,'news',false), 1),
(3,  'jana.novak@gmail.com',    JSON_OBJECT('events',true,'offers',false,'news',true), 1),
(4,  'aleksandra.p@gmail.com',  JSON_OBJECT('events',false,'offers',true,'news',true), 1),
(5,  'thomas.m@gmail.com',      JSON_OBJECT('events',true,'offers',true,'news',true),  1),
(6,  'sofia.garcia@gmail.com',  JSON_OBJECT('events',true,'offers',true,'news',false), 1),
(7,  'andrei.p@gmail.com',      JSON_OBJECT('events',false,'offers',false,'news',true),1),
(8,  'yuki.t@gmail.com',        JSON_OBJECT('events',true,'offers',false,'news',true), 1),
(9,  'mohammed.r@gmail.com',    JSON_OBJECT('events',true,'offers',true,'news',false), 1),
(10, 'klara.s@gmail.com',       JSON_OBJECT('events',true,'offers',true,'news',true),  1);


-- ============================================================
--  PLANER POSETE
-- ============================================================

INSERT INTO visit_planner (tourist_id, title, start_date, end_date, notes) VALUES
(1, 'Ljetnji odmor — Durmitor', '2025-07-15', '2025-07-21', 'Planinarenje, jezera i festival.'),
(3, 'Zimski odmor — Žabljak',   '2025-01-20', '2025-01-27', 'Skijanje na Savin Kuku.'),
(6, 'Budva weekend',            '2025-08-08', '2025-08-10', 'Plaža, konobe, noćni život.');

INSERT INTO planner_item (planner_id, post_id, route_id, day_number, order_in_day, notes, scheduled_time) VALUES
(1, 1,    NULL, 1, 1, 'Check-in Hotel Jezera',           '15:00:00'),
(1, NULL, 1,    1, 2, 'Šetnja oko Crnog jezera',          '17:00:00'),
(1, 5,    NULL, 1, 3, 'Večera u Restauranu Soa',           '20:00:00'),
(1, NULL, 2,    2, 1, 'Tura na Bobotov Kuk',              '07:00:00'),
(1, 18,   NULL, 4, 1, 'Durmitor Summer Fest',              '19:00:00'),
(2, 1,    NULL, 1, 1, 'Check-in Hotel Jezera',           '14:00:00'),
(2, 14,   NULL, 2, 1, 'Ski dan na Savin Kuku',            '09:00:00'),
(3, 3,    NULL, 1, 1, 'Check-in Hotel Avala',            '16:00:00'),
(3, 6,    NULL, 1, 2, 'Večera u Portunu',                 '20:00:00'),
(3, 16,   NULL, 2, 1, 'Aquarius beach club',              '22:00:00');


-- ============================================================
--  VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_posts_full AS
SELECT
  p.id AS postId, p.admin_id AS adminId, p.region_id AS regionId,
  p.title, p.post_type AS postType, p.description,
  p.lat, p.lng, p.address, p.external_url AS externalUrl,
  p.external_url_label AS externalUrlLabel, p.images, p.opening_hours AS openingHours,
  p.details, p.status, p.view_count AS viewCount, p.like_count AS likeCount,
  p.save_count AS saveCount, p.review_count AS reviewCount, p.avg_rating AS avgRating,
  p.published_at AS publishedAt, p.created_at AS createdAt, p.updated_at AS updatedAt,
  a.full_name AS adminName, a.role AS adminRole,
  r.name AS regionName, r.type AS regionType, r.lat AS regionLat, r.lng AS regionLng
FROM post p
JOIN  admin_user a ON p.admin_id  = a.id
LEFT JOIN region r ON p.region_id = r.id;

CREATE OR REPLACE VIEW v_routes_full AS
SELECT
  rt.id AS routeId, rt.admin_id AS adminId, rt.region_id AS regionId,
  rt.name, rt.difficulty, rt.distance_km AS distanceKm, rt.duration_min AS durationMin,
  rt.elevation_gain AS elevationGainM, rt.description, rt.waypoints,
  rt.images, rt.status, rt.view_count AS viewCount, rt.save_count AS saveCount,
  rt.created_at AS createdAt, rt.updated_at AS updatedAt,
  a.full_name AS adminName, r.name AS regionName
FROM route rt
JOIN admin_user a ON rt.admin_id  = a.id
LEFT JOIN region r ON rt.region_id = r.id;

CREATE OR REPLACE VIEW v_reviews_full AS
SELECT
  rv.id AS reviewId, rv.tourist_id AS touristId,
  rv.post_id AS postId, rv.route_id AS routeId,
  rv.rating, rv.comment, rv.status, rv.is_approved, rv.created_at AS createdAt,
  t.name AS touristName, p.title AS postTitle, p.post_type AS postType,
  ro.name AS routeName,
  CASE
    WHEN rv.post_id IS NOT NULL AND p.post_type = 'event' THEN 'EVENT'
    WHEN rv.route_id IS NOT NULL THEN 'ROUTE'
    WHEN rv.post_id IS NOT NULL THEN 'OBJECT'
    ELSE NULL
  END AS entityType,
  COALESCE(p.title, ro.name) AS entityName
FROM review rv
LEFT JOIN tourist t  ON rv.tourist_id = t.id
LEFT JOIN post    p  ON rv.post_id    = p.id
LEFT JOIN route   ro ON rv.route_id   = ro.id;

CREATE OR REPLACE VIEW v_admin_users_full AS
SELECT
  au.id AS userId, au.organization_id AS organizationId,
  au.full_name AS fullName, au.email, au.email_verified_at AS emailVerifiedAt,
  au.role, au.is_individual AS isIndividual, au.account_status AS accountStatus,
  au.profile_image AS profileImage, au.last_login_at AS lastLoginAt, au.created_at AS createdAt,
  o.name AS organizationName, o.type AS organizationType,
  o.contact_email AS organizationEmail, o.website AS organizationWebsite,
  o.is_verified AS organizationIsVerified,
  (SELECT COUNT(*) FROM admin_user_permission aup WHERE aup.admin_user_id = au.id) AS permissionCount,
  CASE WHEN au.account_status = 'active' THEN 1 ELSE 0 END AS isActive
FROM admin_user au
LEFT JOIN organization o ON au.organization_id = o.id;

CREATE OR REPLACE VIEW v_superadmin_overview AS
SELECT
  (SELECT COUNT(*) FROM tourist WHERE is_active = 1)                                   AS totalTourists,
  (SELECT COUNT(*) FROM admin_user WHERE role = 'admin' AND account_status = 'active') AS totalAdmins,
  (SELECT COUNT(*) FROM post  WHERE status = 'published')                               AS totalPosts,
  (SELECT COUNT(*) FROM route WHERE status = 'published')                               AS totalRoutes,
  (SELECT COUNT(*) FROM admin_registration_request WHERE status = 'pending')            AS pendingRegistrations,
  (SELECT COUNT(*) FROM review WHERE status = 'PENDING')                                AS pendingReviews,
  (SELECT COUNT(*) FROM ticket WHERE status = 'issued')                                 AS ticketsIssued,
  (SELECT COUNT(*) FROM admin_notification WHERE is_read = 0)                           AS unreadNotifications;

CREATE OR REPLACE VIEW v_region_popularity AS
SELECT
  r.id AS regionId, r.name, r.type,
  COUNT(DISTINCT p.id) AS numPosts,
  COALESCE(SUM(p.view_count), 0) AS totalViews,
  COALESCE(SUM(p.like_count), 0) AS totalLikes,
  AVG(p.avg_rating) AS avgRating
FROM region r
LEFT JOIN post p ON p.region_id = r.id AND p.status = 'published'
GROUP BY r.id, r.name, r.type;


-- ============================================================
--  AŽURIRANJE BROJAČA
-- ============================================================

UPDATE post p SET
  like_count   = (SELECT COUNT(*) FROM post_like  WHERE post_id = p.id),
  save_count   = (SELECT COUNT(*) FROM post_save  WHERE post_id = p.id),
  view_count   = (SELECT COUNT(*) FROM post_view  WHERE post_id = p.id),
  review_count = (SELECT COUNT(*) FROM review     WHERE post_id = p.id AND status = 'APPROVED'),
  avg_rating   = (SELECT AVG(rating) FROM review  WHERE post_id = p.id AND status = 'APPROVED');

UPDATE route r SET
  view_count = (SELECT COUNT(*) FROM post_view pv
                JOIN post_tag pt ON pv.post_id = pt.post_id
                WHERE 1=0), -- rute nemaju post_view direktno, ostavljamo 0
  save_count = (SELECT COUNT(*) FROM tourist_favorite WHERE route_id = r.id);

-- ============================================================
--  KRAJ SKRIPTE v3
-- ============================================================