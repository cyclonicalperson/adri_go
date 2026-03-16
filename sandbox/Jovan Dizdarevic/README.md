# TaskManager Demo Application

Ovo je demo aplikacija razvijena kao priprema za projekat iz Softverskog
inženjerstva. Aplikacija omogućava upravljanje zadacima (Task Manager) i
demonstrira rad sa sledećim tehnologijama:

-   **Backend:** .NET Web API
-   **Frontend:** Angular
-   **Baza podataka:** MySQL

# Kreiranje baze

U MySQL Workbench potrebno je kreirati bazu:

CREATE DATABASE taskmanager_demo;

U fajlu:

backend/TaskManager.Api/appsettings.json

potrebno je podesiti konekciju:

"ConnectionStrings": { "DefaultConnection":
"server=localhost;database=taskmanager_demo;user=root;password=YOUR_PASSWORD"
}

------------------------------------------------------------------------

# Ručno pokretanje projekta

## Pokretanje backend-a

Otvoriti terminal i otići u backend folder:

cd backend/TaskManager.Api

Pokrenuti backend:

dotnet run

Backend će biti dostupan na:

http://localhost:5000

API endpoint za zadatke:

http://localhost:5000/api/tasks

------------------------------------------------------------------------

## Pokretanje frontend-a

Otvoriti novi terminal i otići u Angular projekat:

cd frontend/taskmanager-ui

Instalirati pakete:

npm install

Pokrenuti Angular aplikaciju:

npm start

Frontend će biti dostupan na:

http://localhost:4200

------------------------------------------------------------------------

# Brzo pokretanje projekta

U root folderu projekta nalazi se skripta:

start-project.bat

Ova skripta automatski pokreće:

-   backend server
-   frontend Angular aplikaciju
-   otvara browser

Pokretanje:

double click → start-project.bat

Na ovaj način se ceo projekat može pokrenuti jednim klikom.

------------------------------------------------------------------------

# Funkcionalnosti aplikacije

Aplikacija omogućava:

-   pregled svih zadataka
-   dodavanje novih zadataka
-   izmenu postojećih zadataka
-   brisanje zadataka
-   filtriranje po statusu
