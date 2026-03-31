# Tourist App Database

## Opis

Ova baza podataka predstavlja osnovu moderne digitalne turističke platforme namenjene za:

- Turiste – istraživanje destinacija, događaja i mesta  
- Administratore – upravljanje sadržajem i objavama  
- Super Admina – upravljanje korisnicima i sistemskim dozvolama  

Sistem podržava:
- Interaktivne mape (lokacije i rute)  
- Recenzije, lajkove i čuvanje sadržaja  
- Analitiku i praćenje ponašanja korisnika  
- Integraciju sa spoljnim servisima (Booking, Airbnb)  
- Planiranje putovanja i digitalne karte  

---

## Osnovni koncepti

### Uloge korisnika
- Tourist – istražuje sadržaj, čuva objave, ostavlja recenzije i planira putovanja  
- Admin – kreira i upravlja sadržajem (u zavisnosti od dozvola)  
- Super Admin – upravlja adminima, dozvolama i sistemom  

---

## Struktura baze

### Admin i dozvole

| Tabela | Opis |
|------|------------|
| admin_user | Čuva admin naloge (uključujući Super Admina) |
| admin_permission | Definiše sve dostupne dozvole |
| admin_user_permission | Dodeljuje dozvole adminima |
| admin_registration_request | Čuva prijave novih admina |
| verification_document | Dokumenta priložena pri registraciji |
| terms_acceptance | Evidencija prihvatanja uslova |
| admin_audit_log | Evidencija aktivnosti admina |

---

### Turisti

| Tabela | Opis |
|------|------------|
| tourist | Registrovani turistički korisnici |
| mailing_list | Prijava na newsletter i promocije |
| notification | Notifikacije za korisnike |

---

### Sadržaj i lokacije

| Tabela | Opis |
|------|------------|
| region | Geografske oblasti (gradovi, regioni) |
| post | Glavna tabela za sadržaj (smeštaj, događaji, restorani) |
| tag | Oznake za kategorizaciju |
| post_tag | Veza između objava i tagova |

---

### Rute i navigacija

| Tabela | Opis |
|------|------------|
| route | Rute sa početnom i krajnjom lokacijom |
| direction_request | Evidencija zahteva za navigaciju |

---

### Interakcije korisnika

| Tabela | Opis |
|------|------------|
| post_like | Lajkovane objave |
| post_save | Sačuvane objave |
| post_view | Evidencija pregleda |
| external_click | Klikovi na spoljne linkove |
| content_share | Deljenje sadržaja |
| tourist_favorite | Omiljeni sadržaj (objave ili rute) |

---

### Recenzije i ocene

| Tabela | Opis |
|------|------------|
| review | Recenzije korisnika |
| review_media | Slike u okviru recenzija |

---

### Planer i karte

| Tabela | Opis |
|------|------------|
| visit_planner | Plan putovanja korisnika |
| planner_item | Stavke u planu |
| ticket | Digitalne karte za događaje |

---

## Podržane funkcionalnosti

### Admin sistem
- Registracija sa odobravanjem od strane Super Admina  
- Kontrola pristupa bazirana na rolama i dozvolama  
- Praćenje aktivnosti (audit log)  

---

### Upravljanje sadržajem
- Centralizovan model sadržaja (post)  
- Podržani tipovi:
  - Smeštaj  
  - Događaji  
  - Restorani  
  - Atrakcije  
  - Prodavnice  

---

### Funkcionalnosti za turiste
- Pregled i filtriranje sadržaja  
- Čuvanje, lajkovanje i recenzije  
- Prikaz na mapi  
- Navigacija do lokacije  
- Odlazak na spoljne sajtove (Booking, Airbnb)  

---

### Analitika
- Praćenje:
  - pregleda  
  - lajkova  
  - čuvanja  
  - klikova  
  - navigacije  
- Osnova za sistem preporuka  

---

### Dodatne funkcionalnosti
- Planer putovanja  
- Notifikacije  
- Mailing sistem  
- Digitalne karte  

---

## Napomene o dizajnu

- Koristi se centralna tabela post radi fleksibilnosti  
- Interakcije omogućavaju naprednu analitiku  
- Dozvole omogućavaju preciznu kontrolu admina  
- Sistem je dizajniran za skalabilnost i realnu primenu  

---

## Zaključak

Ova baza predstavlja stabilnu i skalabilnu osnovu za razvoj turističke aplikacije i pokriva:

- upravljanje sadržajem  
- interakciju korisnika  
- analitiku  
- personalizaciju  
- integraciju sa spoljnim servisima  

---

Spremno za integraciju sa Angular frontendom i .NET backendom.
