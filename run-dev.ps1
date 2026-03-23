# Shelby Send - Tek tıkla çalıştır
Set-Location $PSScriptRoot

$nodePath = "C:\Program Files\nodejs"
if (-not (Test-Path "$nodePath\node.exe")) {
    Write-Host "Node.js bulunamadi. Kurulum: https://nodejs.org veya: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
    pause
    exit 1
}

$env:Path = "$nodePath;$env:Path"

if (-not (Test-Path "node_modules")) {
    Write-Host "Bagimliliklari yukleniyor..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { pause; exit 1 }
}

Write-Host "Sunucu baslatiliyor: http://localhost:3000" -ForegroundColor Green
npm run dev
