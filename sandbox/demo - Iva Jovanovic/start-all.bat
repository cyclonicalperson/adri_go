@echo off
setlocal

set "REPO_ROOT=%~dp0"
set "PROJECT_ROOT=%REPO_ROOT%sandbox\event-demo"
set "BACKEND_PATH=%PROJECT_ROOT%\backend"
set "FRONTEND_PATH=%PROJECT_ROOT%\frontend"

if not exist "%BACKEND_PATH%" (
  echo Backend folder not found: %BACKEND_PATH%
  exit /b 1
)

if not exist "%FRONTEND_PATH%" (
  echo Frontend folder not found: %FRONTEND_PATH%
  exit /b 1
)

echo Starting EventHub demo project...
echo Backend path : %BACKEND_PATH%
echo Frontend path: %FRONTEND_PATH%
echo.

start "EventHub Backend" cmd /k ""cd /d "%BACKEND_PATH%" && dotnet run""
start "EventHub Frontend" cmd /k ""cd /d "%FRONTEND_PATH%" && npm.cmd start""

echo Services are starting in separate windows.
echo Backend URL : http://localhost:5000
echo Frontend URL: http://localhost:4200
echo Admin login : admin / admin

endlocal
