# Deploy backend controllers sul VPS (esegui da PowerShell nella root del repo)
# Sostituisci porta, utente e host se diversi. Richiede SSH/SCP configurati.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$BackendRoot = Join-Path $ProjectRoot "backend"
$VPS = "spascarella@www.fr-busato.it"
$Port = "1122"
$RemotePath = "/var/www/sgq-backend/src/controllers"

$Files = @(
    "src/controllers/audit.controller.js",
    "src/controllers/customChecklist.controller.js"
)

Write-Host "Copia controller sul VPS (porta $Port)..." -ForegroundColor Cyan
Set-Location $BackendRoot
foreach ($f in $Files) {
    scp -P $Port $f "${VPS}:${RemotePath}/"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Write-Host "OK. Riavvia il servizio Node sul VPS (SSH) e verifica GET /api/v1/health" -ForegroundColor Green
