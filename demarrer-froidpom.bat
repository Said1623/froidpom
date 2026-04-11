@echo off
title Froidpom - Demarrage
color 0B
cls

echo.
echo  ==========================================
echo   *** FROIDPOM - Gestion Frigorifique ***
echo  ==========================================
echo.

:: Verifier que Node.js est installe
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERREUR] Node.js n'est pas installe ou pas dans le PATH.
    echo  Telecharger depuis https://nodejs.org
    pause
    exit /b 1
)

:: Verifier que PostgreSQL tourne
echo  [1/3] Verification PostgreSQL...
pg_isready -h localhost -p 5433 >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INFO] Demarrage de PostgreSQL...
    net start postgresql-x64-13 >nul 2>&1
    if %errorlevel% neq 0 (
        net start postgresql-x64-16 >nul 2>&1
        net start postgresql-x64-15 >nul 2>&1
        net start postgresql-x64-14 >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
) else (
    echo  [OK] PostgreSQL est en cours d'execution
)

:: Demarrer le Backend NestJS
echo.
echo  [2/3] Demarrage du Backend NestJS...
cd /d "%~dp0backend"

if not exist "node_modules" (
    echo  [INFO] Installation des dependances backend...
    call npm install
)

start "Froidpom - Backend" cmd /k "color 0A && echo  === BACKEND NESTJS === && echo. && npm run start:dev"

:: Attendre que le backend soit pret
echo  [INFO] Attente demarrage backend (10 secondes)...
timeout /t 10 /nobreak >nul

:: Demarrer le Frontend Vite
echo.
echo  [3/3] Demarrage du Frontend React...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo  [INFO] Installation des dependances frontend...
    call npm install
)

start "Froidpom - Frontend" cmd /k "color 0E && echo  === FRONTEND REACT === && echo. && npm run dev"

:: Attendre que le frontend soit pret
echo  [INFO] Attente demarrage frontend (5 secondes)...
timeout /t 5 /nobreak >nul

:: Ouvrir le navigateur
echo.
echo  [OK] Ouverture du navigateur...
start http://localhost:5173

echo.
echo  ==========================================
echo   Application demarree avec succes !
echo  ==========================================
echo.
echo   Backend  : http://localhost:3000/api
echo   Frontend : http://localhost:5173
echo.
echo   Fermer cette fenetre ne stopera pas
echo   l'application. Pour arreter, fermer
echo   les fenetres Backend et Frontend.
echo.
pause
