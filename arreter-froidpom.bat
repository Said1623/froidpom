@echo off
title Froidpom - Arret
color 0C
cls

echo.
echo  ==========================================
echo   *** FROIDPOM - Arret Application ***
echo  ==========================================
echo.

echo  Fermeture des fenetres Backend et Frontend...

:: Fermer les fenetres par titre
taskkill /FI "WINDOWTITLE eq Froidpom - Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Froidpom - Frontend" /F >nul 2>&1

:: Tuer les processus node sur les ports 3000 et 5173
echo  Arret des processus Node.js...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  [OK] Froidpom arrete.
echo.
timeout /t 2 /nobreak >nul
