-- MVP MySQL 8+ baza za projekat:
-- Jedinstvena digitalna turisticka karta Crne Gore
-- Ociscena verzija bez tabele koje nisu neophodne za prvu verziju

DROP DATABASE IF EXISTS montenegro_tourism_mvp;
CREATE DATABASE montenegro_tourism_mvp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE montenegro_tourism_mvp;

SET NAMES utf8mb4;

-- =========================================================
-- 1. KORISNICI, ULOGE, ORGANIZACIJE
-- =========================================================

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE organizations (
    organization_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    contact_email VARCHAR(120),
    phone VARCHAR(30),
    website VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    organization_id INT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(organization_id)
);

-- =========================================================
-- 2. DESTINACIJE
-- =========================================================

CREATE TABLE destinations (
    destination_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_destinations_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- =========================================================
-- 3. OBJEKTI
-- =========================================================

CREATE TABLE objects (
    object_id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    category ENUM(
        'Accommodation',
        'Restaurant',
        'Cafe',
        'Beach',
        'Monument',
        'Museum',
        'Park',
        'TourService',
        'Spa',
        'Fitness',
        'Club',
        'Shop',
        'NaturalAttraction',
        'SportsFacility',
        'Other'
    ) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(120),
    website VARCHAR(255),
    working_hours VARCHAR(120),
    avg_rating DECIMAL(3,2) NULL DEFAULT NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_objects_destination FOREIGN KEY (destination_id) REFERENCES destinations(destination_id),
    CONSTRAINT fk_objects_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE accommodation_details (
    object_id INT PRIMARY KEY,
    accommodation_type ENUM('Apartment','Hotel','Hostel','Villa','Camp','GuestHouse','Resort','Other') NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    guest_capacity INT NOT NULL,
    room_count INT NULL,
    bed_count INT NULL,
    bathroom_count INT NULL,
    check_in_time TIME NULL,
    check_out_time TIME NULL,
    owner_name VARCHAR(120),
    owner_phone VARCHAR(30),
    booking_url VARCHAR(255),
    airbnb_url VARCHAR(255),
    CONSTRAINT fk_accommodation_details_object FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE
);

CREATE TABLE restaurant_details (
    object_id INT PRIMARY KEY,
    cuisine_type VARCHAR(100),
    price_range ENUM('Budget','Mid-range','Premium','Luxury') DEFAULT 'Mid-range',
    reservation_url VARCHAR(255),
    menu_url VARCHAR(255),
    has_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    has_takeaway BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_restaurant_details_object FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE
);

CREATE TABLE object_services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    object_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_object_services_object FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE
);

CREATE TABLE amenities (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50)
);

CREATE TABLE object_amenities (
    object_id INT NOT NULL,
    amenity_id INT NOT NULL,
    PRIMARY KEY (object_id, amenity_id),
    CONSTRAINT fk_object_amenities_object FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE,
    CONSTRAINT fk_object_amenities_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(amenity_id) ON DELETE CASCADE
);

CREATE TABLE activities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT
);

CREATE TABLE object_activities (
    object_id INT NOT NULL,
    activity_id INT NOT NULL,
    PRIMARY KEY (object_id, activity_id),
    CONSTRAINT fk_object_activities_object FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE,
    CONSTRAINT fk_object_activities_activity FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE
);

CREATE TABLE object_media (
    media_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('destination', 'object', 'event', 'route') NOT NULL,
    entity_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    caption VARCHAR(255),
    media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. DOGADJAJI
-- =========================================================

CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NULL,
    object_id INT NULL,
    organization_id INT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    ticket_url VARCHAR(255),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    avg_rating DECIMAL(3,2) NULL DEFAULT NULL,
    status ENUM('draft','published','cancelled','archived') NOT NULL DEFAULT 'published',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_destination FOREIGN KEY (destination_id) REFERENCES destinations(destination_id),
    CONSTRAINT fk_events_object FOREIGN KEY (object_id) REFERENCES objects(object_id),
    CONSTRAINT fk_events_organization FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT chk_events_date CHECK (end_at >= start_at),
    CONSTRAINT chk_events_location CHECK (destination_id IS NOT NULL OR object_id IS NOT NULL)
);

-- =========================================================
-- 5. RUTE
-- =========================================================

CREATE TABLE routes (
    route_id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    route_type ENUM('Walking','Hiking','Cycling','Driving','Boat','Other') NOT NULL,
    difficulty ENUM('Easy','Medium','Hard') NOT NULL,
    distance_km DECIMAL(6,2) NOT NULL,
    duration_min INT NOT NULL,
    elevation_gain_m INT DEFAULT 0,
    description TEXT,
    start_latitude DECIMAL(10,7) NOT NULL,
    start_longitude DECIMAL(10,7) NOT NULL,
    end_latitude DECIMAL(10,7) NOT NULL,
    end_longitude DECIMAL(10,7) NOT NULL,
    geometry TEXT NULL,
    avg_rating DECIMAL(3,2) NULL DEFAULT NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_routes_destination FOREIGN KEY (destination_id) REFERENCES destinations(destination_id),
    CONSTRAINT fk_routes_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE route_waypoints (
    waypoint_id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    sequence_order INT NOT NULL,
    CONSTRAINT fk_route_waypoints_route FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
    UNIQUE KEY uq_route_waypoint_order (route_id, sequence_order)
);

-- =========================================================
-- 6. RECENZIJE, ANALITIKA, RECOMMENDATION
-- =========================================================

CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    object_id INT NULL,
    event_id INT NULL,
    route_id INT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_reviews_object FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_route FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_target CHECK (
        (object_id IS NOT NULL AND event_id IS NULL AND route_id IS NULL) OR
        (object_id IS NULL AND event_id IS NOT NULL AND route_id IS NULL) OR
        (object_id IS NULL AND event_id IS NULL AND route_id IS NOT NULL)
    )
);

CREATE TABLE interactions (
    interaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(120) NULL,
    entity_type ENUM('destination', 'object', 'event', 'route') NOT NULL,
    entity_id INT NOT NULL,
    action_type ENUM('view', 'click', 'search', 'favorite', 'share') NOT NULL,
    device_type VARCHAR(30),
    language_code VARCHAR(10),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interactions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE recommendations (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(120) NULL,
    entity_type ENUM('destination', 'object', 'event', 'route') NOT NULL,
    entity_id INT NOT NULL,
    reason_text VARCHAR(255),
    score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- =========================================================
-- 7. INDEKSI
-- =========================================================

CREATE INDEX idx_destinations_type ON destinations(type);
CREATE INDEX idx_destinations_city ON destinations(city);
CREATE INDEX idx_objects_category ON objects(category);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_routes_difficulty ON routes(difficulty);
CREATE INDEX idx_route_waypoints_route ON route_waypoints(route_id);
CREATE INDEX idx_media_entity ON object_media(entity_type, entity_id);
CREATE INDEX idx_interactions_entity ON interactions(entity_type, entity_id);
CREATE INDEX idx_recommendations_entity ON recommendations(entity_type, entity_id);
CREATE INDEX idx_object_services_object ON object_services(object_id);

-- =========================================================
-- 8. POCETNI PODACI
-- =========================================================

INSERT INTO roles (role_name, description) VALUES
('Admin', 'Administrator sistema sa punim pristupom'),
('Organization', 'Organizacija koja upravlja svojim događajima i sadržajem');

INSERT INTO organizations (name, description, contact_email, phone, website) VALUES
('Nacionalna turistička organizacija Crne Gore', 'Centralna turistička organizacija za promociju destinacija i događaja.', 'info@montenegro.travel', '+38220111222', 'https://www.montenegro.travel'),
('Adventure Montenegro', 'Organizacija fokusirana na outdoor aktivnosti i planinarske ture.', 'contact@adventure.me', '+38269123456', 'https://www.adventure.me'),
('Budva Events', 'Organizacija kulturnih i zabavnih manifestacija u Budvi.', 'events@budva.me', '+38267111222', 'https://www.budva-events.me');

INSERT INTO users (role_id, organization_id, full_name, email, password_hash, is_active) VALUES
(1, NULL, 'Glavni Administrator', 'admin@tourism.me', '$2a$12$admin_demo_hash', TRUE),
(2, 2, 'Outdoor Menadzer', 'outdoor@tourism.me', '$2a$12$org_demo_hash', TRUE),
(2, 3, 'Event Menadzer', 'events@tourism.me', '$2a$12$event_demo_hash', TRUE);

INSERT INTO destinations (name, type, description, city, region, status, is_active, latitude, longitude, created_by) VALUES
('Budva Stari Grad', 'City', 'Istorijsko jezgro Budve sa plazama, restoranima i kulturnim sadrzajima.', 'Budva', 'Primorje', 'published', TRUE, 42.2783000, 18.8375000, 1),
('Nacionalni park Durmitor', 'NationalPark', 'Planinski masiv, pesacke rute i prirodne atrakcije.', 'Zabljak', 'Sever', 'published', TRUE, 43.1312000, 19.0919000, 1),
('Kotor Stari Grad', 'City', 'UNESCO zasticena istorijska celina sa bogatom kulturnom ponudom.', 'Kotor', 'Boka Kotorska', 'published', TRUE, 42.4247000, 18.7712000, 1),
('Skadarsko jezero', 'Lake', 'Prirodni rezervat, voznje camcem i posmatranje ptica.', 'Virpazar', 'Centralni region', 'published', TRUE, 42.2461000, 19.0922000, 1),
('Herceg Novi', 'City', 'Primorski grad poznat po setalistu, tvrdjavama i wellness ponudi.', 'Herceg Novi', 'Primorje', 'published', TRUE, 42.4531000, 18.5315000, 1),
('Podgorica', 'City', 'Glavni grad sa sportskim i lifestyle sadrzajima.', 'Podgorica', 'Centralni region', 'published', TRUE, 42.4304000, 19.2594000, 1);

INSERT INTO objects (destination_id, name, category, description, address, latitude, longitude, phone, email, website, working_hours, avg_rating, status, is_active, created_by) VALUES
(1, 'Mogren Beach', 'Beach', 'Popularna plaza u blizini Starog grada Budve.', 'Mogren, Budva', 42.2759000, 18.8326000, '+38233440111', NULL, 'https://www.budva.travel', '08:00-20:00', 4.80, 'published', TRUE, 1),
(1, 'Jadran Restaurant', 'Restaurant', 'Mediteranska kuhinja i pogled na more.', 'Slovenska obala, Budva', 42.2861000, 18.8407000, '+38233440222', 'info@jadranbudva.me', 'https://www.jadranbudva.me', '09:00-23:00', 4.60, 'published', TRUE, 1),
(2, 'Crno jezero', 'NaturalAttraction', 'Jedna od najpoznatijih prirodnih atrakcija Durmitora.', 'Zabljak', 43.1465000, 19.0936000, NULL, NULL, 'https://www.nparkovi.me', '00:00-24:00', 4.90, 'published', TRUE, 1),
(2, 'Durmitor Adventure Camp', 'Accommodation', 'Kamp za ljubitelje prirode i planinarenja.', 'Zabljak bb', 43.1521000, 19.0968000, '+38252361234', 'stay@durmitorcamp.me', 'https://www.durmitorcamp.me', '00:00-24:00', 4.50, 'published', TRUE, 2),
(3, 'Kotor Fortress', 'Monument', 'Istorijska tvrdjava sa panoramskim pogledom na Boku.', 'Kotor', 42.4292000, 18.7739000, NULL, NULL, 'https://www.kotor.me', '07:00-19:00', 4.70, 'published', TRUE, 1),
(4, 'Lake View Boat Tours', 'TourService', 'Organizovane voznje camcem po Skadarskom jezeru.', 'Virpazar', 42.2468000, 19.0911000, '+38267111999', 'info@skadarlake.me', 'https://www.skadarlake.me', '08:00-18:00', 4.40, 'published', TRUE, 1),
(5, 'Lavish Spa', 'Spa', 'Wellness i spa centar sa luksuznim tretmanima.', 'Herceg Novi', 42.4545000, 18.5350000, '+38267333000', 'spa@lavish.me', 'https://www.lavishspa.me', '09:00-22:00', 4.80, 'published', TRUE, 1),
(6, 'Podgorica Gym & Fitness', 'Fitness', 'Moderan gym centar sa grupnim i individualnim treninzima.', 'Podgorica Centar', 42.4370000, 19.2660000, '+38267888000', 'fit@pggym.me', 'https://www.pggym.me', '07:00-23:00', 4.50, 'published', TRUE, 1),
(3, 'Apartman 1', 'Accommodation', 'Moderan apartman sa pogledom na zaliv.', 'Kotor', 42.4258000, 18.7705000, '+38268123456', 'apartman1@stay.me', 'https://www.booking.com/apartman1', '00:00-24:00', 4.70, 'published', TRUE, 1),
(3, 'Konoba Scala Santa', 'Restaurant', 'Tradicionalni ambijent i lokalni specijaliteti.', 'Kotor Stari Grad', 42.4253000, 18.7718000, '+38267111000', 'scala@restaurant.me', 'https://www.scalasanta.me', '10:00-23:30', 4.80, 'published', TRUE, 1);

INSERT INTO accommodation_details (object_id, accommodation_type, price_per_night, currency, guest_capacity, room_count, bed_count, bathroom_count, check_in_time, check_out_time, owner_name, owner_phone, booking_url, airbnb_url) VALUES
(4, 'Camp', 35.00, 'EUR', 2, 1, 2, 1, '14:00:00', '10:00:00', 'Adventure Montenegro', '+38252361234', 'https://www.booking.com/durmitorcamp', NULL),
(9, 'Apartment', 80.00, 'EUR', 4, 2, 3, 1, '14:00:00', '11:00:00', 'Marko Jovanovic', '+38268123456', 'https://www.booking.com/apartman1', 'https://www.airbnb.com/apartman1');

INSERT INTO restaurant_details (object_id, cuisine_type, price_range, reservation_url, menu_url, has_delivery, has_takeaway) VALUES
(2, 'Mediterranean', 'Premium', 'https://www.jadranbudva.me/reserve', 'https://www.jadranbudva.me/menu', FALSE, TRUE),
(10, 'Montenegrin', 'Premium', 'https://www.scalasanta.me/reserve', 'https://www.scalasanta.me/menu', FALSE, FALSE);

INSERT INTO object_services (object_id, name, description, price, currency, sort_order) VALUES
(7, 'Swedish Massage', 'Relaksirajuci tretman celog tela.', 35.00, 'EUR', 1),
(7, 'Aromatherapy Massage', 'Masaza sa etericnim uljima.', 45.00, 'EUR', 2),
(7, 'Hot Stone Massage', 'Tretman vrucim kamenjem.', 48.00, 'EUR', 3),
(8, 'Monthly Membership', 'Mesecna teretana bez ogranicenja.', 45.00, 'EUR', 1),
(8, 'Personal Training Session', 'Individualni trening sa trenerom.', 25.00, 'EUR', 2),
(8, 'Group Fitness Class', 'Grupni funkcionalni trening.', 8.00, 'EUR', 3);

INSERT INTO amenities (name, category) VALUES
('WiFi', 'General'),
('Parking', 'General'),
('Air Conditioning', 'Accommodation'),
('Pool', 'Accommodation'),
('Pet Friendly', 'Accommodation'),
('Breakfast Included', 'Accommodation'),
('Sea View', 'Accommodation'),
('Gym', 'Lifestyle'),
('Spa', 'Lifestyle'),
('Reservation Available', 'Food'),
('Card Payment', 'Food'),
('Family Friendly', 'General');

INSERT INTO object_amenities (object_id, amenity_id) VALUES
(4, 1), (4, 2), (4, 5),
(9, 1), (9, 2), (9, 3), (9, 7),
(2, 10), (2, 11), (2, 12),
(10, 10), (10, 11),
(7, 1), (7, 9),
(8, 1), (8, 8);

INSERT INTO activities (name, category, description) VALUES
('Planinarenje', 'Sport', 'Pesacke i planinarske aktivnosti na otvorenom.'),
('Plivanje', 'Sport', 'Kupanje i rekreativno plivanje.'),
('Razgledanje', 'Tourism', 'Obilazak kulturnih i prirodnih atrakcija.'),
('Shopping', 'Commerce', 'Kupovina suvenira i drugih proizvoda.'),
('Voznja camcem', 'Tourism', 'Ture i voznje po jezerima i zalivima.'),
('Wellness', 'Lifestyle', 'Spa i relaks tretmani.'),
('Fitness', 'Lifestyle', 'Teretana i trening aktivnosti.');

INSERT INTO object_activities (object_id, activity_id) VALUES
(1, 2), (1, 3),
(2, 3),
(3, 1), (3, 3),
(4, 1),
(5, 1), (5, 3),
(6, 5),
(7, 6),
(8, 7);

INSERT INTO events (destination_id, object_id, organization_id, name, category, description, start_at, end_at, ticket_url, latitude, longitude, avg_rating, status, is_active, created_by) VALUES
(1, NULL, 3, 'Sea Dance Festival', 'Concert', 'Veliki letnji festival na otvorenom.', '2026-07-15 20:00:00', '2026-07-15 23:30:00', 'https://tickets.example.com/sea-dance', 42.2790000, 18.8385000, 4.80, 'published', TRUE, 3),
(3, 5, 1, 'Kotor Fortress Guided Tour', 'Tour', 'Vodjena tura kroz tvrdjavu i istoriju Kotora.', '2026-06-20 10:00:00', '2026-06-20 12:00:00', 'https://tickets.example.com/kotor-fortress-tour', 42.4292000, 18.7739000, 4.60, 'published', TRUE, 1),
(4, 6, 1, 'Birdwatching on Skadar Lake', 'Excursion', 'Jutarnja voznja camcem i posmatranje ptica.', '2026-05-10 07:00:00', '2026-05-10 10:00:00', 'https://tickets.example.com/skadar-birds', 42.2468000, 19.0911000, 4.70, 'published', TRUE, 1);

INSERT INTO routes (destination_id, name, route_type, difficulty, distance_km, duration_min, elevation_gain_m, description, start_latitude, start_longitude, end_latitude, end_longitude, geometry, avg_rating, status, is_active, created_by) VALUES
(2, 'Crno Jezero - Vidikovac', 'Walking', 'Easy', 4.80, 110, 180, 'Lagana panoramska ruta pogodna za vecinu turista.', 43.1465000, 19.0936000, 43.1541000, 19.1015000, '{"type":"LineString","coordinates":[[19.0936,43.1465],[19.0962,43.1494],[19.1015,43.1541]]}', 4.60, 'published', TRUE, 2),
(2, 'Durmitor Summit Trail', 'Hiking', 'Hard', 12.60, 360, 920, 'Zahtevna ruta za iskusne planinare.', 43.1521000, 19.0968000, 43.1400000, 19.0700000, '{"type":"LineString","coordinates":[[19.0968,43.1521],[19.0850,43.1475],[19.0700,43.1400]]}', 4.80, 'published', TRUE, 2),
(4, 'Skadar Lake Panorama Ride', 'Cycling', 'Medium', 18.30, 140, 220, 'Ruta oko jezera sa lepim pogledima i odmoristima.', 42.2461000, 19.0922000, 42.2605000, 19.1200000, '{"type":"LineString","coordinates":[[19.0922,42.2461],[19.1050,42.2520],[19.1200,42.2605]]}', 4.40, 'published', TRUE, 1),
(3, 'Kotor Old Town Walk', 'Walking', 'Easy', 2.20, 50, 60, 'Kratka pesacka ruta kroz Stari grad i okolinu.', 42.4247000, 18.7712000, 42.4292000, 18.7739000, '{"type":"LineString","coordinates":[[18.7712,42.4247],[18.7725,42.4260],[18.7739,42.4292]]}', 4.50, 'published', TRUE, 1);

INSERT INTO route_waypoints (route_id, latitude, longitude, sequence_order) VALUES
(1, 43.1465000, 19.0936000, 1),
(1, 43.1494000, 19.0962000, 2),
(1, 43.1541000, 19.1015000, 3),
(2, 43.1521000, 19.0968000, 1),
(2, 43.1475000, 19.0850000, 2),
(2, 43.1400000, 19.0700000, 3),
(3, 42.2461000, 19.0922000, 1),
(3, 42.2520000, 19.1050000, 2),
(3, 42.2605000, 19.1200000, 3),
(4, 42.4247000, 18.7712000, 1),
(4, 42.4260000, 18.7725000, 2),
(4, 42.4292000, 18.7739000, 3);

INSERT INTO object_media (entity_type, entity_id, url, caption, media_type, sort_order) VALUES
('destination', 1, 'https://example.com/media/budva-1.jpg', 'Budva Stari Grad', 'image', 1),
('destination', 2, 'https://example.com/media/durmitor-1.jpg', 'Durmitor panorama', 'image', 1),
('object', 1, 'https://example.com/media/mogren-1.jpg', 'Mogren Beach', 'image', 1),
('object', 2, 'https://example.com/media/jadran-1.jpg', 'Jadran Restaurant', 'image', 1),
('object', 7, 'https://example.com/media/lavish-spa-1.jpg', 'Lavish Spa', 'image', 1),
('object', 8, 'https://example.com/media/pg-gym-1.jpg', 'Podgorica Gym & Fitness', 'image', 1),
('object', 9, 'https://example.com/media/apartman-1.jpg', 'Apartman 1', 'image', 1),
('object', 10, 'https://example.com/media/scala-santa-1.jpg', 'Konoba Scala Santa', 'image', 1),
('event', 1, 'https://example.com/media/sea-dance.jpg', 'Sea Dance Festival poster', 'image', 1),
('route', 1, 'https://example.com/media/route-vidikovac.jpg', 'Crno Jezero - Vidikovac ruta', 'image', 1);

INSERT INTO reviews (user_id, object_id, event_id, route_id, rating, comment, status) VALUES
(NULL, 1, NULL, NULL, 5, 'Prelepa plaza i odlican pogled.', 'approved'),
(NULL, 2, NULL, NULL, 4, 'Odlicna hrana i prijatna atmosfera.', 'approved'),
(NULL, 7, NULL, NULL, 5, 'Odlican spa centar i prijatno osoblje.', 'approved'),
(NULL, 8, NULL, NULL, 4, 'Dobra oprema i cisto okruzenje.', 'approved'),
(NULL, NULL, 1, NULL, 5, 'Sjajan festival i odlicna atmosfera.', 'approved'),
(NULL, NULL, NULL, 1, 4, 'Ruta je laka i pogodna za porodice.', 'approved');

INSERT INTO interactions (user_id, session_id, entity_type, entity_id, action_type, device_type, language_code) VALUES
(NULL, 'sess-tourist-001', 'destination', 1, 'view', 'mobile', 'sr'),
(NULL, 'sess-tourist-001', 'object', 1, 'click', 'mobile', 'sr'),
(NULL, 'sess-tourist-002', 'route', 1, 'view', 'mobile', 'en'),
(NULL, 'sess-tourist-003', 'object', 9, 'view', 'mobile', 'en'),
(1, NULL, 'event', 1, 'favorite', 'desktop', 'sr'),
(2, NULL, 'route', 2, 'share', 'desktop', 'en');

INSERT INTO recommendations (user_id, session_id, entity_type, entity_id, reason_text, score) VALUES
(NULL, 'sess-tourist-001', 'object', 2, 'Preporuceno jer je blizu lokacije korisnika i slicno prethodno pregledanom sadrzaju.', 92.50),
(NULL, 'sess-tourist-002', 'route', 1, 'Preporuceno jer korisnik preferira lake pesacke rute.', 95.00),
(NULL, 'sess-tourist-003', 'object', 9, 'Preporucen smestaj sa dobrim ocenama i trazenim pogodnostima.', 90.00),
(1, NULL, 'destination', 3, 'Preporuceno na osnovu interesovanja za kulturne atrakcije.', 88.40),
(2, NULL, 'route', 2, 'Preporuceno za korisnike zainteresovane za planinarenje.', 81.75);
