-- Pokrenuti kao root na MySQL serveru (port 3306)
-- U MySQL terminalu:
-- mysql -u root -p < database/init.sql

CREATE DATABASE IF NOT EXISTS recipe_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
 
USE recipe_db;
 
CREATE TABLE IF NOT EXISTS Recepti (
    Id        INT AUTO_INCREMENT PRIMARY KEY,
    Naziv     VARCHAR(100) NOT NULL,
    Opis      TEXT         NOT NULL,
    Sastojci  TEXT         NOT NULL,
    Koraci    TEXT         NOT NULL,
    Kreirano  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Podaci
INSERT INTO Recepti (Naziv, Opis, Sastojci, Koraci) VALUES
(
    'Spaghetti Carbonara',
    'Klasicna italijanska pasta sa jajima i slaninom.',
    '200g spaghetti, 100g panceta, 2 jaja, 50g parmezan, so, biber',
    '1. Skuvaj pastu. 2. Ispeci pancetu. 3. Pomesaj jaja i parmezan. 4. Spoji sve zajedno.'
),
(
    'Pileca supa',
    'Domaca pileca supa, idealna za hladne dane.',
    '1 pile, 2 sargarepe, 1 celer, 1 crni luk, so, biber, persun',
    '1. Stavi pile u vodu. 2. Dodaj povrce. 3. Kuvaj 1.5h. 4. Zacini i pospi persunom.'
),
(
    'Palacinke',
    'Tanke palacinke sa dzemom ili Nutellom.',
    '2 jaja, 250ml mleko, 100g brašno, 1 kasika secera, ulje',
    '1. Pomesaj sve sastojke. 2. Ostavi 15 min. 3. Peci na ulju sa obe strane.'
);