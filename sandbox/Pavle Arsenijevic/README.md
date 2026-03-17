# ReceptiAplikacija

**Uputstvo za pokretanje:**

Pokrenuti StartAplikacije.bat iz roota foldera

---

U slucaju da **.bat ne radi** (ili ne postoji tabela/SQL server):

1. Pokrenuti `database/init.sql` na MySQL serveru

2. Pokrenuti backend (sln fajl iz Backend foldera)
<br> API je dostupan na: `http://localhost:5000/api/receptkontroler`

3. Pokrenuti frontend sa 'ng serve' iz terminala koji je cd-ovan u Frontend folder

---

Aplikacija ce biti dostupna na: `http://localhost:4200`