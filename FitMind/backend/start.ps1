# FitMind Backend - Spustenie
# Použitie: .\start.ps1 alebo .\start.bat

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FitMind Backend - Spustenie" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Zmena do adresára skriptu
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "`n[INFO] Adresar: $scriptPath" -ForegroundColor Yellow
Write-Host "[INFO] Kontrolujem Python..." -ForegroundColor Yellow

# Kontrola Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[CHYBA] Python nie je nainstalovany alebo nie je v PATH!" -ForegroundColor Red
    Write-Host "Nainstaluj Python z: https://www.python.org/downloads/" -ForegroundColor Yellow
    pause
    exit 1
}

# Kontrola Firebase service account
if (-not (Test-Path "firebase-service-account.json")) {
    Write-Host "[VAROVANIE] firebase-service-account.json neexistuje!" -ForegroundColor Yellow
    Write-Host "Backend moze fungovat, ale Firebase nebude dostupne." -ForegroundColor Yellow
}

# Kontrola .env súboru
if (-not (Test-Path ".env")) {
    Write-Host "[VAROVANIE] .env subor neexistuje!" -ForegroundColor Yellow
    Write-Host "Vytvor .env subor s OPENAI_API_KEY=..." -ForegroundColor Yellow
}

# Kontrola a ukončenie procesov na porte 8000
Write-Host "`n[INFO] Kontrolujem port 8000..." -ForegroundColor Yellow
$portCheck = netstat -ano | Select-String ":8000.*LISTENING"
if ($portCheck) {
    $pidMatch = $portCheck | Select-String -Pattern "(\d+)$"
    if ($pidMatch) {
        $processId = $pidMatch.Matches[0].Groups[1].Value
        Write-Host "[INFO] Nasiel som proces na porte 8000 (PID: $processId)" -ForegroundColor Yellow
        Write-Host "[INFO] Ukoncujem proces..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            Write-Host "[OK] Proces ukonceny" -ForegroundColor Green
        } catch {
            Write-Host "[VAROVANIE] Nepodarilo sa ukoncit proces $processId" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[OK] Port 8000 je volny" -ForegroundColor Green
}

Write-Host "`n[INFO] Spustam backend..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Spustenie backendu
try {
    python main.py
} catch {
    Write-Host "`n[CHYBA] Backend sa nepodarilo spustit!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    pause
    exit 1
}




