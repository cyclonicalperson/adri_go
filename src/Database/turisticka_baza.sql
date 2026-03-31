-- ============================================================
--  TURISTIČKA APLIKACIJA — Kompletna MySQL baza podataka
--  Opis: Baza za mobilnu turističku aplikaciju i admin panel
-- ============================================================

CREATE DATABASE IF NOT EXISTS turisticka_baza;
USE turisticka_baza;

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
--  1. ORGANIZACIJE
-- ============================================================

CREATE TABLE organization (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(100) NOT NULL COMMENT 'tourist_agency, hotel_chain, municipality, ngo, private',
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
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED,
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('superadmin','admin') NOT NULL DEFAULT 'admin',
    is_individual   TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=fizicko lice, 0=organizacija',
    account_status  ENUM('active','suspended','pending') NOT NULL DEFAULT 'pending',
    profile_image   VARCHAR(500),
    last_login_at   DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_org FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  3. PERMISIJE
-- ============================================================

CREATE TABLE admin_permission (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE COMMENT 'create_event, create_route, create_accommodation ...',
    label       VARCHAR(200) NOT NULL,
    category    VARCHAR(100) NOT NULL COMMENT 'content, users, analytics',
    description VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE admin_user_permission (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id   INT UNSIGNED NOT NULL,
    permission_id   INT UNSIGNED NOT NULL,
    granted_by      INT UNSIGNED NOT NULL COMMENT 'superadmin koji je dao permisiju',
    granted_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_perm (admin_user_id, permission_id),
    CONSTRAINT fk_aup_user FOREIGN KEY (admin_user_id) REFERENCES admin_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_aup_perm FOREIGN KEY (permission_id) REFERENCES admin_permission(id) ON DELETE CASCADE,
    CONSTRAINT fk_aup_granted FOREIGN KEY (granted_by) REFERENCES admin_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  4. REGISTRACIJA ADMINA
-- ============================================================

CREATE TABLE admin_registration_request (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(200) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    is_organization     TINYINT(1) NOT NULL DEFAULT 0,
    organization_name   VARCHAR(200),
    organization_email  VARCHAR(255),
    status              ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    rejection_reason    TEXT,
    submitted_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at         DATETIME,
    reviewed_by         INT UNSIGNED COMMENT 'superadmin koji je pregledao',
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
    CONSTRAINT fk_vd_request FOREIGN KEY (registration_request_id) REFERENCES admin_registration_request(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE terms_acceptance (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id           INT UNSIGNED,
    registration_request_id INT UNSIGNED,
    terms_version           VARCHAR(20) NOT NULL,
    accepted_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address              VARCHAR(45),
    CONSTRAINT fk_ta_user FOREIGN KEY (admin_user_id) REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT fk_ta_request FOREIGN KEY (registration_request_id) REFERENCES admin_registration_request(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  5. AUDIT LOG
-- ============================================================

CREATE TABLE admin_audit_log (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id   INT UNSIGNED COMMENT 'ko je izvrsio akciju',
    performed_by    INT UNSIGNED COMMENT 'superadmin koji je pokrenuo (ako je drugaciji)',
    action          VARCHAR(100) NOT NULL COMMENT 'create, update, delete, approve, reject ...',
    entity_type     VARCHAR(100) NOT NULL COMMENT 'post, route, admin_user, event ...',
    entity_id       INT UNSIGNED,
    old_value       JSON,
    new_value       JSON,
    performed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address      VARCHAR(45),
    CONSTRAINT fk_aal_user FOREIGN KEY (admin_user_id) REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT fk_aal_by   FOREIGN KEY (performed_by)  REFERENCES admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  6. REGIJE / DESTINACIJE
-- ============================================================

CREATE TABLE region (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    type            ENUM('city','mountain','lake','national_park','coast','village','other') NOT NULL,
    description     TEXT,
    country         VARCHAR(100) NOT NULL DEFAULT 'Montenegro',
    lat             DECIMAL(10,7),
    lng             DECIMAL(10,7),
    cover_image     VARCHAR(500),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  7. OBJAVE (POSTS)
--     Jedinstven model za sve tipove sadrzaja:
--     accommodation, restaurant, club, cultural_site,
--     monument, sports_facility, event, route_post,
--     attraction, shop
-- ============================================================

CREATE TABLE post (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id            INT UNSIGNED NOT NULL,
    region_id           INT UNSIGNED,
    title               VARCHAR(300) NOT NULL,
    post_type           ENUM(
                          'accommodation',
                          'restaurant',
                          'club',
                          'cultural_site',
                          'monument',
                          'sports_facility',
                          'event',
                          'attraction',
                          'shop',
                          'other'
                        ) NOT NULL,
    description         TEXT,
    lat                 DECIMAL(10,7),
    lng                 DECIMAL(10,7),
    address             VARCHAR(300),
    external_url        VARCHAR(500) COMMENT 'link na Booking, Airbnb, sajt organizatora...',
    external_url_label  VARCHAR(100) COMMENT 'tekst na dugmetu: Rezervisi, Vise info...',
    images              JSON COMMENT 'niz URL-ova slika',
    opening_hours       JSON COMMENT '{"mon":"08:00-20:00","tue":"08:00-20:00",...}',
    details             JSON COMMENT 'specificni atributi po tipu: cena, kapacitet, tezina...',
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
    lang_code   VARCHAR(5) NOT NULL COMMENT 'sr, en, de, fr, ru...',
    title       VARCHAR(300) NOT NULL,
    description TEXT,
    UNIQUE KEY uq_post_lang (post_id, lang_code),
    CONSTRAINT fk_pt_post FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  8. TAGOVI
-- ============================================================

CREATE TABLE tag (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    category    VARCHAR(100) COMMENT 'aktivnost, amenity, stil...',
    color       VARCHAR(7) COMMENT 'hex boja za UI'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE post_tag (
    post_id INT UNSIGNED NOT NULL,
    tag_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_postag_post FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    CONSTRAINT fk_postag_tag  FOREIGN KEY (tag_id)  REFERENCES tag(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  9. RUTE
-- ============================================================

CREATE TABLE route (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id        INT UNSIGNED NOT NULL,
    region_id       INT UNSIGNED,
    name            VARCHAR(200) NOT NULL,
    difficulty      ENUM('easy','moderate','hard','expert') NOT NULL DEFAULT 'moderate',
    distance_km     DECIMAL(7,2),
    duration_min    INT UNSIGNED COMMENT 'procijenjeno trajanje u minutima',
    elevation_gain  INT UNSIGNED COMMENT 'visinska razlika u metrima',
    description     TEXT,
    waypoints       JSON COMMENT '[{"lat":...,"lng":...,"name":"..."},...]',
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
--  10. TURISTI
-- ============================================================

CREATE TABLE tourist (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200),
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255) COMMENT 'NULL ako je guest korisnik bez naloga',
    language        VARCHAR(5) NOT NULL DEFAULT 'en',
    interests       JSON COMMENT '["hiking","culture","food",...]',
    home_lat        DECIMAL(10,7),
    home_lng        DECIMAL(10,7),
    profile_image   VARCHAR(500),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  11. INTERAKCIJE TURISTA SA OBJAVAMA
-- ============================================================

-- Lajkovi
CREATE TABLE post_like (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED NOT NULL,
    post_id     INT UNSIGNED NOT NULL,
    liked_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_like (tourist_id, post_id),
    CONSTRAINT fk_like_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE,
    CONSTRAINT fk_like_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Sacuvane objave
CREATE TABLE post_save (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED NOT NULL,
    post_id     INT UNSIGNED NOT NULL,
    saved_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_save (tourist_id, post_id),
    CONSTRAINT fk_save_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE,
    CONSTRAINT fk_save_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Pregledi objava
CREATE TABLE post_view (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id      INT UNSIGNED,
    post_id         INT UNSIGNED NOT NULL,
    viewed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_sec    INT UNSIGNED,
    CONSTRAINT fk_view_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_view_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    INDEX idx_view_post (post_id),
    INDEX idx_view_tourist (tourist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Klikovi na link (Booking, Airbnb, itd.)
CREATE TABLE external_click (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED,
    post_id     INT UNSIGNED NOT NULL,
    url         VARCHAR(500),
    clicked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ec_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_ec_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Trazenje direkcija do objave
CREATE TABLE direction_request (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id      INT UNSIGNED,
    post_id         INT UNSIGNED NOT NULL,
    from_lat        DECIMAL(10,7),
    from_lng        DECIMAL(10,7),
    requested_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dr_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_dr_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Deljenje sadrzaja
CREATE TABLE content_share (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED,
    post_id     INT UNSIGNED,
    route_id    INT UNSIGNED,
    platform    VARCHAR(50) COMMENT 'whatsapp, instagram, facebook, copy_link...',
    shared_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_cs_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    CONSTRAINT fk_cs_route   FOREIGN KEY (route_id)   REFERENCES route(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  12. RECENZIJE
-- ============================================================

CREATE TABLE review (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED,
    post_id     INT UNSIGNED NOT NULL,
    rating      TINYINT UNSIGNED NOT NULL COMMENT '1-5',
    comment     TEXT,
    is_approved TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rev_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL,
    CONSTRAINT fk_rev_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    INDEX idx_review_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  13. OMILJENO (FAVORITES)
-- ============================================================

CREATE TABLE tourist_favorite (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED NOT NULL,
    post_id     INT UNSIGNED,
    route_id    INT UNSIGNED,
    saved_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fav_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE,
    CONSTRAINT fk_fav_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    CONSTRAINT fk_fav_route   FOREIGN KEY (route_id)   REFERENCES route(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  14. PLANER POSETE
-- ============================================================

CREATE TABLE visit_planner (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    start_date  DATE,
    end_date    DATE,
    notes       TEXT,
    is_public   TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vp_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE planner_item (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    planner_id      INT UNSIGNED NOT NULL,
    post_id         INT UNSIGNED,
    route_id        INT UNSIGNED,
    day_number      TINYINT UNSIGNED NOT NULL DEFAULT 1,
    order_in_day    TINYINT UNSIGNED NOT NULL DEFAULT 1,
    notes           TEXT,
    scheduled_time  TIME,
    CONSTRAINT fk_pi_planner FOREIGN KEY (planner_id) REFERENCES visit_planner(id) ON DELETE CASCADE,
    CONSTRAINT fk_pi_post    FOREIGN KEY (post_id)    REFERENCES post(id)          ON DELETE SET NULL,
    CONSTRAINT fk_pi_route   FOREIGN KEY (route_id)   REFERENCES route(id)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  15. DIGITALNE ULAZNICE
-- ============================================================

CREATE TABLE ticket (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id     INT UNSIGNED NOT NULL COMMENT 'event post za koji je karta',
    tourist_id  INT UNSIGNED,
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    qr_code     VARCHAR(500) COMMENT 'URL ili base64 QR kod slike',
    price_paid  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status      ENUM('issued','used','cancelled','refunded') NOT NULL DEFAULT 'issued',
    issued_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at     DATETIME,
    CONSTRAINT fk_tick_post    FOREIGN KEY (post_id)    REFERENCES post(id)    ON DELETE CASCADE,
    CONSTRAINT fk_tick_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  16. NOTIFIKACIJE
-- ============================================================

CREATE TABLE notification (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id  INT UNSIGNED NOT NULL,
    type        VARCHAR(50) NOT NULL COMMENT 'new_event, reminder, promo, system...',
    title       VARCHAR(200) NOT NULL,
    body        TEXT,
    payload     JSON COMMENT 'post_id, route_id, url...',
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at     DATETIME,
    CONSTRAINT fk_notif_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE CASCADE,
    INDEX idx_notif_tourist (tourist_id),
    INDEX idx_notif_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  17. MAILING LISTA
-- ============================================================

CREATE TABLE mailing_list (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tourist_id      INT UNSIGNED,
    email           VARCHAR(255) NOT NULL,
    preferences     JSON COMMENT '{"events":true,"offers":true,"news":false}',
    is_subscribed   TINYINT(1) NOT NULL DEFAULT 1,
    subscribed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME,
    CONSTRAINT fk_ml_tourist FOREIGN KEY (tourist_id) REFERENCES tourist(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- ============================================================
--
--  SEED DATA — Primjeri podataka za testiranje
--
-- ============================================================
-- ============================================================


-- ============================================================
--  PERMISIJE — sve dostupne permisije u sistemu
-- ============================================================

INSERT INTO admin_permission (code, label, category, description) VALUES
('create_accommodation',  'Kreiranje smeštaja',        'content',   'Dodavanje hotela, apartmana, privatnog smeštaja'),
('create_restaurant',     'Kreiranje restorana',        'content',   'Dodavanje restorana i kafića'),
('create_club',           'Kreiranje klubova',          'content',   'Dodavanje noćnih klubova i barova'),
('create_event',          'Kreiranje dogadjaja',        'content',   'Dodavanje koncerata, takmičenja, tura'),
('create_route',          'Kreiranje ruta',             'content',   'Dodavanje pešačkih i biciklističkih ruta'),
('create_cultural_site',  'Kreiranje kulturnih mesta', 'content',   'Dodavanje muzeja, galerija, kulturnih objekata'),
('create_monument',       'Kreiranje spomenika',        'content',   'Dodavanje istorijskih i prirodnih spomenika'),
('create_sports',         'Kreiranje sportskih obj.',   'content',   'Dodavanje sportskih terena i objekata'),
('create_shop',           'Kreiranje prodavnica',       'content',   'Dodavanje prodavnica i tržnih centara'),
('manage_reviews',        'Upravljanje recenzijama',    'content',   'Odobravanje i brisanje recenzija svojih objava'),
('view_analytics',        'Pregled analitike',          'analytics', 'Pregled statistika o objavama i turistima'),
('manage_own_posts',      'Upravljanje vlastitim obj.', 'content',   'Editovanje i brisanje vlastitih objava');


-- ============================================================
--  ORGANIZACIJE
-- ============================================================

INSERT INTO organization (name, type, contact_email, phone, website, is_verified) VALUES
('Turistička organizacija Žabljak',  'municipality',   'info@zabljak.travel',   '+38269123001', 'https://zabljak.travel',   1),
('NP Durmitor',                      'municipality',   'info@npdurmitor.me',    '+38269123002', 'https://npdurmitor.me',    1),
('Montenegro Adventures d.o.o.',     'tourist_agency', 'hello@mnadv.me',        '+38268234001', 'https://montenegroadv.me', 1),
('Hotel Jezera Žabljak',             'hotel_chain',    'rezervacije@jezera.me', '+38269345001', 'https://hoteljezera.me',   1),
('Outdoor Montenegro',               'tourist_agency', 'info@outdoorme.me',     '+38268456001', 'https://outdoorme.me',     0);


-- ============================================================
--  ADMIN KORISNICI
-- ============================================================

-- SuperAdmin (password: SuperAdmin123!)
INSERT INTO admin_user (organization_id, full_name, email, password_hash, role, is_individual, account_status) VALUES
(NULL, 'Marko Petrović', 'superadmin@touristhub.me', '$2y$12$examplehashSUPERADMIN001', 'superadmin', 1, 'active');

-- Admini (password: Admin123!)
INSERT INTO admin_user (organization_id, full_name, email, password_hash, role, is_individual, account_status) VALUES
(1, 'Ana Kovačević',   'ana.kovacevic@zabljak.travel',   '$2y$12$examplehashADMIN001', 'admin', 0, 'active'),
(2, 'Nikola Đurić',    'nikola.djuric@npdurmitor.me',    '$2y$12$examplehashADMIN002', 'admin', 0, 'active'),
(3, 'Jovana Milić',    'jovana.milic@mnadv.me',          '$2y$12$examplehashADMIN003', 'admin', 0, 'active'),
(4, 'Stefan Radović',  'stefan.radovic@hoteljezera.me',  '$2y$12$examplehashADMIN004', 'admin', 0, 'active'),
(NULL,'Petar Vuković', 'petar.vukovic@gmail.com',        '$2y$12$examplehashADMIN005', 'admin', 1, 'active');


-- ============================================================
--  PERMISIJE PO ADMINIMA  (granted_by = 1 = superadmin)
-- ============================================================

-- Ana — turistička org., može sve osim smeštaja i klubova
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(2, (SELECT id FROM admin_permission WHERE code='create_event'),        1),
(2, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(2, (SELECT id FROM admin_permission WHERE code='create_cultural_site'),1),
(2, (SELECT id FROM admin_permission WHERE code='create_monument'),     1),
(2, (SELECT id FROM admin_permission WHERE code='view_analytics'),      1),
(2, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(2, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Nikola — NP Durmitor, fokus na prirodi i rutama
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(3, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(3, (SELECT id FROM admin_permission WHERE code='create_monument'),     1),
(3, (SELECT id FROM admin_permission WHERE code='create_sports'),       1),
(3, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1),
(3, (SELECT id FROM admin_permission WHERE code='view_analytics'),      1);

-- Jovana — agencija, može evente i ture
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(4, (SELECT id FROM admin_permission WHERE code='create_event'),        1),
(4, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(4, (SELECT id FROM admin_permission WHERE code='create_restaurant'),   1),
(4, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(4, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Stefan — hotel, samo smeštaj i restoran
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(5, (SELECT id FROM admin_permission WHERE code='create_accommodation'),1),
(5, (SELECT id FROM admin_permission WHERE code='create_restaurant'),   1),
(5, (SELECT id FROM admin_permission WHERE code='manage_reviews'),      1),
(5, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);

-- Petar — fizicko lice, samo rute i sportski objekti
INSERT INTO admin_user_permission (admin_user_id, permission_id, granted_by) VALUES
(6, (SELECT id FROM admin_permission WHERE code='create_route'),        1),
(6, (SELECT id FROM admin_permission WHERE code='create_sports'),       1),
(6, (SELECT id FROM admin_permission WHERE code='manage_own_posts'),    1);


-- ============================================================
--  REGISTRACIJA — primer zahteva u toku
-- ============================================================

INSERT INTO admin_registration_request
    (full_name, email, password_hash, is_organization, organization_name, organization_email, status)
VALUES
('Milica Stanković', 'milica.s@gmail.com',    '$2y$12$examplehashREQ001', 0, NULL, NULL, 'pending'),
('Boris Nikolić',    'boris@adventureme.com', '$2y$12$examplehashREQ002', 1,
 'Adventure Montenegro', 'info@adventureme.com', 'pending');

INSERT INTO verification_document (registration_request_id, file_path, file_name, file_type, file_size_kb) VALUES
(1, '/uploads/docs/milica_licna.pdf',       'licna_karta.pdf',          'pdf', 320),
(2, '/uploads/docs/boris_registracija.pdf', 'rjesenje_o_registraciji.pdf', 'pdf', 890);

INSERT INTO terms_acceptance (registration_request_id, terms_version, ip_address) VALUES
(1, '1.0', '93.87.12.45'),
(2, '1.0', '178.220.45.11');


-- ============================================================
--  REGIJE
-- ============================================================

INSERT INTO region (name, type, description, country, lat, lng, cover_image) VALUES
('Žabljak',        'city',          'Planinski grad na Durmitoru, najviši grad na Balkanu.',        'Montenegro', 43.1556, 19.1225, '/images/regions/zabljak.jpg'),
('Durmitor',       'national_park', 'Nacionalni park UNESCO svjetske baštine sa 18 ledničkih jezera.', 'Montenegro', 43.1500, 19.0167, '/images/regions/durmitor.jpg'),
('Crno jezero',    'lake',          'Najpoznatije jezero Durmitora, simbol crnogorskog turizma.',    'Montenegro', 43.1378, 19.0644, '/images/regions/crnojezero.jpg'),
('Tara kanjon',    'national_park', 'Najdublji kanjon u Evropi, rijeka Tara bistre vode.',           'Montenegro', 43.2000, 19.2500, '/images/regions/tara.jpg'),
('Budva',          'city',          'Najpoznatije turističko odredište Crnogorskog primorja.',       'Montenegro', 42.2864, 18.8400, '/images/regions/budva.jpg'),
('Kotor',          'city',          'UNESCO zaštićeni stari grad sa venetskom arhitekturom.',        'Montenegro', 42.4247, 18.7712, '/images/regions/kotor.jpg');


-- ============================================================
--  TAGOVI
-- ============================================================

INSERT INTO tag (name, category, color) VALUES
('Outdoor',         'aktivnost',  '#2D9E4F'),
('Porodično',       'stil',       '#4A90E2'),
('Romantično',      'stil',       '#E24A7C'),
('Besplatno',       'cijena',     '#27AE60'),
('Parking',         'amenity',    '#7F8C8D'),
('WiFi',            'amenity',    '#2980B9'),
('Pješačenje',      'aktivnost',  '#8E44AD'),
('Biciklizam',      'aktivnost',  '#E67E22'),
('Plivanje',        'aktivnost',  '#16A085'),
('UNESCO',          'oznaka',     '#C0392B'),
('Historijsko',     'oznaka',     '#D35400'),
('Restoran',        'tip',        '#E74C3C'),
('Kafić',           'tip',        '#935116'),
('Noćni život',     'aktivnost',  '#8E44AD'),
('Sport',           'aktivnost',  '#2ECC71'),
('Adrenalin',       'aktivnost',  '#E74C3C'),
('Priroda',         'aktivnost',  '#27AE60'),
('Kulturno',        'oznaka',     '#9B59B6'),
('Muzika',          'aktivnost',  '#1ABC9C'),
('Gastronomija',    'aktivnost',  '#F39C12');


-- ============================================================
--  OBJAVE (POSTS)
-- ============================================================

-- Smeštaj — Hotel Jezera (admin: Stefan, id=5)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, opening_hours, details, status, published_at)
VALUES (
  5, 1, 'Hotel Jezera Žabljak', 'accommodation',
  'Četvorozvjezdičani hotel smješten na obali Crnog jezera. Nudi panoramski pogled na Durmitor, restoran, spa i besplatan ski servis.',
  43.1378, 19.0644, 'Žabljak bb, 84210 Žabljak',
  'https://www.booking.com/hotel/me/jezera-zabljak.html', 'Rezerviši na Booking',
  JSON_ARRAY('/images/posts/jezera1.jpg', '/images/posts/jezera2.jpg', '/images/posts/jezera3.jpg'),
  JSON_OBJECT('mon','00:00-24:00','tue','00:00-24:00','wed','00:00-24:00','thu','00:00-24:00','fri','00:00-24:00','sat','00:00-24:00','sun','00:00-24:00'),
  JSON_OBJECT('stars', 4, 'rooms', 86, 'price_from', 85, 'currency', 'EUR', 'amenities', JSON_ARRAY('spa','restaurant','ski_service','parking','wifi','pool')),
  'published', '2024-03-01 09:00:00'
);

-- Restoran (admin: Stefan, id=5)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, opening_hours, details, status, published_at)
VALUES (
  5, 1, 'Restoran Soa', 'restaurant',
  'Tradicionalna crnogorska kuhinja sa lokalno uzgojenim namirnicama. Specijalitet: jagnjetina ispod sača i domaći sir.',
  43.1556, 19.1225, 'Njegoševa 12, Žabljak',
  NULL, NULL,
  JSON_ARRAY('/images/posts/soa1.jpg', '/images/posts/soa2.jpg'),
  JSON_OBJECT('mon','12:00-22:00','tue','12:00-22:00','wed','12:00-22:00','thu','12:00-22:00','fri','12:00-23:00','sat','12:00-23:00','sun','12:00-21:00'),
  JSON_OBJECT('cuisine', 'Montenegrin', 'price_range', '€€', 'capacity', 60, 'outdoor_seating', true),
  'published', '2024-03-05 10:00:00'
);

-- Kulturni objekat — Muzej (admin: Ana, id=2)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, opening_hours, details, status, published_at)
VALUES (
  2, 1, 'Muzej Žabljaka', 'cultural_site',
  'Muzej posvećen historiji i prirodnim bogatstvima Durmitora. Zbirke o lokalnoj kulturi, flori i fauni nacionalnog parka.',
  43.1548, 19.1218, 'Trg Durmitorskih ratnika 2, Žabljak',
  'https://muzejzabljak.me', 'Saznaj više',
  JSON_ARRAY('/images/posts/muzej1.jpg'),
  JSON_OBJECT('mon','closed','tue','09:00-17:00','wed','09:00-17:00','thu','09:00-17:00','fri','09:00-17:00','sat','10:00-16:00','sun','closed'),
  JSON_OBJECT('entrance_fee', 3, 'currency', 'EUR', 'guided_tours', true, 'languages', JSON_ARRAY('me','en')),
  'published', '2024-03-08 11:00:00'
);

-- Dogadjaj — Koncert (admin: Jovana, id=4)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, details, status, published_at)
VALUES (
  4, 1, 'Durmitor Summer Fest 2025', 'event',
  'Trodnevni muzički festival pod vedrim nebom na Žabljaku. Nastupi domaćih i regionalnih izvođača, etno muzika, folk, rock.',
  43.1560, 19.1230, 'Stadion Žabljak, Žabljak',
  'https://durmitorsummerfest.me/karte', 'Kupi kartu',
  JSON_ARRAY('/images/posts/fest1.jpg', '/images/posts/fest2.jpg'),
  JSON_OBJECT(
    'event_start',  '2025-07-18 18:00:00',
    'event_end',    '2025-07-20 23:59:00',
    'price',        15,
    'currency',     'EUR',
    'capacity',     2000,
    'tickets_sold', 847,
    'performers',   JSON_ARRAY('Bijelo Dugme Tribute', 'Đorđe Balašević Tribute', 'Etno Trio Durmitor')
  ),
  'published', '2024-04-01 09:00:00'
);

-- Atrakcija — Crno jezero (admin: Nikola, id=3)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status, published_at)
VALUES (
  3, 3, 'Crno jezero', 'attraction',
  'Simbol Durmitora i cijele Crne Gore. Glacijalnog porijekla, sastoji se od Malog i Velikog jezera spojenih kratkim kanalom. Idealno za šetnju i fotografisanje.',
  43.1378, 19.0644, 'NP Durmitor, Žabljak',
  JSON_ARRAY('/images/posts/crnojezero1.jpg', '/images/posts/crnojezero2.jpg'),
  JSON_OBJECT('mon','00:00-24:00','tue','00:00-24:00','wed','00:00-24:00','thu','00:00-24:00','fri','00:00-24:00','sat','00:00-24:00','sun','00:00-24:00'),
  JSON_OBJECT('entrance_fee', 5, 'currency', 'EUR', 'perimeter_km', 3.6, 'altitude_m', 1416),
  'published', '2024-02-15 08:00:00'
);

-- Smeštaj — Apartmani (admin: Ana, id=2)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  external_url, external_url_label, images, details, status, published_at)
VALUES (
  2, 1, 'Apartmani Durmitor View', 'accommodation',
  'Privatni apartmani sa pogledom na Durmitor. Potpuno opremljeni, idealni za porodice i grupe. Besplatan parking i WiFi.',
  43.1570, 19.1235, 'Vuka Karadžića 8, Žabljak',
  'https://www.airbnb.com/rooms/durmitorview', 'Rezerviši na Airbnb',
  JSON_ARRAY('/images/posts/apt1.jpg', '/images/posts/apt2.jpg'),
  JSON_OBJECT('price_from', 45, 'currency', 'EUR', 'num_apartments', 6,
              'amenities', JSON_ARRAY('parking','wifi','kitchen','bbq')),
  'published', '2024-03-20 10:00:00'
);

-- Klub (admin: Jovana, id=4)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status, published_at)
VALUES (
  4, 5, 'Club Aquarius Budva', 'club',
  'Najpopularniji beach club na Crnogorskom primorju. Dnevni program, DJ evenings, bazen i VIP zone.',
  42.2820, 18.8390, 'Slovenska plaža, Budva',
  JSON_ARRAY('/images/posts/aquarius1.jpg', '/images/posts/aquarius2.jpg'),
  JSON_OBJECT('mon','22:00-05:00','fri','22:00-06:00','sat','22:00-06:00','sun','22:00-05:00'),
  JSON_OBJECT('capacity', 1500, 'entry_fee', 10, 'currency', 'EUR', 'dress_code', 'smart casual'),
  'published', '2024-05-01 12:00:00'
);

-- Sportski objekat (admin: Petar, id=6)
INSERT INTO post (admin_id, region_id, title, post_type, description, lat, lng, address,
                  images, opening_hours, details, status, published_at)
VALUES (
  6, 2, 'Ski centar Savin Kuk', 'sports_facility',
  'Skijalište na 2313m nadmorske visine. 4 žičare, 12 staza ukupne dužine 18km. Škola skijanja i rent servisi.',
  43.1789, 19.0456, 'Savin Kuk, NP Durmitor',
  JSON_ARRAY('/images/posts/savinkuk1.jpg', '/images/posts/savinkuk2.jpg'),
  JSON_OBJECT('mon','09:00-16:00','tue','09:00-16:00','wed','09:00-16:00','thu','09:00-16:00','fri','09:00-16:00','sat','09:00-16:30','sun','09:00-16:30'),
  JSON_OBJECT('season_start','December','season_end','April','lifts', 4,
              'slopes', 12, 'total_km', 18, 'ski_school', true, 'day_pass', 25, 'currency','EUR'),
  'published', '2024-11-01 08:00:00'
);


-- ============================================================
--  PREVODI OBJAVA (EN)
-- ============================================================

INSERT INTO post_translation (post_id, lang_code, title, description) VALUES
(1, 'en', 'Hotel Jezera Žabljak',
 'Four-star hotel on the shores of Black Lake. Panoramic views of Durmitor, restaurant, spa and free ski service.'),
(3, 'en', 'Žabljak Museum',
 'Museum dedicated to the history and natural heritage of Durmitor. Collections on local culture, flora and fauna of the national park.'),
(4, 'en', 'Durmitor Summer Fest 2025',
 'Three-day open-air music festival in Žabljak. Performances by local and regional artists: ethno, folk and rock music.'),
(5, 'en', 'Black Lake',
 'Symbol of Durmitor and Montenegro. Glacial origin, consisting of Small and Large Lake. Perfect for walking and photography.');


-- ============================================================
--  TAGOVI NA OBJAVAMA
-- ============================================================

INSERT INTO post_tag (post_id, tag_id) VALUES
(1, (SELECT id FROM tag WHERE name='Parking')),
(1, (SELECT id FROM tag WHERE name='WiFi')),
(1, (SELECT id FROM tag WHERE name='Porodično')),
(2, (SELECT id FROM tag WHERE name='Gastronomija')),
(2, (SELECT id FROM tag WHERE name='Kulturno')),
(3, (SELECT id FROM tag WHERE name='Kulturno')),
(3, (SELECT id FROM tag WHERE name='Historijsko')),
(4, (SELECT id FROM tag WHERE name='Muzika')),
(4, (SELECT id FROM tag WHERE name='Noćni život')),
(5, (SELECT id FROM tag WHERE name='Priroda')),
(5, (SELECT id FROM tag WHERE name='Outdoor')),
(5, (SELECT id FROM tag WHERE name='Besplatno')),
(6, (SELECT id FROM tag WHERE name='Porodično')),
(6, (SELECT id FROM tag WHERE name='WiFi')),
(7, (SELECT id FROM tag WHERE name='Noćni život')),
(7, (SELECT id FROM tag WHERE name='Adrenalin')),
(8, (SELECT id FROM tag WHERE name='Sport')),
(8, (SELECT id FROM tag WHERE name='Adrenalin')),
(8, (SELECT id FROM tag WHERE name='Outdoor'));


-- ============================================================
--  RUTE
-- ============================================================

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status)
VALUES (
  3, 2, 'Staza oko Crnog jezera', 'easy', 3.6, 60, 30,
  'Kružna staza oko Crnog jezera. Idealna za početnike i porodice. Ravničarski teren, asfaltirana i makadamska podloga.',
  JSON_ARRAY(
    JSON_OBJECT('lat', 43.1378, 'lng', 19.0644, 'name', 'Ulaz — parking'),
    JSON_OBJECT('lat', 43.1395, 'lng', 19.0580, 'name', 'Malo jezero'),
    JSON_OBJECT('lat', 43.1420, 'lng', 19.0610, 'name', 'Vidikovac'),
    JSON_OBJECT('lat', 43.1400, 'lng', 19.0700, 'name', 'Veliko jezero'),
    JSON_OBJECT('lat', 43.1378, 'lng', 19.0644, 'name', 'Povratak — parking')
  ),
  'published'
);

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status)
VALUES (
  6, 2, 'Vrh Bobotov Kuk', 'hard', 14.0, 360, 900,
  'Najzahtjevnija tura na najviši vrh Durmitora (2523m). Preporučuje se iskusnim planinarima sa planinskim iskustvom. Spectakularan pogled.',
  JSON_ARRAY(
    JSON_OBJECT('lat', 43.1378, 'lng', 19.0644, 'name', 'Polazište — Crno jezero'),
    JSON_OBJECT('lat', 43.1450, 'lng', 19.0500, 'name', 'Ledena pećina'),
    JSON_OBJECT('lat', 43.1500, 'lng', 19.0400, 'name', 'Planinski dom'),
    JSON_OBJECT('lat', 43.1550, 'lng', 19.0300, 'name', 'Vrh Bobotov Kuk 2523m')
  ),
  'published'
);

INSERT INTO route (admin_id, region_id, name, difficulty, distance_km, duration_min, elevation_gain,
                   description, waypoints, status)
VALUES (
  3, 4, 'Kanjon Tare — pješačka staza', 'moderate', 8.5, 180, 420,
  'Staza duž kanjona rijeke Tare. Prolazi kroz šumu crnog bora, uz rijeku i do vidikovca iznad kanjona.',
  JSON_ARRAY(
    JSON_OBJECT('lat', 43.2000, 'lng', 19.2500, 'name', 'Polazište'),
    JSON_OBJECT('lat', 43.2100, 'lng', 19.2400, 'name', 'Šuma crnog bora'),
    JSON_OBJECT('lat', 43.2200, 'lng', 19.2300, 'name', 'Korito Tare'),
    JSON_OBJECT('lat', 43.2300, 'lng', 19.2200, 'name', 'Vidikovac nad kanjonom')
  ),
  'published'
);


-- ============================================================
--  TURISTI
-- ============================================================

INSERT INTO tourist (name, email, password_hash, language, interests) VALUES
('Emma Wilson',     'emma.wilson@gmail.com',   '$2y$12$touristHash001', 'en',
 JSON_ARRAY('hiking','nature','photography','culture')),
('Luca Rossi',      'luca.rossi@gmail.com',    '$2y$12$touristHash002', 'en',
 JSON_ARRAY('food','nightlife','beach','history')),
('Jana Novák',      'jana.novak@gmail.com',    '$2y$12$touristHash003', 'de',
 JSON_ARRAY('hiking','skiing','culture','family')),
('Aleksandra Popović', 'aleksandra.p@gmail.com', '$2y$12$touristHash004', 'sr',
 JSON_ARRAY('nature','culture','food')),
('Thomas Müller',   'thomas.m@gmail.com',      '$2y$12$touristHash005', 'de',
 JSON_ARRAY('skiing','adventure','sport'));


-- ============================================================
--  INTERAKCIJE TURISTA
-- ============================================================

-- Lajkovi
INSERT INTO post_like (tourist_id, post_id) VALUES
(1, 5), (1, 1), (1, 3),
(2, 4), (2, 7), (2, 2),
(3, 1), (3, 5), (3, 8),
(4, 5), (4, 3), (4, 2),
(5, 8), (5, 1), (5, 5);

-- Sacuvane objave
INSERT INTO post_save (tourist_id, post_id) VALUES
(1, 1), (1, 5),
(2, 4), (2, 7),
(3, 1), (3, 8),
(4, 3), (4, 5),
(5, 8);

-- Pregledi
INSERT INTO post_view (tourist_id, post_id, duration_sec) VALUES
(1, 5, 125), (1, 1, 87),  (1, 3, 45),
(2, 4, 210), (2, 7, 95),  (2, 2, 60),
(3, 1, 180), (3, 5, 140), (3, 8, 320),
(4, 5, 90),  (4, 3, 55),
(5, 8, 250), (5, 1, 110),
(NULL, 5, 30), (NULL, 1, 45);  -- guest korisnici

-- Klikovi na link (Booking/Airbnb)
INSERT INTO external_click (tourist_id, post_id, url) VALUES
(1, 1, 'https://www.booking.com/hotel/me/jezera-zabljak.html'),
(3, 1, 'https://www.booking.com/hotel/me/jezera-zabljak.html'),
(5, 1, 'https://www.booking.com/hotel/me/jezera-zabljak.html'),
(4, 6, 'https://www.airbnb.com/rooms/durmitorview'),
(2, 4, 'https://durmitorsummerfest.me/karte');

-- Trazenje direkcija
INSERT INTO direction_request (tourist_id, post_id, from_lat, from_lng) VALUES
(1, 5, 43.1500, 19.1100),
(2, 7, 42.2750, 18.8300),
(3, 1, 43.1600, 19.1300),
(4, 3, 43.1520, 19.1200),
(5, 8, 43.1600, 19.1000);


-- ============================================================
--  RECENZIJE
-- ============================================================

INSERT INTO review (tourist_id, post_id, rating, comment, is_approved) VALUES
(1, 5, 5, 'Nevjerovatno ljepoto! Crno jezero je jedno od najljepših mjesta koje sam posjetila. Staza je lijepo uredjena.', 1),
(2, 5, 4, 'Preljepo, ali malo previše turista u augustu. Preporučujem posjet u jutarnjim satima.', 1),
(3, 1, 5, 'Odličan hotel, predivna lokacija i ljubazno osoblje. Spa je vrhunski.', 1),
(4, 3, 4, 'Zanimljiv muzej sa dobrom zbirkom. Vodič je bio informativan.', 1),
(1, 1, 4, 'Lijepi apartmani, čisti i dobro opremljeni. Domaćini su bili odlični.', 1),
(5, 8, 5, 'Savin Kuk je fantastičan ski centar! Staze su dobro uredjene, žičare moderne.', 1),
(2, 4, 5, 'Festival je bio odličan! Atmosfera je neopisiva, muzičari vrhunski!', 1),
(3, 8, 4, 'Dobro skijalište, ali gužve vikendom. Škola skijanja je odlična za početnike.', 1);


-- ============================================================
--  OMILJENE RUTE
-- ============================================================

INSERT INTO tourist_favorite (tourist_id, route_id) VALUES
(1, 1), (3, 1), (4, 1),
(5, 2), (1, 3);


-- ============================================================
--  PLANER POSETE
-- ============================================================

INSERT INTO visit_planner (tourist_id, title, start_date, end_date, notes) VALUES
(1, 'Ljetnji odmor — Durmitor', '2025-07-15', '2025-07-21',
 'Planinarenje, jezera i festival. Obavezno posjetiti Crno jezero i Savin Kuk.'),
(3, 'Zimski odmor — Žabljak',   '2025-01-20', '2025-01-27',
 'Skijanje i upoznavanje Crne Gore.');

INSERT INTO planner_item (planner_id, post_id, route_id, day_number, order_in_day, notes, scheduled_time) VALUES
-- Emma: Dan 1
(1, 1,    NULL, 1, 1, 'Check-in Hotel Jezera', '15:00:00'),
(1, NULL, 1,    1, 2, 'Popodnevna šetnja oko Crnog jezera', '17:00:00'),
(1, 2,    NULL, 1, 3, 'Večera u Restauranu Soa', '20:00:00'),
-- Emma: Dan 2
(1, 3,    NULL, 2, 1, 'Jutarnja posjeta muzeju', '10:00:00'),
(1, NULL, 2,    2, 2, 'Tura na Bobotov Kuk — cijeli dan', '07:00:00'),
-- Emma: Dan 4 — festival
(1, 4,    NULL, 4, 1, 'Durmitor Summer Fest — večernji program', '19:00:00'),
-- Jana: Dan 1
(2, 1,    NULL, 1, 1, 'Check-in Hotel Jezera', '14:00:00'),
(2, 8,    NULL, 2, 1, 'Ski dan na Savin Kuku', '09:00:00');


-- ============================================================
--  KARTE ZA DOGADJAJ
-- ============================================================

INSERT INTO ticket (post_id, tourist_id, ticket_code, qr_code, price_paid, status) VALUES
(4, 1, 'DSF2025-A001', '/qr/DSF2025-A001.png', 15.00, 'issued'),
(4, 2, 'DSF2025-A002', '/qr/DSF2025-A002.png', 15.00, 'issued'),
(4, 4, 'DSF2025-A003', '/qr/DSF2025-A003.png', 15.00, 'issued');


-- ============================================================
--  NOTIFIKACIJE
-- ============================================================

INSERT INTO notification (tourist_id, type, title, body, payload, is_read) VALUES
(1, 'new_event',
 'Novi dogadjaj u Žabljaku',
 'Durmitor Summer Fest 2025 — 18-20 jul. Karte u prodaji!',
 JSON_OBJECT('post_id', 4, 'url', '/post/4'), 0),
(3, 'reminder',
 'Vaš put za Žabljak za 3 dana',
 'Provjeri planer i upoznaj se sa vremenskom prognozom.',
 JSON_OBJECT('planner_id', 2), 0),
(5, 'new_event',
 'Savin Kuk — sezona otvorena',
 'Skijaška sezona na Savin Kuku počinje 15. decembra.',
 JSON_OBJECT('post_id', 8, 'url', '/post/8'), 1),
(2, 'promo',
 'Posebna ponuda: Hotel Jezera',
 'Rezerviši 3+ noći i dobij 15% popusta. Ponuda važi do kraja aprila.',
 JSON_OBJECT('post_id', 1, 'url', '/post/1'), 0);


-- ============================================================
--  MAILING LISTA
-- ============================================================

INSERT INTO mailing_list (tourist_id, email, preferences, is_subscribed) VALUES
(1, 'emma.wilson@gmail.com',    JSON_OBJECT('events', true, 'offers', true, 'news', true),  1),
(2, 'luca.rossi@gmail.com',     JSON_OBJECT('events', true, 'offers', true, 'news', false), 1),
(3, 'jana.novak@gmail.com',     JSON_OBJECT('events', true, 'offers', false,'news', true),  1),
(4, 'aleksandra.p@gmail.com',   JSON_OBJECT('events', false,'offers', true, 'news', true),  1),
(5, 'thomas.m@gmail.com',       JSON_OBJECT('events', true, 'offers', true, 'news', true),  1);


-- ============================================================
--  AUDIT LOG — primeri akcija
-- ============================================================

INSERT INTO admin_audit_log (admin_user_id, performed_by, action, entity_type, entity_id, new_value) VALUES
(1, 1, 'approve', 'admin_registration_request', 2,
 JSON_OBJECT('admin_user_id', 2, 'email', 'ana.kovacevic@zabljak.travel', 'status', 'approved')),
(1, 1, 'approve', 'admin_registration_request', 3,
 JSON_OBJECT('admin_user_id', 3, 'email', 'nikola.djuric@npdurmitor.me',  'status', 'approved')),
(2, 2, 'create', 'post', 3,
 JSON_OBJECT('title', 'Muzej Žabljaka', 'post_type', 'cultural_site', 'status', 'published')),
(3, 3, 'create', 'route', 1,
 JSON_OBJECT('name', 'Staza oko Crnog jezera', 'difficulty', 'easy')),
(4, 4, 'create', 'post', 4,
 JSON_OBJECT('title', 'Durmitor Summer Fest 2025', 'post_type', 'event'));


-- ============================================================
--  KORISNI VIEW-OVI za dashboard
-- ============================================================

-- Admin dashboard: statistike po objavama
CREATE OR REPLACE VIEW v_post_stats AS
SELECT
  p.id,
  p.title,
  p.post_type,
  p.status,
  a.full_name      AS admin_name,
  r.name           AS region_name,
  p.view_count,
  p.like_count,
  p.save_count,
  p.review_count,
  p.avg_rating,
  (SELECT COUNT(*) FROM external_click ec WHERE ec.post_id = p.id) AS external_clicks,
  (SELECT COUNT(*) FROM direction_request dr WHERE dr.post_id = p.id) AS direction_requests,
  p.published_at,
  p.created_at
FROM post p
JOIN admin_user a ON p.admin_id = a.id
LEFT JOIN region r ON p.region_id = r.id;

-- SuperAdmin dashboard: globalni pregled
CREATE OR REPLACE VIEW v_superadmin_overview AS
SELECT
  (SELECT COUNT(*) FROM tourist WHERE is_active = 1)                         AS total_tourists,
  (SELECT COUNT(*) FROM admin_user WHERE role = 'admin' AND account_status = 'active') AS total_admins,
  (SELECT COUNT(*) FROM post WHERE status = 'published')                     AS total_posts,
  (SELECT COUNT(*) FROM route WHERE status = 'published')                    AS total_routes,
  (SELECT COUNT(*) FROM admin_registration_request WHERE status = 'pending') AS pending_requests,
  (SELECT COUNT(*) FROM review WHERE is_approved = 0)                        AS pending_reviews,
  (SELECT COUNT(*) FROM ticket WHERE status = 'issued')                      AS tickets_issued;

-- Popularnost regija
CREATE OR REPLACE VIEW v_region_popularity AS
SELECT
  r.id,
  r.name,
  r.type,
  COUNT(DISTINCT p.id)  AS num_posts,
  SUM(p.view_count)     AS total_views,
  SUM(p.like_count)     AS total_likes,
  AVG(p.avg_rating)     AS avg_rating
FROM region r
LEFT JOIN post p ON p.region_id = r.id AND p.status = 'published'
GROUP BY r.id, r.name, r.type;

-- ============================================================
--  AŽURIRANJE BROJACA (view_count, like_count, itd.)
-- ============================================================

UPDATE post p SET
  like_count   = (SELECT COUNT(*) FROM post_like  WHERE post_id = p.id),
  save_count   = (SELECT COUNT(*) FROM post_save  WHERE post_id = p.id),
  view_count   = (SELECT COUNT(*) FROM post_view  WHERE post_id = p.id),
  review_count = (SELECT COUNT(*) FROM review     WHERE post_id = p.id AND is_approved = 1),
  avg_rating   = (SELECT AVG(rating) FROM review  WHERE post_id = p.id AND is_approved = 1);

UPDATE route r SET
  view_count = (SELECT COUNT(*) FROM post_view WHERE post_id IS NULL),
  save_count = (SELECT COUNT(*) FROM tourist_favorite WHERE route_id = r.id);

-- ============================================================
--  KRAJ SKRIPTE
-- ============================================================
