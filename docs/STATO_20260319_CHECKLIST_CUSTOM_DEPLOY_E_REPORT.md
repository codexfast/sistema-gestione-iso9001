# Stato avanzamento — Checklist custom, deploy VPS, report Word (19/03/2026)

Documento di **memoria operativa**: problemi risolti, cause radice e strategie per non ripetere errori.

---

## 1. Problemi risolti (sintesi)

| Problema | Causa radice | Fix / esito |
|----------|--------------|-------------|
| Dati checklist custom persi al reload | Salvataggio solo su server se `auditId` assente; merge server sovrascriveva `customResponses` vuoti | Local-first in `CustomChecklistAuditView`, merge in `StorageContext`, flush/sync su `syncService` |
| `PUT .../custom-checklist-responses` → **Endpoint non trovato** | Backend VPS senza route aggiornate **o** processo Node non riavviato | Deploy `audit.routes.js`, `customChecklist.routes.js`, `server.js`, controller + **services** mancanti |
| Con token → **404**, senza token → **401** | Route assente dopo auth: `authenticate` risponde 401 senza header; con Bearer passa al 404 globale | Allineare file su VPS + **restart systemd** |
| `sgq-backend.service` crash loop (`MODULE_NOT_FOUND`) | `audit.controller.js` richiede `../services/auditMaintenance.service.js` non copiato sul VPS | Includere nella copia: `auditMaintenance.service.js`, `customChecklist.service.js`, `reportTemplate.service.js` |
| Script deploy: errori `set -e`, `\r`, parentesi in `echo` | CRLF Windows, shell non bash, caratteri speciali in stringhe remote | `bash -lc`, strip `\r`, messaggi `echo` senza `()` |
| `systemctl restart` da script fallisce | `sudo` richiede password; `sudo -n` non interattivo | Restart manuale via PuTTY: `sudo systemctl restart sgq-backend.service` |
| **Report Word** senza dati checklist custom | `prepareAuditForExport` usava **solo** API; IndexedDB poteva avere dati non ancora (o non) sul server | **Merge** `currentAudit.customResponses` + risposte server in `ExportPanel.jsx` |

---

## 2. Strategie da mantenere

### Deploy backend VPS
1. **Non copiare solo i controller**: se un controller fa `require` di un service, copiare anche `backend/src/services/*.js` coinvolti.
2. **Dopo copia file**: verificare `sudo systemctl status sgq-backend.service` — deve essere `active (running)`, non `activating (auto-restart)`.
3. **Log crash**: `sudo journalctl -u sgq-backend.service -n 120 --no-pager` — cercare `MODULE_NOT_FOUND` o errori env.
4. **Script**: `backend/scripts/deploy-controllers-to-vps.ps1` — esteso a routes, `server.js`, services; restart best-effort; spesso serve **sudo interattivo** per `systemctl restart`.

### Autenticazione API
- Il backend usa **`Authorization: Bearer`** (non cookie) per `authenticate`.
- Test in console **senza** header → 401 `AUTH_TOKEN_MISSING` è normale.
- Test **con** token da `localStorage.getItem('sgq_auth_token')` → deve essere 200 su endpoint esistenti.

### Report Word (checklist custom)
- Sempre **unire** risposte **locali** (`currentAudit.customResponses`) con **server** prima di `exportAuditToWord`.
- Regola merge: per ogni `custom_item_id`, se il server ha blocchi non vuoti → usa server; altrimenti usa locale.

### Documentazione correlata
- `docs/DEPLOY_TROUBLESHOOTING.md` — errori ricorrenti (batch PuTTY, password, 404 endpoint).
- `docs/DEPLOY_CHECKLIST_RELEASE.md` — ordine deploy frontend/backend.

---

## 3. Punto di ripresa (prossime sessioni)

- [ ] Verificare export Word su audit **2026-06** (o equivalente) con template associato: marker `CHECKLIST_MARKER` / `RILIEVI_MARKER` sostituiti e contenuto coerente.
- [ ] (Opzionale) Rendere `ExecStartPre=fuser` in systemd **non bloccante** (`-` prefix o `|| true`) per evitare `status=1` nei log.
- [ ] (Sicurezza) Ridurre uso password SSH in chiaro negli script; preferire chiave PuTTY / `SGQ_PUTTY_SESSION`.

---

## 4. Commit suggerito (frontend)

Dopo verifica build locale: `npm run build` in `app/`, poi commit messaggio tipo:

`fix(export): merge customResponses IndexedDB + server per report Word checklist custom`

---

## 5. Aggiornamento serale (19/03/2026)

### Fix consolidati in produzione (push su `main`)
- `0ce98bb` — export Word checklist custom con layout tabellare dinamico e template QTAFI.
- `ac5d981` — fix strutturale sync frontend/backend:
  - preserva `custom_checklist_id` negli update
  - evita fallback implicito ISO 9001 su audit custom-only
  - rende l'upsert non distruttivo quando alcuni campi non sono esplicitamente inviati
- `hardening 20/03` — ulteriore protezione anti-override audit custom:
  - frontend `syncService`: invia `custom_checklist_id` **solo se campo esplicito**
  - backend `upsertAudit`: ignorata cancellazione implicita a `null` (serve `custom_checklist_clear=true` per stacco esplicito)
  - backend `upsertAudit`: in INSERT rifiuta payload senza tipologia (`standard_id/standard_ids` o `custom_checklist_id`)

### Diagnosi dati audit `2026-06`
- audit trovato con `custom_checklist_id = NULL` e associazione standard legacy presente.
- tabella `audit_custom_checklist_responses` senza righe per l'audit (e vuota nel DB al momento del controllo).
- allegati presenti ma non agganciati a `custom_item_id`.

### Azione eseguita: hard cleanup completo audit test
- eliminazione definitiva audit `2026-06` e di tutti i dati correlati:
  - `audits`, `attachments`, `audit_custom_checklist_responses`, `audit_responses`,
    `pending_issues`, `audit_standards`, `non_conformities`
- verifica finale residui: `0`.

### Decisione architetturale per evitare recidive
- creata mini ADR: `docs/adr/ADR-006-auto-reconcile-cache-sync.md`
- obiettivo: auto-riallineamento cache locale/server senza intervento utente nei casi ordinari.

### Punto di ripresa immediato
- ricreare audit `2026-06` da zero come custom checklist e validare:
  - save -> reload -> relogin -> export Word.
- avviare implementazione Step 1 ADR-006 (`autoReconcileOnStartup`).
