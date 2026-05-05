#!/bin/bash

BACKEND_PATH="D:\\Projekti\\globecode\\src\\Backend\\TouristGuide.Api"
ADMIN_PATH="D:\\Projekti\\globecode\\src\\Frontend\\Frontend_Admin"
KORISNIK_PATH="D:\\Projekti\\globecode\\src\\Frontend\\Frontend_Korisnik"

echo "Pokrecemo sve terminale..."

# Backend — dotnet run
start powershell -NoExit -Command "Set-Location '$BACKEND_PATH'; dotnet run"

# Admin Frontend — ng serve (port 4200)
start powershell -NoExit -Command "Set-Location '$ADMIN_PATH'; ng serve"

# Tourist Frontend — ng serve (port 4201, konfigurisan u angular.json)
start powershell -NoExit -Command "Set-Location '$KORISNIK_PATH'; ng serve"

echo "Sva tri terminala su pokrenuta."
