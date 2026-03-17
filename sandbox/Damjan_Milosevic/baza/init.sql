CREATE DATABASE IF NOT EXISTS lokacije;
USE lokacije;


CREATE TABLE Categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);


INSERT INTO Categories (id, name) VALUES
(1, 'Restaurant'),
(2, 'Museum'),
(3, 'Park'),
(4, 'Cafe'),
(5, 'Viewpoint');

CREATE TABLE Locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category_id INT,
    city VARCHAR(100),
    rating FLOAT,
    latitude DOUBLE,
    longitude DOUBLE,

    CONSTRAINT fk_category
        FOREIGN KEY (category_id)
        REFERENCES Categories(id)
        ON DELETE SET NULL
);



INSERT INTO Locations 
(name, description, category_id, city, rating, latitude, longitude) VALUES

-- RESTAURANTS (1)
('Tri šešira', 'Tradicionalni restoran u Skadarliji', 1, 'Beograd', 4.6, 44.8170, 20.4600),
('Restoran Kovač', 'Poznat restoran domaće kuhinje', 1, 'Beograd', 4.5, 44.8500, 20.4000),
('Fish & Zelenish', 'Moderan restoran u centru', 1, 'Novi Sad', 4.7, 45.2550, 19.8450),

-- MUSEUMS (2)
('Narodni muzej', 'Glavni muzej Srbije', 2, 'Beograd', 4.7, 44.8167, 20.4600),
('Muzej Nikole Tesle', 'Posvećen Nikoli Tesli', 2, 'Beograd', 4.8, 44.8050, 20.4700),
('Muzej Vojvodine', 'Istorijski muzej', 2, 'Novi Sad', 4.6, 45.2550, 19.8450),

-- PARKS (3)
('Kalemegdan park', 'Park i tvrđava', 3, 'Beograd', 4.8, 44.8230, 20.4500),
('Tašmajdan park', 'Gradski park', 3, 'Beograd', 4.5, 44.8100, 20.4700),
('Dunavski park', 'Park u centru grada', 3, 'Novi Sad', 4.7, 45.2550, 19.8450),

-- CAFES (4)
('Kafeterija', 'Popularan lanac kafića', 4, 'Beograd', 4.5, 44.8150, 20.4600),
('Pržionica kafa', 'Specijalty coffee mesto', 4, 'Beograd', 4.6, 44.8200, 20.4600),
('Loft Cafe', 'Moderan kafić', 4, 'Novi Sad', 4.4, 45.2550, 19.8450),

-- VIEWPOINTS (5)
('Avala toranj', 'Vidikovac sa pogledom', 5, 'Beograd', 4.7, 44.6970, 20.5140),
('Gardos kula', 'Pogled na Dunav', 5, 'Beograd', 4.8, 44.8480, 20.4130),
('Petrovaradinska tvrđava pogled', 'Pogled na Novi Sad', 5, 'Novi Sad', 4.9, 45.2520, 19.8620);