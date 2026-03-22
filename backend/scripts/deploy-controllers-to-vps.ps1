# Deploy backend (controllers + routes + server.js) sul VPS
# Esegui da PowerShell nella root del repo.
# Usa PuTTY (pscp/plink) in modalita' -batch per evitare prompt interattivi.
# Nota: la prima volta potrebbe essere necessario accettare la host key manualmente (una sola volta),
# poi -batch funzionera' senza blocchi.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$BackendRoot = Join-Path $ProjectRoot "backend"
$VPS = "spascarella@www.fr-busato.it"
$Port = "1122"
$RemoteBase = "/var/www/sgq-backend"
$HostKey = "ssh-ed25519 255 SHA256:X7V82/1Ugdd7QmCJqaAXTn8Pazqv8bRA3mshLlwbsoc"
$PuttySession = $env:SGQ_PUTTY_SESSION  # opzionale: nome sessione PuTTY salvata (consigliato)
$SshPassword = $env:SGQ_SSH_PASSWORD    # opzionale: password SSH (sconsigliata; evita prompt in batch)

$Pscp = "C:\Program Files\PuTTY\pscp.exe"
$Plink = "C:\Program Files\PuTTY\plink.exe"

if (-not (Test-Path $Pscp)) {
    throw "pscp.exe non trovato in: $Pscp"
}
if (-not (Test-Path $Plink)) {
    throw "plink.exe non trovato in: $Plink"
}

function Copy-FileToVps([string]$LocalRelPath, [string]$RemoteAbsPath) {
    $local = Join-Path $BackendRoot $LocalRelPath
    if (-not (Test-Path $local)) { throw "File locale non trovato: $local" }

    Write-Host "  -> Copia: $LocalRelPath  =>  $RemoteAbsPath" -ForegroundColor Gray
    if ($PuttySession) {
        & $Pscp -batch -load $PuttySession $local "$VPS`:$RemoteAbsPath"
    } else {
        if ($SshPassword) {
            & $Pscp -batch -pw $SshPassword -hostkey $HostKey -P $Port $local "$VPS`:$RemoteAbsPath"
        } else {
            & $Pscp -batch -hostkey $HostKey -P $Port $local "$VPS`:$RemoteAbsPath"
        }
    }
    if ($LASTEXITCODE -ne 0) { throw "pscp fallito per $LocalRelPath (exit $LASTEXITCODE)" }
}

Write-Host "Copia backend su VPS (porta $Port)..." -ForegroundColor Cyan
Set-Location $BackendRoot

# Preflight: assicura che la host key sia in cache per evitare prompt.
# Se e' la prima connessione e chiede "store key in cache (y/n)?", rispondiamo "y".
# Se invece chiede la password (autenticazione non a chiave), il deploy non puo' proseguire in modo non interattivo.
Write-Host "Preflight SSH (verifica host key)..." -ForegroundColor Cyan
$useSession = $false
if ($PuttySession) {
    & $Plink -batch -load $PuttySession "exit" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $useSession = $true
    } else {
        Write-Host "⚠ Sessione PuTTY '$PuttySession' non valida o non trovata: fallback su hostkey." -ForegroundColor DarkYellow
        $useSession = $false
    }
}
if (-not $useSession) {
    if ($SshPassword) {
        & $Plink -batch -pw $SshPassword -hostkey $HostKey -P $Port $VPS "exit" | Out-Null
    } else {
        & $Plink -batch -hostkey $HostKey -P $Port $VPS "exit" | Out-Null
    }
    if ($LASTEXITCODE -ne 0) {
        throw "plink preflight fallito (exit $LASTEXITCODE). Probabile richiesta password SSH o chiave non configurata: serve autenticazione non-interattiva (chiave) oppure una sessione PuTTY valida via SGQ_PUTTY_SESSION."
    }
}

# Controllers
Copy-FileToVps "src/controllers/audit.controller.js" "$RemoteBase/src/controllers/audit.controller.js"
Copy-FileToVps "src/controllers/customChecklist.controller.js" "$RemoteBase/src/controllers/customChecklist.controller.js"
Copy-FileToVps "src/controllers/admin.controller.js" "$RemoteBase/src/controllers/admin.controller.js"
Copy-FileToVps "src/controllers/auditorOrg.controller.js" "$RemoteBase/src/controllers/auditorOrg.controller.js"

# Routes (necessarie per esporre gli endpoint custom-checklist-responses)
Copy-FileToVps "src/routes/audit.routes.js" "$RemoteBase/src/routes/audit.routes.js"
Copy-FileToVps "src/routes/customChecklist.routes.js" "$RemoteBase/src/routes/customChecklist.routes.js"
Copy-FileToVps "src/routes/admin.routes.js" "$RemoteBase/src/routes/admin.routes.js"

# Entry point server (include customChecklistRoutes)
Copy-FileToVps "src/server.js" "$RemoteBase/src/server.js"

# Services richiesti dai controller (evita crash MODULE_NOT_FOUND su VPS)
Copy-FileToVps "src/services/auditMaintenance.service.js" "$RemoteBase/src/services/auditMaintenance.service.js"
Copy-FileToVps "src/services/customChecklist.service.js" "$RemoteBase/src/services/customChecklist.service.js"
Copy-FileToVps "src/services/reportTemplate.service.js" "$RemoteBase/src/services/reportTemplate.service.js"

Write-Host "OK. Riavvio backend sul VPS..." -ForegroundColor Cyan

# Password sudo opzionale (solo sessione PowerShell corrente): $env:SGQ_SUDO_PASSWORD — mai in repo.
# Se impostata, viene passata in base64 al remoto per: sudo systemctl restart sgq-backend.service
$SudoB64 = ""
if ($env:SGQ_SUDO_PASSWORD) {
    $SudoB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:SGQ_SUDO_PASSWORD))
    Write-Host "  (SGQ_SUDO_PASSWORD impostata: verra' usata per systemctl restart se necessario)" -ForegroundColor DarkGray
}

# Ordine: (1) sudo con password da env, (2) sudo -n NOPASSWD, (3) fallback DEPLOY_CHECKLIST_RELEASE.md (fuser + nohup)
# Nota: alcune shell (es. csh/tcsh) non supportano "set -e" — usiamo bash -lc.
$remoteCmd = @"
bash -lc '
cd "$RemoteBase"
export DEPLOY_SUDO_B64="$SudoB64"
echo "[deploy] restart backend"
RESTARTED=0
if [ -n "`$DEPLOY_SUDO_B64" ]; then
  if echo "`$DEPLOY_SUDO_B64" | base64 -d 2>/dev/null | sudo -S systemctl restart sgq-backend.service 2>/dev/null; then
    echo "[deploy] systemctl restart OK (SGQ_SUDO_PASSWORD)"
    RESTARTED=1
  else
    echo "[deploy] sudo con password non riuscito — si provano altri metodi"
  fi
fi
if [ "`$RESTARTED" != "1" ] && sudo -n systemctl restart sgq-backend.service 2>/dev/null; then
  echo "[deploy] systemctl restart OK (sudo NOPASSWD)"
  RESTARTED=1
fi
if [ "`$RESTARTED" != "1" ]; then
  echo "[deploy] fallback fuser + nohup (come docs/DEPLOY_CHECKLIST_RELEASE.md)"
  fuser -k 3000/tcp 2>/dev/null || true
  sleep 2
  cd "$RemoteBase" || exit 1
  nohup node src/server.js >> "$RemoteBase/app.log" 2>&1 &
  sleep 4
  RESTARTED=1
fi
systemctl --no-pager --full status sgq-backend.service 2>/dev/null | tail -n 40 || true
tail -n 25 "$RemoteBase/app.log" || true
'
"@

# Windows usa CRLF: rimuoviamo i '\r' per evitare errori su bash remoto.
$remoteCmd = $remoteCmd -replace "`r", ""

if ($PuttySession) {
    if ($useSession) {
        & $Plink -batch -load $PuttySession $remoteCmd
    } else {
        if ($SshPassword) {
            & $Plink -batch -pw $SshPassword -hostkey $HostKey -P $Port $VPS $remoteCmd
        } else {
            & $Plink -batch -hostkey $HostKey -P $Port $VPS $remoteCmd
        }
    }
} else {
    if ($SshPassword) {
        & $Plink -batch -pw $SshPassword -hostkey $HostKey -P $Port $VPS $remoteCmd
    } else {
        & $Plink -batch -hostkey $HostKey -P $Port $VPS $remoteCmd
    }
}
if ($LASTEXITCODE -ne 0) { throw "plink (restart) fallito (exit $LASTEXITCODE)" }

Write-Host "DONE. Verifica ora: GET /api/v1/health e salva risposte checklist custom." -ForegroundColor Green
