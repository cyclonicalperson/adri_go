@echo off
echo --- Pokretanje Recepti Aplikacije ---

:: 1. Pokretanje Backenda u novom prozoru
echo [1/2] Pokretanje .NET Backenda...
start cmd /k "cd Backend && dotnet run"

:: 2. Kratka pauza da se oslobode resursi
timeout /t 3

:: 3. Pokretanje Frontenda u novom prozoru
echo [2/2] Pokretanje Angular Frontenda...
start cmd /k "cd Frontend && ng serve"

echo.
echo Oba procesa su pokrenuta u zasebnim prozorima.
pause