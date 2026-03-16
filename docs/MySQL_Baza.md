MySQL – Osnove rada sa bazom podataka
1. Šta je MySQL

MySQL je jedan od najpopularnijih open-source sistema za upravljanje relacionim bazama podataka (RDBMS).

Njegova glavna funkcija je čuvanje, organizovanje i upravljanje velikim količinama podataka na efikasan i siguran način.

MySQL koristi standardni jezik za rad sa bazama podataka –
SQL (Structured Query Language).

SQL omogućava:

definisanje strukture baze podataka

dodavanje novih podataka

izmenu postojećih podataka

pretragu i filtriranje podataka

brisanje podataka

Podaci u MySQL-u su organizovani u tabele koje se sastoje od:

redova (rows) – pojedinačni zapisi

kolona (columns) – atributi zapisa

Relacione baze podataka omogućavaju povezivanje tabela pomoću ključeva (keys), čime se izbegava dupliranje podataka i omogućava efikasnije upravljanje informacijama.

2. Zašto je izabran MySQL

MySQL je izabran zbog više važnih karakteristika:

Pouzdanost

MySQL je stabilan i dugo prisutan u industriji. Koriste ga velike kompanije poput
Facebook i YouTube za obradu ogromnih količina podataka.

Performanse

MySQL je optimizovan za brzo čitanje podataka i može efikasno da radi sa velikim brojem korisnika istovremeno.

Kompatibilnost

Odlično se integriše sa različitim programskim jezicima i framework-ovima kao što su:

Node.js

Python

PHP

Entity Framework

To omogućava jednostavno povezivanje baze sa web aplikacijama i softverskim sistemima.

Velika zajednica

Pošto je MySQL veoma popularan, postoji veliki broj tutorijala, dokumentacije i primera, što znatno olakšava učenje i rešavanje problema.

3. Instalacija alata i okruženja

Za rad sa MySQL bazom potrebne su dve glavne komponente:

1. Server

Server je program koji čuva bazu podataka i upravlja pristupom podacima.

Najčešće se koristi:

MySQL Community Server – zvanična besplatna verzija MySQL-a.

Alternativno rešenje za lokalni razvoj:

XAMPP – paket koji sadrži MySQL, Apache i PHP.

Docker – omogućava pokretanje MySQL-a u kontejneru.

2. Klijent (Client)

Klijent je alat pomoću kojeg upravljamo bazom podataka.

Najčešće korišćen alat je:

MySQL Workbench

MySQL Workbench omogućava:

grafičko kreiranje tabela

pisanje SQL upita

pregled podataka

administraciju baze

Važna napomena tokom instalacije

Tokom instalacije potrebno je definisati root lozinku.

Root korisnik je glavni administrator baze podataka i ima pristup svim operacijama.

4. Kreiranje nove baze podataka

Nakon pokretanja MySQL Workbench-a ili terminala, nova baza podataka se kreira SQL komandom:

CREATE DATABASE ime_projekta_db;

Ova komanda pravi novu bazu podataka sa zadatim imenom.

Da bismo počeli da radimo u toj bazi, koristimo komandu:

USE ime_projekta_db;

Ova komanda govori MySQL serveru da sve naredne operacije izvršava u toj bazi.

5. Struktura osnovnog projekta

MySQL baza se sastoji od nekoliko logičkih celina:

Database (Schema)

Predstavlja kontejner koji sadrži sve tabele, indekse i druge objekte baze podataka.

Tables (Tabele)

Tabele su mesto gde se stvarni podaci čuvaju.

Primer tabela:

Korisnici

Proizvodi

Narudžbine

Columns (Kolone)

Kolone definišu tip podataka koji se čuva u tabeli.

Najčešći tipovi podataka:

INT – ceo broj

VARCHAR – tekst promenljive dužine

DATE / DATETIME – datum i vreme

BOOLEAN – logička vrednost

Indexes (Indeksi)

Indeksi su specijalne strukture podataka koje ubrzavaju pretragu u tabelama.

Bez indeksa, baza mora da pregleda svaki red u tabeli, dok indeks omogućava brže pronalaženje podataka.

6. Pokretanje i povezivanje

MySQL server obično radi kao servis u pozadini.

Podrazumevani port za MySQL je:

3306

Aplikacije se povezuju sa bazom pomoću connection string-a.

Primer:

Server=localhost; Port=3306; Database=ime_projekta_db; Uid=root; Pwd=vasa_lozinka;

Objašnjenje:

Parametar	Značenje
Server	adresa servera
Port	mrežni port
Database	ime baze
Uid	korisničko ime
Pwd	lozinka
7. Osnovne operacije u MySQL-u

Najvažnije SQL komande su:

Komanda	Opis
CREATE TABLE	Kreira novu tabelu
INSERT INTO	Dodaje nove podatke
SELECT	Čita podatke iz baze
UPDATE	Menja postojeće podatke
DELETE	Briše podatke
DROP TABLE	Briše celu tabelu

Ove operacije čine osnovu rada sa bazama podataka.

8. Primer – Jednostavna aplikacija "Korisnici"
1. Kreiranje tabele
CREATE TABLE Korisnici (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ime VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    datum_registracije TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Objašnjenje:

id – jedinstveni identifikator korisnika

AUTO_INCREMENT – automatski povećava vrednost ID-a

PRIMARY KEY – primarni ključ tabele

NOT NULL – kolona mora imati vrednost

UNIQUE – vrednost mora biti jedinstvena

DEFAULT CURRENT_TIMESTAMP – automatski postavlja trenutni datum

2. Dodavanje podataka
INSERT INTO Korisnici (ime, email) 
VALUES ('Marko Markovic', 'marko@example.com');

Ova komanda dodaje novog korisnika u tabelu.

3. Pregled podataka
SELECT * FROM Korisnici;

Ova komanda prikazuje sve podatke iz tabele Korisnici.
