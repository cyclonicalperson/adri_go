@echo off
echo Pokretanje City Explorer aplikacije...

REM Backend
echo.
echo [1/3] Restore backend...
cd backend
dotnet restore
start cmd /k "dotnet run"
cd ..

REM Frontend install ako treba
echo.
echo [2/3] Instaliram frontend зависности...
cd frontend
if not exist node_modules (
    npm install
)

REM Pokretanje frontenda
echo.
echo [3/3] Pokrecem frontend...
start cmd /k "npm start"
cd ..

echo.
echo Sve pokrenuto!
pause