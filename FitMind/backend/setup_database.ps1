# FitMind Database Setup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FitMind Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Zmena do adresára skriptu
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Kontrola firebase-service-account.json
if (-not (Test-Path "firebase-service-account.json")) {
    Write-Host "[CHYBA] firebase-service-account.json neexistuje!" -ForegroundColor Red
    Write-Host "Umiestni firebase-service-account.json do backend/ adresara" -ForegroundColor Yellow
    pause
    exit 1
}

# Kontrola Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[CHYBA] Python nie je nainstalovany!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[INFO] Spustam setup skript..." -ForegroundColor Yellow
Write-Host ""

# Spustenie skriptu
python setup_database.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[CHYBA] Setup sa nepodaril!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[OK] Setup dokonceny!" -ForegroundColor Green
pause

