@echo off
echo ========================================
echo FitMind Database Setup
echo ========================================
echo.

cd /d %~dp0

if not exist "firebase-service-account.json" (
    echo [CHYBA] firebase-service-account.json neexistuje!
    echo Umiestni firebase-service-account.json do backend/ adresara
    pause
    exit /b 1
)

echo [INFO] Spustam setup skript...
echo.

python setup_database.py

if errorlevel 1 (
    echo.
    echo [CHYBA] Setup sa nepodaril!
    pause
    exit /b 1
)

echo.
echo [OK] Setup dokonceny!
pause



