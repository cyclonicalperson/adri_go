# MCP Server -- Pregled i Vodič za Korišćenje

## 1. Šta je MCP (Model Context Protocol)

MCP (Model Context Protocol) je standard koji omogućava AI asistentima
da komuniciraju sa alatima, aplikacijama i podacima izvan samog chat
okruženja.

Bez MCP-a, AI može samo da generiše tekstualne odgovore na osnovu
informacija koje već ima.

Sa MCP-om, AI može: - čitati lokalne fajlove - pristupati bazama
podataka - pozivati API servise - izvršavati funkcije u aplikacijama -
pretraživati foldere i dokumente

MCP server predstavlja most između AI modela i spoljnog sistema koji
sadrži podatke ili funkcije.

------------------------------------------------------------------------

## 2. Osnovna arhitektura MCP sistema

MCP sistem se sastoji iz tri glavne komponente:

### AI Host (klijent)

Aplikacija u kojoj korisnik komunicira sa AI modelom.

Primeri: - Claude Desktop - Cursor - Zed - Cline

### MCP Server

Program koji izvršava zahteve koje AI šalje. On: - pristupa podacima -
pokreće funkcije - komunicira sa spoljnim servisima

### Resursi i alati

Podaci ili funkcije kojima AI može pristupiti preko servera: - fajlovi -
baze podataka - API servisi - aplikacije

------------------------------------------------------------------------

## 3. Kako MCP funkcioniše -- tok izvršavanja

1.  Korisnik postavi pitanje AI‑ju\
2.  AI analizira zahtev i odlučuje da li mu treba alat\
3.  AI šalje zahtev MCP serveru\
4.  MCP server izvršava operaciju\
5.  Server vraća rezultat AI‑ju\
6.  AI formira odgovor za korisnika

**Primer:**

Korisnik pita:
Prikaži podatke o studentu Marko.

AI prepoznaje da mora da pristupi bazi podataka i poziva alat na MCP
serveru koji izvršava SQL upit i vraća rezultat.

------------------------------------------------------------------------

## 4. Osnovni koncepti MCP protokola

MCP definiše tri osnovne vrste objekata.

### Tools (Alati)

Funkcije koje AI može da pokrene.

Primer:

    getStudent(name)

AI pokreće ovaj alat i server vraća rezultat.

### Resources (Resursi)

Podaci koje AI može da čita.

Primer:

    file://students.csv

AI može otvoriti fajl i analizirati sadržaj.

### Prompts

Unapred definisani prompt šabloni koji pomažu AI‑ju da izvrši određeni
zadatak.

Primer:

    generate-report

------------------------------------------------------------------------

## 5. Komunikacija između AI i MCP servera

Komunikacija između AI hosta i MCP servera najčešće se odvija preko
**JSON‑RPC protokola**.

Zahtevi i odgovori razmenjuju se u JSON formatu.

Primer zahteva:

``` json
{
  "method": "tools/call",
  "params": {
    "name": "getStudent",
    "arguments": { "name": "Marko" }
  }
}
```

Server izvršava funkciju i vraća rezultat u JSON formatu.

------------------------------------------------------------------------

## 6. Kada koristiti MCP server

MCP server je koristan kada AI treba da pristupi realnim podacima ili
izvršava operacije.

Najčešći scenariji:

### Pristup fajlovima

AI može analizirati dokumente ili pretraživati tekst.

### Rad sa bazama podataka

AI može generisati SQL upite i vraćati rezultate.

### Korišćenje API servisa

AI može komunicirati sa servisima kao što su: - GitHub - Slack - Google
Drive

### Automatizacija zadataka

AI može pokretati funkcije unutar aplikacije:

-   kreiranje korisnika
-   slanje email‑a
-   generisanje izveštaja

------------------------------------------------------------------------

## 7. Instalacija i priprema okruženja

Za pokretanje MCP servera potrebni su sledeći alati:

### Node.js (LTS)

Okruženje za pokretanje JavaScript/TypeScript aplikacija.

### Git

Alat za preuzimanje projekata sa GitHub‑a.

### AI Host aplikacija

Program koji omogućava komunikaciju sa AI modelom i MCP serverom.

------------------------------------------------------------------------

## 8. Provera instalacije

U terminalu pokrenite:

    node -v
    git --version

Ako se prikažu verzije, alati su uspešno instalirani.

------------------------------------------------------------------------

## 9. Instalacija gotovog MCP servera

Gotovi MCP serveri se najčešće preuzimaju sa GitHub‑a.

Primer instalacije:

    git clone <repozitorijum>
    cd ime-projekta
    npm install
    npm run build
    node dist/index.js

Nakon pokretanja server je spreman za komunikaciju sa AI aplikacijom.

------------------------------------------------------------------------

## 10. Kreiranje sopstvenog MCP servera

Kreiranje novog servera:

    npx @modelcontextprotocol/create-server moj-mcp-server
    cd moj-mcp-server
    npm install

Dodavanje alata:

``` javascript
server.tool(
  "getStudent",
  "Pronalazi podatke o studentu",
  async ({ name }) => {
    return {
      content: [
        { type: "text", text: `Student ${name} je pronađen u bazi.` }
      ]
    };
  }
);
```

Build i pokretanje:

    npm run build
    node dist/index.js

------------------------------------------------------------------------

## 11. Struktura MCP server projekta

Tipična struktura projekta:

    server/
      index.ts
      tools/
      resources/
      prompts/

    package.json
    tsconfig.json

Ova struktura omogućava lakše održavanje i dodavanje novih funkcija.

------------------------------------------------------------------------

## 12. Konfiguracija MCP servera u AI aplikaciji

AI host mora znati kako da pokrene server.

Primer konfiguracije:

``` json
{
  "mcpServers": {
    "student-server": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

------------------------------------------------------------------------

## 13. Bezbednost MCP servera

Pošto MCP server može imati pristup lokalnim podacima, potrebno je
voditi računa o bezbednosti.

Preporuke:

-   ograničiti pristup fajlovima
-   koristiti API ključeve
-   kontrolisati koje funkcije AI može pokretati

------------------------------------------------------------------------

## 14. Prednosti MCP arhitekture

**Modularnost** -- moguće je koristiti više servera za različite zadatke

**Privatnost** -- podaci mogu ostati na lokalnom računaru

**Proširivost** -- lako je dodavati nove alate i funkcije

**Standardizacija** -- različite AI aplikacije mogu koristiti iste MCP
servere

------------------------------------------------------------------------

## 15. Zaključak

MCP server omogućava AI sistemima da rade sa realnim podacima i alatima.

Umesto ručnog kopiranja informacija u chat, MCP omogućava direktnu
komunikaciju između AI modela i sistema koji sadrže podatke.

Zahvaljujući modularnoj arhitekturi, MCP predstavlja važan korak u
razvoju AI aplikacija koje mogu izvršavati kompleksne zadatke u realnim
sistemima.

---

## Zašto je MCP izabran za projekat

MCP je izabran jer omogućava AI modelima da komuniciraju sa spoljnim
alatima i podacima. U ovom projektu MCP omogućava povezivanje AI
asistenta sa aplikacijom i bazom podataka, čime se omogućava
automatizovano izvršavanje funkcija i pristup realnim podacima.