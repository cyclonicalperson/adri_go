# Angular – Struktura projekta i osnovni koncepti

Ovaj dokument će opisati osnovnu arhitekturu Angular aplikacije i najvažnije koncepte koje svaki član tima treba da poznaje radi efikasnog razvoja frontend dela projekta

---

## Sadržaj

1. [Struktura Angular projekta](#1-struktura-angular-projekta)
2. [Komponente (Components)](#2-komponente-components)
3. [Moduli (Modules)](#3-moduli-modules)
4. [Servisi (Services)](#4-servisi-services)
5. [Routing u Angular-u](#5-routing-u-angular-u)
6. [Komunikacija sa backend API-jem](#6-komunikacija-sa-backend-api-jem)
7. [Primer jednostavne komponente](#7-primer-jednostavne-komponente)

---

## 1. Struktura Angular projekta

Kada se kreira novi Angular projekat komandom `ng new naziv-projekta`, generiše se sledeća struktura direktorijuma:

```
naziv-projekta/
├── src/
│   ├── app/
│   │   ├── app.component.ts        # Root komponenta
│   │   ├── app.component.html      # HTML šablon root komponente
│   │   ├── app.component.scss      # Stilovi root komponente
│   │   ├── app.component.spec.ts   # Unit testovi
│   │   ├── app.module.ts           # Glavni modul aplikacije
│   │   └── app-routing.module.ts   # Routing konfiguracija
│   ├── assets/                     # Statički resursi (slike, fontovi...)
│   ├── environments/               # Konfiguracija okruženja (dev/prod)
│   │   ├── environment.ts          # Kod mene se enviroments nije napravio, ali kaže da treba
│   │   └── environment.prod.ts
│   ├── index.html                  # Ulazna HTML stranica
│   ├── main.ts                     # Ulazna tačka aplikacije
│   └── styles.scss                 # Globalni stilovi
├── angular.json                    # Konfiguracija Angular CLI
├── package.json                    # Zavisnosti projekta (npm)
├── tsconfig.json                   # TypeScript konfiguracija
└── README.md
```

---

## 2. Komponente (Components)

Komponenta je osnovna gradivna jedinica Angular aplikacije. Svaka komponenta se sastoji od tri dela:

- **TypeScript klase** – logika komponente
- **HTML šablona** – prikaz (view)
- **CSS/SCSS stilova** – izgled

### Kreiranje komponente

```bash
ng generate component naziv-komponente
# ili skraćeno:
ng g c naziv-komponente
```

> Moguće je i ručno pravljenje potrebnih fajlova

### Struktura koda komponente

```typescript
// korisnik.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-korisnik',   // HTML tag kojim se komponenta koristi
  templateUrl: './korisnik.component.html',
  styleUrls: ['./korisnik.component.scss']
})
export class KorisnikComponent implements OnInit {
  ime: string = 'Marko';
  godine: number = 30;

  constructor() {}

  ngOnInit(): void {
    // Poziva se kada je komponenta inicijalizovana
  }
}
```

### HTML šablon komponente

```html
<!-- korisnik.component.html -->
<div class="korisnik-kartica">
  <h2>{{ ime }}</h2>
  <p>Godine: {{ godine }}</p>
  <button (click)="pozdraviKorisnika()">Pozdravi</button>
</div>
```

> Angular koristi defaultne HTML i CSS fajlove, ne menja način na koji se pišu

### Lifecycle funkcije (Životni ciklus komponente)

| Funkcija | Kada se poziva |
|---|---|
| `ngOnInit()` | Jednom, nakon inicijalizacije komponente |
| `ngOnChanges()` | Kada se promeni vrednost `@Input` propertija |
| `ngOnDestroy()` | Neposredno pre uklanjanja komponente iz DOM-a |
| `ngAfterViewInit()` | Nakon što je view komponente inicijalizovan |

### Komunikacija izmedju komponenti

**Parent → Child** (prosledjivanje podataka dole):
```typescript
// Child komponenta prima podatak
@Input() korisnikIme: string = '';
```
```html
<!-- Parent šablon koristi child komponentu -->
<app-child [korisnikIme]="'Ana'"></app-child>
```

**Child → Parent** (slanje dogadjaja gore):
```typescript
// Child emituje događaj
@Output() kliknutoDugme = new EventEmitter<string>();

onKlik() {
  this.kliknutoDugme.emit('poruka od child-a');
}
```
```html
<!-- Parent osluškuje događaj -->
<app-child (kliknutoDugme)="handleKlik($event)"></app-child>
```

---

## 3. Moduli (Modules)

Modul je kontejner koji grupiše povezane komponente, direktive, pipe-ove i servise. Svaka Angular aplikacija ima barem jedan modul – **AppModule** (root modul)

### Struktura modula

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { KorisnikComponent } from './features/korisnici/korisnik.component';

@NgModule({
  declarations: [
    AppComponent,       // Komponente koje pripadaju ovom modulu
    KorisnikComponent
  ],
  imports: [
    BrowserModule,      // Uvezeni moduli (Angular i third-party)
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [],        // Servisi dostupni u celoj aplikaciji
  bootstrap: [AppComponent]  // Root komponenta koja se pokreće
})
export class AppModule {}
```

### Feature moduli

Za veće aplikacije je preporučeno kreiranje zasebnih feature modula:

```bash
ng generate module features/korisnici --routing
```

```typescript
// korisnici.module.ts
@NgModule({
  declarations: [KorisniciListaComponent, KorisnikDetaljiComponent],
  imports: [CommonModule, KorisniciRoutingModule],
})
export class KorisniciModule {}
```

Feature moduli se uvode u `AppModule` ili se učitavaju **lazy load** metodom putem rutiranja (videti sekciju [Routing](#5-routing-u-angular-u))

---

## 4. Servisi (Services)

Servis je klasa koja enkapsulira poslovnu logiku, deljeno stanje ili komunikaciju sa API-jem. Servisi se dele između komponenti putem **Dependency Injection (DI)** mehanizma

### Kreiranje servisa

```bash
ng generate service services/korisnik
# ili skraćeno:
ng g s services/korisnik
```

> Moguće je i ručno pravljenje potrebnog fajla

### Primer servisa

```typescript
// korisnik.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Korisnik {
  id: number;
  ime: string;
  email: string;
}

@Injectable({
  providedIn: 'root'   // Servis je dostupan u celoj aplikaciji (singleton)
})
export class KorisnikService {
  private apiUrl = 'https://api.example.com/korisnici';

  constructor(private http: HttpClient) {}

  getKorisnici(): Observable<Korisnik[]> {
    return this.http.get<Korisnik[]>(this.apiUrl);
  }

  getKorisnik(id: number): Observable<Korisnik> {
    return this.http.get<Korisnik>(`${this.apiUrl}/${id}`);
  }
}
```

### Korišćenje servisa u komponenti

```typescript
export class KorisniciComponent implements OnInit {
  korisnici: Korisnik[] = [];

  constructor(private korisnikService: KorisnikService) {}

  ngOnInit(): void {
    this.korisnikService.getKorisnici().subscribe({
      next: (data) => this.korisnici = data,
      error: (err) => console.error('Greška:', err)
    });
  }
}
```

> **Napomena:** `providedIn: 'root'` znači da Angular kreira jednu instancu servisa (singleton) za celu aplikaciju 
<br> Alternativno, servis se može registrovati u konkretnom modulu ako je potreban samo u njemu

---

## 5. Routing u Angular-u

Angular Router omogućava navigaciju izmedju različitih "pogleda" (views) unutar Single Page Application-a (SPA)

### Osnovna konfiguracija ruta

```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PocetnaComponent } from './features/pocetna/pocetna.component';
import { KorisniciComponent } from './features/korisnici/korisnici.component';
import { NijePronadjenoComponent } from './shared/nije-pronadjeno/nije-pronadjeno.component';

const routes: Routes = [
  { path: '', redirectTo: '/pocetna', pathMatch: 'full' },
  { path: 'pocetna', component: PocetnaComponent },
  { path: 'korisnici', component: KorisniciComponent },
  { path: '**', component: NijePronadjenoComponent }  // Fallback za 404
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

### Lazy Loading (učitavanje po zahtevu)

Lazy loading poboljšava performanse tako što učitava feature module tek kada korisnik navigira do njih:

```typescript
const routes: Routes = [
  {
    path: 'korisnici',
    loadChildren: () =>
      import('./features/korisnici/korisnici.module').then(m => m.KorisniciModule)
  }
];
```

### Navigacija u šablonu i kodu

```html
<!-- Navigacioni linkovi u HTML-u -->
<nav>
  <a routerLink="/pocetna" routerLinkActive="aktivan">Početna</a>
  <a routerLink="/korisnici" routerLinkActive="aktivan">Korisnici</a>
</nav>

<!-- Mesto gde se renderuju komponente rute -->
<router-outlet></router-outlet>
```

```typescript
// Programska navigacija u TypeScript-u
import { Router } from '@angular/router';

constructor(private router: Router) {}

navigirajNaKorisnike() {
  this.router.navigate(['/korisnici']);
}

// Navigacija sa parametrima
this.router.navigate(['/korisnici', korisnikId]);
```

### Route parametri

```typescript
// Definisanje rute sa parametrom
{ path: 'korisnici/:id', component: KorisnikDetaljiComponent }
```

```typescript
// Čitanje parametra u komponenti
import { ActivatedRoute } from '@angular/router';

constructor(private route: ActivatedRoute) {}

ngOnInit(): void {
  const id = this.route.snapshot.paramMap.get('id');
}
```

### Route Guards (zaštita ruta)

Čuvari kontrolišu da li korisnik sme da pristupi odredjenoj ruti (npr. samo ulogovani korisnici):

```typescript
// auth.guard.ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.jeUlogovan()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}

// Primena guard-a na rutu
{ path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] }
```

---

## 6. Komunikacija sa backend API-jem

Angular koristi `HttpClient` modul za slanje HTTP zahteva ka backend API-ju <br>
IntelliSense kaže da je modul deprecated, ali ga i dalje koristimo

### Podešavanje

`HttpClientModule` mora biti uvezen u `AppModule`:

```typescript
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [HttpClientModule, ...]
})
export class AppModule {}
```

### CRUD operacije

```typescript
// api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'https://api.example.com';

  constructor(private http: HttpClient) {}

  // GET – dohvatanje podataka
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`);
  }

  // POST – kreiranje resursa
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body);
  }

  // PUT – ažuriranje resursa
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body);
  }

  // DELETE – brisanje resursa
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`);
  }
}
```

### HTTP Interceptori

Interceptori automatski modifikuju svaki HTTP zahtev (npr. dodavanje JWT tokena):

```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('token');

    if (token) {
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next.handle(authReq);
    }

    return next.handle(req);
  }
}
```

```typescript
// Registracija interceptora u AppModule
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
]
```

### Upravljanje greškama

```typescript
import { catchError, throwError } from 'rxjs';

getKorisnici(): Observable<Korisnik[]> {
  return this.http.get<Korisnik[]>(this.apiUrl).pipe(
    catchError((error) => {
      console.error('API greška:', error);
      return throwError(() => new Error('Dohvatanje korisnika nije uspelo'));
    })
  );
}
```

---

## 7. Primer jednostavne komponente

Kompletan primer komponente za prikaz liste korisnika sa dohvatanjem podataka sa API-ja:

### Servis

```typescript
// korisnici.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Korisnik {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class KorisniciService {
  private url = 'https://placeholder.com/users';

  constructor(private http: HttpClient) {}

  getKorisnici(): Observable<Korisnik[]> {
    return this.http.get<Korisnik[]>(this.url);
  }
}
```

### Komponenta (TypeScript)

```typescript
// korisnici-lista.component.ts
import { Component, OnInit } from '@angular/core';
import { KorisniciService, Korisnik } from './korisnici.service';

@Component({
  selector: 'app-korisnici-lista',
  templateUrl: './korisnici-lista.component.html',
  styleUrls: ['./korisnici-lista.component.scss']
})
export class KorisniciListaComponent implements OnInit {
  korisnici: Korisnik[] = [];
  ucitava: boolean = false;
  greska: string = '';

  constructor(private korisniciService: KorisniciService) {}

  ngOnInit(): void {
    this.ucitajKorisnike();
  }

  ucitajKorisnike(): void {
    this.ucitava = true;

    this.korisniciService.getKorisnici().subscribe({
      next: (data) => {
        this.korisnici = data;
        this.ucitava = false;
      },
      error: (err) => {
        this.greska = 'Greška pri učitavanju korisnika.';
        this.ucitava = false;
      }
    });
  }
}
```

### HTML šablon

```html
<!-- korisnici-lista.component.html -->
<div class="korisnici-container">
  <h1>Lista korisnika</h1>

  <!-- Indikator učitavanja -->
  <p *ngIf="ucitava">Učitavanje...</p>

  <!-- Poruka o grešci -->
  <p *ngIf="greska" class="greska">{{ greska }}</p>

  <!-- Lista korisnika -->
  <ul *ngIf="!ucitava && !greska">
    <li *ngFor="let korisnik of korisnici" class="korisnik-stavka">
      <strong>{{ korisnik.name }}</strong>
      <span>{{ korisnik.email }}</span>
    </li>
  </ul>
</div>
```

### CSS stilovi

```css
/* korisnici-lista.component.scss */
.korisnici-container {
  max-width: 600px;
  margin: 20px auto;
  font-family: sans-serif;

  h1 {
    color: #333;
  }
}

.korisnik-stavka {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;

  &:hover {
    background-color: #f9f9f9;
  }
}

.greska {
  color: red;
  font-weight: bold;
}
```

### Registracija u modulu

```typescript
// app.module.ts (dodati komponentu i modul)
import { HttpClientModule } from '@angular/common/http';
import { KorisniciListaComponent } from './features/korisnici/korisnici-lista.component';

@NgModule({
  declarations: [AppComponent, KorisniciListaComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

---

## Korisne komande Angular CLI

| Komanda | Opis |
|---|---|
| `ng new naziv` | Kreira novi projekat |
| `ng serve` | Pokretanje dev servera (localhost:4200) |
| `ng build --prod` | Build za produkciju |
| `ng g c ime` | Generiše novu komponentu |
| `ng g s ime` | Generiše novi servis |
| `ng g m ime --routing` | Generiše novi modul sa rutiranjem |
| `ng g guard ime` | Generiše route guard |
| `ng test` | Pokreće unit testove |