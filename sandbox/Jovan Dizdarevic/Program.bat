@echo off
title TaskManager Starter

REM Lokacija projekta (folder gde se nalazi .bat)
set ROOT=%~dp0

echo Pokrecem backend...
start "TaskManager Backend" cmd /k "cd /d "%ROOT%backend\TaskManager.Api" && dotnet run"

timeout /t 5 /nobreak > nul

echo Pokrecem frontend...
start "TaskManager Frontend" cmd /k "cd /d "%ROOT%frontend\taskmanager-ui" && npm start"

timeout /t 8 /nobreak > nul

echo Otvaram aplikaciju u browseru...
start http://localhost:4200

exit