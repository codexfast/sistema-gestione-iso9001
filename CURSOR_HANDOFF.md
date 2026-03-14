# 🤖 CURSOR AI AGENT — Handoff Document
# Sistema Gestione ISO 9001 / 14001 / 45001

> **Data handoff**: 2026-03-04 (sessione odierna)
> **Da**: Sessione Cursor AI 04/03/2026  
> **A**: Prossima sessione Cursor AI  
> **Stato progetto**: Beta — **Fase 1 multi-tenant completata** — server come fonte di verità, dev locale robusto  
> **Ultimo commit**: `7daf871` (branch `main`)

---

## 📌 REGOLA #1 — LEGGERE PRIMA DI TUTTO

```
"Calma, abbiamo un server — leggi la documentazione esistente
 prima di eseguire qualsiasi azione o generare codice."
```

**Ordine di lettura obbligatorio all'inizio di ogni sessione**:

1. Questo file (`CURSOR_HANDOFF.md`) — stato, decisioni, trappole
2. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — stack, infrastruttura, regole operative
3. [`docs/PROJECT_ROADMAP.md`](docs/PROJECT_ROADMAP.md) — stato componenti, backlog
4. [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — schema DB critico
5. [`docs/BACKEND_API.md`](docs/BACKEND_API.md) — endpoint attivi
6. [`docs/sessions/SESSION_NOTES_20260301.md`](docs/sessions/SESSION_NOTES_20260301.md) — ultima sessione (allegati, pending issues)
7. [`docs/open_points.md`](docs/open_points.md) — bug aperti + risolti con root cause

---

## 🏗️ ARCHITETTURA IN SINTESI

```
Frontend (React 18 PWA)         → Netlify (auto-deploy da branch main)
         ↕ HTTPS / Axios + JWT
Backend (Node.js 20 / Express)  → VPS Ubuntu www.fr-busato.it porta 3000 → HTTPS 8443 via Nginx
         ↕ mssql driver
Database (SQL Server)           → www.fr-busato.it,11043 / SGQ_ISO9001
         ↕
File Allegati                   → /var/www/sgq-backend/uploads/{year}/{month}/
```

- **Multi-tenant**: ogni query filtra su `organization_id`
- **Offline-first**: IndexedDB locale → sync server in background (server-wins su campi critici)
- **Auth**: JWT in cookie httpOnly (desktop) + localStorage (mobile PWA — transizione ADR-004)
- **Export Word**: `docxtemplater` + `pizzip` + OOXML injection su template `.docx`

---

## 📊 STATO FUNZIONALITÀ (2026-03-02)

### ✅ Completato in sessione 04/03/2026 — FASE 0 CHIUSA (commit `c4da815`)

| Fix/Feature | File | Descrizione |
|---|---|---|
| Auto-init checklist ISO 14001/45001 | `AuditAccordionLayout.jsx` | `STANDARD_INIT_MAP` scalabile — fix checklist vuota dopo reload (bug 0.2) |
| Retry rilievi pendenti | `PendingIssuesCascade.jsx` + `.css` | Pulsante Riprova per errori transitori rate-limiter/rete (bug 0.1) |
| Backend committato | `audit.controller.js` | Fix multi-standard già deployato, ora anche su git (commit `696df52`) |
| Word export multi-standard | `wordExportHelpers.js` | Intestazioni per standard, `extractSectionNum` corretto per ISO 14001 |
| ExportPanel titolo dinamico | `ExportPanel.jsx` | Titolo mostra standard effettivi (es. "ISO_9001 + ISO_14001") |
| ADR-004 auth mobile | — | **GIÀ IMPLEMENTATA** — `apiService.js` usa già localStorage + Bearer token |
| Rilievi pendenti reali in Word | `ExportPanel.jsx` | **GIÀ IMPLEMENTATA** — usa `checkReaudit` + `getNcResponses` |

**Commit history sessione**: `531dc1a` → `696df52` → `c4da815`

### ✅ Completato in sessione 03/03/2026 (commit `6317215`)

| Fix | File | Descrizione |
|---|---|---|
| auditConverter array/string | `auditConverter.js` | `standards` gestito sia come stringa CSV (lista) che array oggetti (dettaglio) |
| Checkbox standard | `GeneralDataSection.jsx` | Normalizza `ISO_9001_2015` → `ISO_9001` per match corretto con `selectedStandards` |
| Blocco deselezione | `GeneralDataSection.jsx` + `AuditAccordionLayout.jsx` | Standard con dati esistenti non deselezionabili (prop `standardsWithData`) |
| Sync multi-standard | `syncService.js` + `audit.controller.js` | Invia `standard_ids:[1,2]` — aggiorna `audit_standards` per tutti gli standard |

**Deploy backend eseguito**: `audit.controller.js` caricato via pscp + `systemctl restart sgq-backend` (systemd gestisce il backend, NON usare `fuser` da solo).

---

### ✅ Completato e Deployato su VPS + Netlify

| Area | Componenti/File chiave |
|---|---|
| Auth JWT | `auth.controller.js`, `AuthContext.jsx`, `apiService.js` |
| Audit CRUD | `audit.controller.js`, `AuditSelector.jsx`, `Dashboard.jsx` |
| Checklist ISO 9001:2015 | 35 domande da DB (standard_id=1, questionId 87–121) |
| Checklist ISO 14001:2015 | 46 domande da DB (standard_id=2, questionId 122–167, sezioni `14001_s4`/`14001_s5`) |
| 6 stati conformità | C / NC / OSS / OM / NA / NV — CHECK constraint fisso in DB |
| Sync offline-first | `syncService.js`, `IndexedDBProvider.js`, `StorageContext.jsx` |
| Allegati | `AttachmentSection.jsx`, `AttachmentPreview.jsx`, `attachment.controller.js` |
| Rilievi pendenti | `PendingIssuesCascade.jsx`, `pending_issues` table (migration 018) |
| Re-audit | `checkReaudit` endpoint deployato, `AuditSelector.jsx` chiama l'API |
| Export Word | `wordExport.js` — template-based su `ISO9001-audit-report.docx` |
| Multi-standard UI | Tab checklist ISO 9001 + ISO 14001 nell'accordion |
| Fix selezione standard | `norms→selectedStandards`, accordion `_2015`/`_2018`, `standard_id` intero in sync |

### 🔲 Backlog ordinato per priorità

#### ✅ FASE 0 — Completata al 100% (sessione 04/03/2026)

Tutti i bug e feature di Fase 0 sono chiusi. Nessun task ALTA in sospeso.

**Prossima fase**: Fase 1 — DB multi-tenant + RBAC + anagrafica aziende (6-8 settimane)

#### 🟡 MEDIA

| # | Task | File coinvolti | Note |
|---|---|---|---|
| 5 | **SyncService offline allegati** | `syncService.js`, `IndexedDBProvider.js` (v3), `useAttachmentManager.js` | Store `attachments` mancante in IndexedDB |
| 6 | **Seed ISO 45001** | `database/migrations/019_seed_iso45001.sql` | Stesso pattern di `migration-012.js` |

#### 🟡 MEDIA — Nuovi requisiti (03/03/2026)

| # | Task | File coinvolti | Note |
|---|---|---|---|
| 6 | **Audit locking — accesso concorrente** | `audit.controller.js`, nuovo `AuditLockBanner.jsx` | Due utenti non possono modificare lo stesso audit contemporaneamente → pessimistic lock con TTL + notifica visiva |
| 7 | **Offline resilience Android** | `syncService.js`, `IndexedDBProvider.js`, `useAttachmentManager.js` | Su Android: quota 50MB IndexedDB, Service Worker limitato, File API assente → gestione esplicita errori + feedback utente |

#### 🟢 BASSA

| # | Task | Note |
|---|---|---|
| 8 | Multi-tab sync logout | `AuthContext.jsx` — `window.addEventListener('storage', ...)` |
| 9 | Auto-logout inattività 4h | `AuthContext.jsx` — `setTimeout` reset su eventi utente |
| 10 | CSP header | `app/index.html` |
| 11 | Refresh token automatico | interceptor Axios 401 → `POST /auth/refresh` |
| 12 | Email alert NC scadute | cron job backend |
| 13 | Nginx porta 443 | prerequisito per Office Online preview Word/Excel |
| 14 | Allineamento `/audits` vs `/audits/sync` | `/audits` usa `standard_ids[]`, `/audits/sync` usa `standard_id` singolo |
| 15 | Deprecare `audits.standard_id` | → solo `audit_standards` junction table |

---

## 🔑 DECISIONI ARCHITETTURALI CRITICHE

### ADR-004: Auth Mobile → localStorage JWT

**Problema**: Android PWA standalone blocca cookie httpOnly (SameSite policy) → loop login infinito.  
**Soluzione adottata**: JWT anche in `localStorage` + `Authorization: Bearer` header.  
**Dettaglio completo**: [`docs/adr/ADR-004-mobile-auth-localstorage.md`](docs/adr/ADR-004-mobile-auth-localstorage.md)

**TODO da implementare**:
- `auth.controller.js` → aggiungere `token` in response body (mantenere cookie per desktop)
- `apiService.js` → `login()` salva in `localStorage`; interceptor aggiunge `Authorization: Bearer`
- `AuthContext.jsx` → `validateStoredToken()` legge da localStorage; `logout()` pulisce localStorage

---

### ADR-005: Allegati su Filesystem Linux (migration-ready Azure)

**Preview allegati**: `fetch()` con header Authorization → blob → `URL.createObjectURL()`  
**NON** usare `<img src="...?token=">` per CORS su porta 8443 da Netlify.  
**Dettaglio completo**: [`docs/adr/ADR-005-attachment-storage-strategy.md`](docs/adr/ADR-005-attachment-storage-strategy.md)

```javascript
// ✅ CORRETTO
const blob = await apiService.fetchAttachmentBlob(attachmentId);
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
setTimeout(() => URL.revokeObjectURL(url), 10000);

// ❌ SBAGLIATO — CORS blocca
<img src={`https://www.fr-busato.it:8443/api/v1/attachments/${id}/view?token=${token}`} />
```

---

### Pending Issues Flow (decisione sessione 01/03/2026)

- **Trigger**: `conformity_status IN ('NC', 'OSS')` — OM **escluso** (è osservazione minore, non rilievo)
- **Fonte dati**: tabella `pending_issues` (migration 018), auto-popolata
- **Endpoint**: `POST /api/v1/audits/check-reaudit` — **già deployato**
- `AuditSelector.jsx` **chiama già** `checkReaudit()` ma manca UI che mostra la lista
- **Colonne usate**: `section_code` (NON `clause_number` — non esiste in DB)

---

### Template Word — uno per sistema (decisione 04/03/2026)

Ogni standard avrà **il proprio template** e la propria tab nell'UI:
- ISO 9001 → `ISO9001-audit-report.docx` (versione attuale da ripristinare a solo ISO 9001)
- ISO 14001 → template da estrarre da file sorgente utente
- ISO 45001 → template da estrarre da file sorgente utente

Il template attuale (modificato in sessione 04/03 con intestazioni multi-standard) va **riportato alla versione precedente** quando si implementerà la UI a tab per standard (Fase 2). L'utente ha i file sorgente per estrarre i template di ogni sistema.

---

### Word Export (architettura template-based)

```
Template: app/public/templates/ISO9001-audit-report.docx (editabile in Word)
Lib:      docxtemplater + pizzip    ← NON il package npm "docx"
Pattern:  {segnaposto} per scalari, CHECKLIST_MARKER/RILIEVI_MARKER per OOXML injection
```

Vedere [`FASE_8_EXPORT_WORD.md`](FASE_8_EXPORT_WORD.md) per la spec completa.

---

### Coerenza standard_id (contesto tecnico decisioni 01/03/2026)

4 bug corretti in commit `9894ed5` (leggere `docs/SESSION_NOTES_20260301.md` §seconda parte):
1. `formData.norms` non mappato a `selectedStandards` nel modal creazione
2. Accordion accordion checklist ISO 14001 non visibile con codice `ISO_14001_2015`
3. `backendToFrontend` restituiva formato inconsistente senza sfruttare junction table
4. `syncService` inviava stringa `"ISO_9001"` invece di intero `1` al server

---

## 🗄️ DATABASE — RIFERIMENTO RAPIDO

**Connessione**: `www.fr-busato.it,11043` / DB: `SGQ_ISO9001`  
**Credenziali**: `pascarella` / `#Gestione2025@` (in `.env`, MAI in repo)

```sql
-- conformity_status CHECK constraint (NON modificare mai)
'C', 'NC', 'OSS', 'OM', 'NA', 'NV', NULL

-- audit.status
'draft', 'in_progress', 'completed', 'approved'

-- question_type (MAIUSCOLO obbligatorio)
'TEXT', 'YES_NO', 'MULTIPLE_CHOICE'

-- Standards
standard_id = 1  →  ISO 9001:2015    (35 domande, questionId 87-121)
standard_id = 2  →  ISO 14001:2015   (46 domande, questionId 122-167)
standard_id = 3  →  ISO 45001:2018   (0 domande — da fare migration 019)

-- checklist_sections.section_code  →  VARCHAR(10): max 10 caratteri!
-- Usare '14001_s4', non 'iso14001_s4' (12 char troppo lungo)

-- checklist_questions colonne REALI (NON esistono clause_number né requirement_reference)
question_id, question_uuid, section_code, question_text, question_type,
display_order, is_mandatory, is_active, created_at, updated_at, standard_id
```

**Migration history** (vedi `docs/DATABASE_SCHEMA.md`):

| Migration | Descrizione | Stato |
|---|---|---|
| 001-010 | Schema base, checklist, multi-standard | ✅ Eseguita |
| 011-016 | Response history, trigger, email log | ✅ Eseguita |
| 017 | `attachments.question_id` + `attachment_uuid` | ✅ Eseguita |
| 018 | Tabella `pending_issues` con FK NO ACTION su `source_response_id` | ✅ Eseguita |
| 019 | Seed ISO 45001 `checklist_questions` | 🔲 Da creare |

---

## 🌐 API — RIFERIMENTO RAPIDO

**Base URL**: `https://www.fr-busato.it:8443/api/v1`

```
POST /auth/login                          → {success, token, user} + cookie httpOnly
POST /auth/logout
GET  /auth/validate

GET    /audits                            → lista paginata (org filter)
POST   /audits                            → crea (body: standard_ids: number[])
GET    /audits/:id
PUT    /audits/:id
DELETE /audits/:id
GET    /audits/:id/statistics
GET    /audits/:id/pending-issues         → NC/OSS da audit precedente stesso cliente
GET    /audits/:id/nc-responses           → risposte NC/OSS per export
POST   /audits/check-reaudit              → {has_previous_audit, pending_count, last_audit_id}
POST   /audits/sync                       → upsert offline (standard_id: number singolo)

GET    /audit-responses/audit/:id         → tutte le risposte di un audit
POST   /audit-responses/bulk              → salva risposte in batch
GET    /audit-responses/audit/:id/pending-issues  → alias pending issues

GET    /attachments?audit_id=&question_id=
POST   /attachments/upload                → multipart/form-data
GET    /attachments/:id/download?token=  → stream file (inline img/PDF)
GET    /attachments/:id/view?token=      → preview inline
PUT    /attachments/:id/replace          → sostituisce (solo desktop)
DELETE /attachments/:id

GET    /standards                         → lista standard disponibili
GET    /standards/:id/sections            → sezioni checklist
GET    /standards/:id/questions           → domande checklist
```

---

## 🖥️ INFRASTRUTTURA

| Risorsa | Dettaglio |
|---|---|
| SSH | `ssh spascarella@www.fr-busato.it -p 1122` pwd: `Sistemi@2026` |
| Backend path | `/var/www/sgq-backend/` |
| Log backend | `/var/www/sgq-backend/app.log` |
| Upload path | `/var/www/sgq-backend/uploads/{year}/{month}/` |

### Restart Backend (NO `;` dopo `fuser`)

```bash
fuser -k 3000/tcp
sleep 2 && cd /var/www/sgq-backend && nohup node src/server.js > /var/www/sgq-backend/app.log 2>&1 &
sleep 4 && cat /var/www/sgq-backend/app.log
```

### Deploy Backend

```bash
# Upload singolo file
pscp -P 1122 -pw "Sistemi@2026" "backend/src/controllers/auth.controller.js" \
  spascarella@www.fr-busato.it:/var/www/sgq-backend/src/controllers/auth.controller.js
# poi restart backend
```

### Deploy Frontend

```bash
git add -A && git commit -m "feat: descrizione" && git push origin main
# Netlify auto-deploya in ~2 minuti
```

---

## 📁 STRUTTURA REPOSITORY (cartelle chiave)

```
app/
  src/
    components/
      AttachmentSection.jsx      ✅ Upload + lista allegati per risposta
      AttachmentPreview.jsx      ✅ Preview lazy-blob (file attivo nell'editor)
      PendingIssuesCascade.jsx   ✅ Lista NC/OSS/NV read-only con note
      AuditSelector.jsx          ✅ Dropdown + checkReaudit + CreateAuditModal
      ChecklistModule.jsx        ✅ Domande checklist multi-standard
      AuditAccordionLayout.jsx   ✅ Struttura accordion (fix _2015 codes)
      GeneralDataSection.jsx     ✅ Dati generali + selezione standard
      Dashboard.jsx              ✅
    contexts/
      AuthContext.jsx            ⚠️  Fix mobile (ADR-004) — da modificare
      StorageContext.jsx         ✅ State management centrale
    services/
      apiService.js              ✅ Axios + interceptors + fetchAttachmentBlob
      syncService.js             ⚠️  syncUploadAttachment non connesso a IndexedDB
      IndexedDBProvider.js       ⚠️  Manca store 'attachments' v3
      checklistService.js        ✅
    hooks/
      useAttachmentManager.js    ⚠️  Offline sync allegati non completo
    utils/
      wordExport.js              ⚠️  RILIEVI_MARKER hardcoded, manca ISO 14001
      auditConverter.js          ✅ backendToFrontend/frontendToBackend (fix `9894ed5`)
    data/
      checklistTemplates.js      ✅ ISO 9001 (35q) + ISO 14001 (46q) con questionId reali
      auditDataModel.js          ✅ createNewAudit, ISO_STANDARDS enum

backend/
  src/
    controllers/
      auth.controller.js         ✅ (da modificare per ADR-004 localStorage)
      audit.controller.js        ✅ checkReaudit, pending-issues, sync
      attachment.controller.js   ✅ view/download/upload/replace
      response.controller.js     ✅ bulk save, pending-issues
    routes/
      audit.routes.js            ✅
      attachment.routes.js       ✅
    middleware/
      auth.middleware.js         ✅ authenticate + authenticateDownload (?token=)

database/
  migrations/
    010_update_iso9001_35questions.sql  ✅ 35 domande ISO 9001
    017_add_question_id_to_attachments.sql  ✅
    018_pending_issues.sql              ✅
    019_seed_iso45001.sql               🔲 DA CREARE

app/public/
  templates/
    ISO9001-audit-report.docx          ← template Word editabile con segnaposto

docs/
  adr/
    ADR-001-multi-agent-workflow.md
    ADR-002-offline-first-sync.md
    ADR-003-bidirectional-sync.md
    ADR-003-database-architecture-processes-analysis.md
    ADR-003-pwa-mobile-android-strategy.md
    ADR-004-mobile-auth-localstorage.md    ← decisione auth mobile
    ADR-005-attachment-storage-strategy.md ← strategia allegati
  PROJECT_ROADMAP.md          ← stato avanzamento aggiornato al 01/03/2026
  DATABASE_SCHEMA.md          ← LEGGERE PRIMA DI TOCCARE IL DB
  MANUALE_UTENTE.md           ← flusso utente verificato su codice
  sessions/SESSION_NOTES_20260301.md   ← ultima sessione: fix standard, allegati, pending issues
  open_points.md              ← bug #006-#009 risolti, P1/P2 aperti

CURSOR_HANDOFF.md             ← QUESTO FILE: punto di ingresso per Cursor
PROJECT_CONTEXT.md            ← regole operative, stack, infrastruttura
docs/BACKEND_API.md           ← spec endpoint completa
FASE_8_EXPORT_WORD.md         ← spec export Word (leggere prima di toccare wordExport.js)
ARCHITETTURA_ESRS_PWA_PER_AI_AGENT.md  ← data model audit completo
```

---

## 🏛️ VISIONE STRATEGICA — SaaS Multi-Tenant (decisione 03/03/2026)

### Modello di business
```
QS Studio (admin globale)
  └── Auditor/Studio consulenza (nostro cliente, paga abbonamento per standard)
        └── Aziende auditate (clienti dell'auditor, accesso read-only ai propri audit)
```

### Approccio di sviluppo: Dark Launch (feature flag per tab)
Ogni nuovo modulo (standard, anagrafica, checklist libera) viene sviluppato come **tab nascosta**:
- Visibile solo agli admin QS Studio durante sviluppo e test
- Rilasciata agli auditor solo quando stabile e collaudata
- Zero interruzioni all'operatività corrente

### Roadmap fasi (dettaglio in `docs/PROJECT_ROADMAP.md`)
| Fase | Contenuto | Stima |
|---|---|---|
| **0** | Chiusura bug minori correnti | 1-2 settimane |
| **1** | DB multi-tenant + RBAC + anagrafica aziende | 6-8 settimane |
| **2** | UI a tab per standard + feature flags + nuova UX | 6-8 settimane |
| **3** | Sistema licenze/abbonamenti per standard | 3-4 settimane |
| **4** | Checklist libera + gap analysis + query conformità | 6-8 settimane |
| **5** | Workflow implementazione SGQ (post-audit) | 8-12 settimane |

### Decisione architetturale: backend systemd
Il backend gira come **servizio systemd** (`sgq-backend.service`).
- ✅ Restart corretto: `sudo systemctl restart sgq-backend.service`
- ❌ NON usare `fuser -k 3000/tcp` da solo — systemd lo rilancia immediatamente
- Comando completo: `echo 'Sistemi@2026' | sudo -S systemctl restart sgq-backend.service`

---

## ⚠️ TRAPPOLE CRITICHE (da NON ripetere)

| Trappola | Dettaglio |
|---|---|
| `tail -N file` dopo `fuser` | NON funziona su questa shell SSH → usare `cat` |
| Concatenare restart con `;` | `fuser -k 3000/tcp ; nohup...` → il nohup non parte → comandi su righe separate |
| Restart con fuser diretto | Il backend gira su **systemd** → `fuser -k` viene ignorato (systemd rilancia) → usare `systemctl restart` |
| SSH da shell Cursor | La porta 1122 può essere bloccata dalla rete — se timeout, usare PowerShell esterno o verificare con `Test-NetConnection -Port 1122` |
| `clause_number` in query | La colonna NON esiste → usare `section_code` (errore 500 commit `a298190`) |
| `<img src="...?token=">` | CORS blocca su porta 8443 da Netlify → usare `fetch()` + blob |
| Package npm `docx` | Il progetto usa `docxtemplater` + `pizzip` — sono diversi! |
| Modificare conformity_status | CHECK constraint fisso: solo `C NC OSS OM NA NV NULL` |
| `question_type` minuscolo | Il DB usa MAIUSCOLO: `'TEXT'` non `'text'` |
| `checklist_sections.section_code` | `VARCHAR(10)` → max 10 char: `'14001_s4'` ok, `'iso14001_s4'` no |
| Migration 010 doppia esecuzione | Il DB ha già le 35 domande ISO 9001 — verificare con COUNT prima di rieseguire |
| `standard_id` vs `standard_ids` | `/audits` (create) usa array `standard_ids: [1,2]`; `/audits/sync` usa scalare `standard_id: 1` |
| Rate limiter 429 | Dopo molte request → attendere 15 min o riavviare backend |

---

## 🧪 CHECKLIST DI VERIFICA PRE-SVILUPPO

```bash
# 1. Backend attivo?
curl https://www.fr-busato.it:8443/health

# 2. Login funziona?
curl -X POST https://www.fr-busato.it:8443/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sgq.local","password":"Admin123!"}'

# 3. Domande ISO 9001 nel DB (atteso: 35)
# via SSMS o migration script Node.js:
SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 1;  -- 35
SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2;  -- 46
```

```javascript
// Browser DevTools Console — stato IndexedDB
const req = indexedDB.open('SGQ_ISO9001');
req.onsuccess = e => console.log('DB version:', e.target.result.version);

// Verifica token (dopo ADR-004 implementato)
localStorage.getItem('authToken');
```

---

## 🚀 PROSSIME AZIONI (prossima sessione)

### Sessione immediata — Inizio Fase 1: DB multi-tenant

```
PRIMA DI SCRIVERE CODICE:
1. Leggere docs/PROJECT_ROADMAP.md §Fase 1 per schema tabelle
2. Leggere docs/DATABASE_SCHEMA.md per tabelle esistenti e vincoli
3. Proporre all'utente la migration SQL e aspettare approvazione esplicita
4. Solo dopo approvazione: eseguire migration su DB di test (organization_id=99)
5. Poi adattare backend middleware RBAC
6. Poi adattare frontend con pagina Anagrafica Aziende
```

**Tabelle nuove da creare (già progettate in PROJECT_ROADMAP.md §Fase 1)**:
- `companies` (aziende auditate — clienti degli auditor)
- `auditor_orgs` (studi di consulenza — nostri clienti)
- `user_org_roles` (ruoli per utente per organizzazione)
- `subscriptions` (abbonamenti per standard)

**Modifiche tabelle esistenti**:
- `audits.company_id` FK → `companies.id` (nullable, retrocompatibile)
- `users.auditor_org_id` FK → `auditor_orgs.id`

---

### Sessione precedente — Test E2E su Netlify (commit `9894ed5`)

```
1. Aprire https://systemgest.netlify.app
2. Creare nuovo audit con ISO 9001 + ISO 14001 selezionati nel modal
3. Verificare DevTools → IndexedDB → audit.metadata.selectedStandards = ["ISO_9001","ISO_14001"]
4. Aprire accordion Checklist → verificare che appaia TAB "ISO 9001:2015" + TAB "ISO 14001:2015"
5. Selezionare Dati Generali → 1.1 → aggiungere ISO 14001 da checkbox → verificare tab in Checklist
6. Rispondere a domande ISO 14001 → verifica sync su backend
   curl https://www.fr-busato.it:8443/api/v1/audits/{id}/statistics -H "Authorization: Bearer TOKEN"
7. Ricaricare pagina → verificare che risposte ISO 14001 siano ripristinate
```

### Sprint successivo — Export Word ISO 14001

```
1. Leggere: FASE_8_EXPORT_WORD.md (spec segnaposto e pattern OOXML)
2. Aprire: app/src/utils/wordExport.js
3. Trovare la funzione che genera le righe della tabella checklist (ISO 9001)
4. Duplicare/parametrizzare per accettare anche ISO_14001
5. Verificare output scaricando il .docx prodotto
```

---

*Aggiornare questo file ad ogni sessione con: nuovi bug risolti, decisioni prese, stato backlog.*
