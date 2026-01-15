@echo off
REM FitMind Backend - Lokalne testovanie
echo ===========================================
echo FitMind Backend - Lokalne testovanie
echo ===========================================
echo.

REM Aktivuj virtualenv ak existuje
if exist venv\Scripts\activate.bat (
    echo Aktivujem virtualenv...
    call venv\Scripts\activate.bat
) else (
    echo POZOR: venv neexistuje, pouzivam globalny Python
    echo Spusti najprv: python -m venv venv
    echo.
)

REM Nainstaluj dependencies
echo Instalujem dependencies...
pip install -r requirements.txt --quiet

echo.
echo ===========================================
echo Server sa spusta na: http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo Health: http://127.0.0.1:8000/health
echo ===========================================
echo.
echo Pre ukoncenie stlac Ctrl+C
echo.

REM Spusti server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
