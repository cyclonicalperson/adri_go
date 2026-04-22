#!/bin/bash

# Putanje do tvojih direktorijuma
BACKEND_PATH="D:\Projekti\globecode\src\Backend\TouristGuide.Api"
FRONTEND_PATH="D:\Projekti\globecode\src\Frontend\Frontend_Admin"

echo "Pokrećem PowerShell terminale..."

# Otvaranje Backend terminala
start powershell -NoExit -Command "Set-Location '$BACKEND_PATH'"

# Otvaranje Frontend terminala
start powershell -NoExit -Command "Set-Location '$FRONTEND_PATH'"

echo "Uspešno otvoreno."
