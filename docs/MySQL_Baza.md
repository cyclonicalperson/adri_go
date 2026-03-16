1. MySQL je najpopularniji open-source sistem za upravljanje relacionim bazama podataka (RDBMS).
 Koristi SQL (Structured Query Language) za definisanje, manipulaciju i upite nad podacima.

Njegova namena je sigurno skladištenje informacija u strukturiranom formatu (tabele sa redovima i kolonama) koje su međusobno povezane ključevima.

---------------------------------------------------------------------------------------------------------------------------------------------

2. Izabran je zbog : Pouzdanost: Dokazan u industriji decenijama (koriste ga Facebook, YouTube, itd.).

Performanse: Izuzetno brz kod čitanja podataka i rada sa velikim brojem korisnika.

Kompatibilnost: Odlično se integriše sa .NET (Entity Framework), Node.js, Python i PHP okruženjima.

Zajednica: Ogromna baza tutorijala i rešenja za potencijalne probleme.

----------------------------------------------------------------------------------------------------------------------------------------------

3.Instalacija alata i okruženja: 

Da biste počeli sa radom, potrebne su vam dve stvari: Server (koji drži podatke) i Klijent (preko kojeg upravljate podacima).

MySQL Server: Preuzmite "MySQL Community Server" sa zvaničnog sajta.

Alternativa (Preporučeno za lokalni razvoj): XAMPP ili Docker (MySQL image).

MySQL Workbench: Grafički alat (GUI) koji olakšava rad sa tabelama i upitima.

Podešavanje: Tokom instalacije, obavezno zapamtite lozinku za root korisnika (podrazumevani administrator).

----------------------------------------------------------------------------------------------------------------------------------------------

4. Kreiranje nove baze podataka

Kada pokrenete MySQL Workbench ili terminal, novu bazu (šemu) kreirate sledećom komandom:

CREATE DATABASE ime_projekta_db;
USE ime_projekta_db;

----------------------------------------------------------------------------------------------------------------------------------------------

5. Struktura osnovnog projekta

MySQL baza se ne sastoji od fajlova koje direktno editujete, već od logičkih celina:

Database (Schema): Kontejner za sve tabele.

Tables: Gde se podaci zapravo nalaze (npr. Korisnici, Narudzbine).

Columns: Definišu tip podatka (npr. INT, VARCHAR za tekst, DATETIME).

Indexes: Specijalne strukture koje ubrzavaju pretragu.


----------------------------------------------------------------------------------------------------------------------------------------------

6. Pokretanje i povezivanje

MySQL server obično radi u pozadini kao servis na portu 3306.

Za povezivanje aplikacije sa bazom koristi se Connection String. Primer formata:
Server=localhost; Port=3306; Database=ime_projekta_db; Uid=root; Pwd=vasha_lozinka;

----------------------------------------------------------------------------------------------------------------------------------------------

7. Osnovne operacije

CREATE TABLE	Pravljenje nove tabele
INSERT INTO	Dodavanje novih podataka
SELECT * FROM	Čitanje podataka iz baze
UPDATE	Izmena postojećih podataka
DELETE	Brisanje podataka
DROP TABLE	Brisanje cele tabele


---------------------------------------------------------------------------------------------------------------------------------------------

8. Primer: Jednostavna aplikacija "Korisnici"

-- 1. Kreiranje tabele
CREATE TABLE Korisnici (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ime VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    datum_registracije TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Unos podataka
INSERT INTO Korisnici (ime, email) 
VALUES ('Marko Markovic', 'marko@example.com');

-- 3. Provera podataka
SELECT * FROM Korisnici;
