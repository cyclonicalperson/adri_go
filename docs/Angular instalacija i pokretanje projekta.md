
# Angular – Instalacija i pokretanje projekta

## 1. Uvod

Angular je moderni frontend framework za razvoj web aplikacija. Razvija ga kompanija Google i koristi se za pravljenje dinamičkih aplikacija koje rade u internet pregledaču.

Angular koristi **TypeScript** i zasniva se na **komponentnoj arhitekturi**, gde se aplikacija sastoji od više manjih komponenti koje zajedno čine celinu.

U okviru ovog projekta Angular će biti korišćen za razvoj **frontend dela aplikacije** koji komunicira sa backend serverom.

---

# 2. Šta je potrebno pre instalacije

Da bi Angular mogao da radi na računaru, potrebno je instalirati nekoliko alata:

- **Visual Studio Code** – editor koda
- **Node.js** – okruženje koje omogućava rad sa JavaScript paketima
- **npm (Node Package Manager)** – alat za upravljanje paketima
- **Angular CLI** – alat za kreiranje i pokretanje Angular projekata

---

# 3. Instalacija Visual Studio Code

Visual Studio Code je jedan od najpopularnijih editora za razvoj web aplikacija.

### Koraci instalacije

1. Otvoriti zvanični sajt:

https://code.visualstudio.com/

2. Kliknuti na dugme **Download for Windows** (ili verziju za vaš operativni sistem).

3. Pokrenuti instalacioni fajl.

4. Tokom instalacije preporučuje se da uključite sledeće opcije:

- Add to PATH
- Add "Open with Code" option

5. Završiti instalaciju.

Nakon instalacije pokrenuti **Visual Studio Code**.

---

# 4. Instalacija Node.js

Angular zahteva Node.js okruženje za upravljanje paketima i pokretanje aplikacije.

### Koraci instalacije

1. Otvoriti zvanični sajt:

https://nodejs.org

2. Preuzeti **LTS verziju** (Long Term Support).

3. Pokrenuti instalacioni fajl.

4. Prihvatiti podrazumevana podešavanja tokom instalacije.

---

# 5. Provera instalacije Node.js i npm

Nakon instalacije potrebno je proveriti da li su Node.js i npm pravilno instalirani.

Otvoriti terminal ili Command Prompt i pokrenuti:

```bash
node -v
npm -v
```

Ako je instalacija uspešna, prikazaće se verzije instaliranog softvera.

---

# 6. Instalacija Angular CLI

Angular CLI (Command Line Interface) je alat koji omogućava:

- kreiranje Angular projekata
- pokretanje aplikacije
- generisanje komponenti
- buildovanje aplikacije

Instalacija Angular CLI alata vrši se pomoću sledeće komande:

```bash
npm install -g @angular/cli
```

Opcija **-g** označava globalnu instalaciju.

---

# 7. Provera Angular CLI instalacije

Nakon instalacije proveriti da li Angular CLI radi:

```bash
ng version
```

Ako je instalacija uspešna, prikazaće se informacije o Angular verziji.

---

# 8. Kreiranje novog Angular projekta

Novi Angular projekat kreira se pomoću komande:

```bash
ng new demo-angular-projekat
```

Tokom kreiranja projekta Angular CLI će postaviti nekoliko pitanja.

### Routing

Angular CLI će pitati:

Would you like to add Angular routing?

Preporučeni odgovor:

Yes

### Stilovi

Angular CLI će pitati koji format stilova želite:

- CSS
- SCSS
- Sass
- Less

Za početnike se preporučuje **CSS**.

---

# 9. Struktura Angular projekta

Nakon kreiranja projekta dobićemo sledeću strukturu:

demo-angular-projekat

src/
app/
assets/
index.html
main.ts

angular.json
package.json

Najvažniji folderi:

### src/
Sadrži izvorni kod aplikacije.

### app/
Sadrži Angular komponente.

### assets/
Sadrži statičke fajlove poput slika.

### package.json
Sadrži listu biblioteka koje projekat koristi.

---

# 10. Pokretanje Angular aplikacije

Prvo ući u folder projekta:

```bash
cd demo-angular-projekat
```

Zatim pokrenuti aplikaciju:

```bash
ng serve
```

Alternativno:

```bash
ng serve -o
```

Opcija **-o** automatski otvara browser.

---

# 11. Pokretanje aplikacije u browseru

Kada se aplikacija pokrene, dostupna je na adresi:

http://localhost:4200

Otvaranjem ove adrese prikazuje se početna Angular stranica.

---

# 12. Kreiranje nove komponente

Angular aplikacije se zasnivaju na komponentama.

Nova komponenta se može napraviti pomoću komande:

```bash
ng generate component primer
```

ili skraćeno:

```bash
ng g c primer
```

Angular CLI će automatski kreirati potrebne fajlove za komponentu.

---

# 13. Najčešće Angular CLI komande

| Komanda | Opis |
|--------|------|
| ng new | kreiranje novog projekta |
| ng serve | pokretanje aplikacije |
| ng generate component | kreiranje komponente |
| ng build | build aplikacije |
| ng version | prikaz verzije Angular alata |

---

# 14. Zaključak

Angular je moćan alat za razvoj modernih web aplikacija.

U ovom dokumentu prikazani su koraci za:

- instalaciju Visual Studio Code editora
- instalaciju Node.js okruženja
- instalaciju Angular CLI alata
- kreiranje novog Angular projekta
- pokretanje aplikacije

Nakon ovih koraka korisnik može započeti razvoj Angular aplikacija i dalje istraživati funkcionalnosti ovog framework-a.