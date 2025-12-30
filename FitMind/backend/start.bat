@echo off
echo ========================================
echo FitMind Backend - Spustenie
echo ========================================
echo.

cd /d %~dp0
echo [INFO] Adresar: %CD%
echo [INFO] Kontrolujem Python...
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [CHYBA] Python nie je nainstalovany alebo nie je v PATH!
    echo Nainstaluj Python z: https://www.python.org/downloads/
    pause
    exit /b 1
)

if not exist "firebase-service-account.json" (
    echo [VAROVANIE] firebase-service-account.json neexistuje!
    echo Backend moze fungovat, ale Firebase nebude dostupne.
    echo.
)

if not exist ".env" (
    echo [VAROVANIE] .env subor neexistuje!
    echo Vytvor .env subor s OPENAI_API_KEY=...
    echo.
)

echo [INFO] Spustam backend...
echo ========================================
echo.

python main.py

if errorlevel 1 (
    echo.
    echo [CHYBA] Backend sa nepodarilo spustit!
    pause
    exit /b 1
)




