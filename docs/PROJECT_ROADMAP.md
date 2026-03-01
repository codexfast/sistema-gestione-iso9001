# ðŸ“‹ Roadmap Implementazione Sistema Gestione ISO 9001

> **Basato su**: [ADR-003](adr/ADR-003-database-architecture-processes-analysis.md)  
> **Data Inizio**: 13 gennaio 2026  
> **Ultimo Aggiornamento**: 01 marzo 2026
**Prossimo Review**: dopo implementazione Export Report Word
> **Prossimo Step**: Report Word (Export DOCX)

---

## ðŸŽ¯ Obiettivi Progetto

### Obiettivi Primari

1. **Audit ISO 9001**: Checklist dinamica da DB, 6 stati conformitÃ  âœ…
2. **Gestione Allegati**: Upload, preview, download, replace per ogni risposta âœ…
3. **Rilievi Pendenti (Cascade)**: NC/OSS/NV ereditati da audit precedente âœ…
4. **Offline-First PWA**: IndexedDB + sync â†’ server-wins su campi critici âœ…
5. **Export Report Word**: DOCX con intestazione, conformitÃ , rilievi ðŸ”²
6. **Multi-Standard**: ISO 14001 / ISO 45001 (seed dati) ðŸ”²
7. **Email Alert NC Scadute**: Cron giornaliero ðŸ”²
8. **RBAC / Anagrafica**: Clienti, utenti, permessi per organizzazione ðŸ”²

---

## ðŸ“… Stato Avanzamento al 01/03/2026

| Area                      | Descrizione                                      | Status         |
|---------------------------|--------------------------------------------------|----------------|
| **DB migrations**         | Migration 001-018 (incluso `pending_issues`)     | âœ… Completato  |
| **Auth / JWT**            | Cookie httpOnly, CORS, `authenticateDownload`    | âœ… Completato  |
| **Checklist API-driven**  | 6 stati (C/NC/OSS/OM/NA/NV), API da DB           | âœ… Completato  |
| **Audit CRUD**            | Crea, modifica, elimina, lista, statistiche      | âœ… Completato  |
| **Sync offline-first**    | IndexedDB â†’ server, server-wins, retry/backoff   | âœ… Completato  |
| **Allegati**              | Upload, preview blob, replace (desktop), delete  | âœ… Completato  |
| **Rilievi pendenti**      | `checkReaudit`, NC/OSS/NV cascade, note visibili | âœ… Completato  |
| **Export Report Word**    | DOCX via `docx` lib, dati reali da DB            | ðŸ”² Prossimo    |
| **Multi-standard seed**   | ISO 14001 / ISO 45001 checklist                  | ðŸ”² Backlog     |
| **Email NC alert**        | Cron job giornaliero                             | ðŸ”² Backlog     |
| **RBAC / Anagrafica**     | Clienti â†’ FK, ruoli utente                       | ðŸ”² Backlog     |
| **Nginx porta 443**       | Prerequisito per Office Online preview           | ðŸ”² Bassa prio  |
| **Azure Blob Storage**    | Sostituzione storage locale                      | ðŸ”² Backlog     |

**Progress Overall**: â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘ ~65% funzionalitÃ  core

---

## ðŸ—‚ï¸ Breakdown per Area Funzionale

### 1ï¸âƒ£ Database Schema

**Stato al 01/03/2026**: Migration 001-018 eseguite âœ…

| Migration | Nome                        | Status        |
|-----------|-----------------------------|---------------|
| 001-005   | Schema base (legacy)        | âœ… Deployata  |
| 006       | `fix_conformity_status`     | âœ… Deployata  |
| 007-008   | NC management               | âœ… Deployata  |
| 009-010   | Multi-standard base         | âœ… Deployata  |
| 011-012   | Response history + trigger  | âœ… Deployata  |
| 013       | Attachments base            | âœ… Deployata  |
| 014-016   | Email log, lookup           | âœ… Deployata  |
| 017       | `attachments.question_id`   | âœ… Deployata  |
| 018       | `pending_issues` table      | âœ… Deployata  |

**Schema critici attuale**:

```sql
-- conformity_status valori CHECK constraint
'C', 'NC', 'OSS', 'OM', 'NA', 'NV', NULL

-- pending_issues (migration 018)
issue_id, target_audit_id FKâ†’audits (CASCADE),
source_audit_id FKâ†’audits, question_id FKâ†’checklist_questions,
source_response_id INT NULL FKâ†’audit_responses (NO ACTION),
status CHECK('open','resolved','persists'),
original_status CHECK('NC','OSS','OM'),
resolution_notes, organization_id FKâ†’organizations, created_at, updated_at

-- attachments (migration 017)
attachment_id, attachment_uuid, audit_id, nc_id, question_id FKâ†’checklist_questions,
file_name, file_type, file_size, mime_type, storage_path,
category DEFAULT 'evidence', description, uploaded_by, created_at

-- checklist_questions colonne reali
question_id, question_uuid, section_code, question_text, question_type,
display_order, is_mandatory, is_active, created_at, updated_at, standard_id
-- âš ï¸ NON esiste clause_number nÃ© requirement_reference
```

---

### 2ï¸âƒ£ Backend API

**Path**: `/var/www/sgq-backend/src/`  
**Porta**: 3000 (proxy Nginx â†’ HTTPS 8443)

#### Endpoint Implementati âœ…

| Endpoint                               | Status        | Note                                    |
|----------------------------------------|---------------|-----------------------------------------|
| `GET /api/v1/audits`                   | âœ… Attivo     | Lista audit org                         |
| `GET /api/v1/audits/:id`               | âœ… Attivo     | Dettaglio                               |
| `GET /api/v1/audits/:id/statistics`    | âœ… Attivo     | Riepilogo conformitÃ                     |
| `GET /api/v1/audits/:id/pending-issues`| âœ… Attivo     | NC/OSS/NV da audit precedente           |
| `POST /api/v1/audits/check-reaudit`    | âœ… Attivo     | Verifica se esiste audit precedente     |
| `POST /api/v1/audits/sync`             | âœ… Attivo     | Upsert offline sync                     |
| `POST/PUT/DELETE /api/v1/audits`       | âœ… Attivo     | CRUD                                    |
| `GET /api/v1/attachments`              | âœ… Attivo     | Lista con `?audit_id=&question_id=`     |
| `POST /api/v1/attachments/upload`      | âœ… Attivo     | Multer, salva in `./uploads/YYYY/MM/`   |
| `GET /api/v1/attachments/:id/download` | âœ… Attivo     | `?token=` (legacy img/iframe)           |
| `GET /api/v1/attachments/:id/view`     | âœ… Attivo     | `authenticateDownload` inline           |
| `PUT /api/v1/attachments/:id/replace`  | âœ… Attivo     | Owner check + elimina file vecchio      |
| `DELETE /api/v1/attachments/:id`       | âœ… Attivo     |                                         |

#### Endpoint Mancanti ðŸ”²

| Endpoint                              | PrioritÃ   | Note                                        |
|---------------------------------------|-----------|---------------------------------------------|
| `GET /api/v1/audits/:id/report/word`  | ðŸ”´ Alta   | Prossimo â€” export DOCX                      |
| `GET /api/v1/email-alert/nc-expired`  | ðŸŸ¡ Media  | Cron job NC scadute                         |
| `GET /api/v1/users/:id/export-gdpr`   | ðŸŸ¢ Bassa  |                                             |

---

### 3ï¸âƒ£ Frontend (React PWA)

**Deploy**: Netlify auto da branch `main` â†’ `https://systemgest.netlify.app`

#### Componenti Principali âœ…

| File                              | Stato         | Note                                               |
|-----------------------------------|---------------|----------------------------------------------------|
| `AuditSelector.jsx`               | âœ… Completato | `checkReaudit()` live da API                       |
| `PendingIssuesCascade.jsx`        | âœ… Completato | Lista NC/OSS/NV read-only con note visibili        |
| `AttachmentSection.jsx`           | âœ… Completato | Upload + filtra giÃ -sincronizzati (no doppio banner)|
| `AttachmentPreview.jsx`           | âœ… Completato | Banner cliccabili lazy-blob, no thumbnail           |
| `AttachmentPreview.css`           | âœ… Completato | `.preview-file-row`, `.pf-action-btn`              |
| `AuditObjectiveSection.jsx`       | âœ… Completato |                                                    |
| `Dashboard.jsx`                   | âœ… Completato |                                                    |
| `apiService.js`                   | âœ… Completato | `fetchAttachmentBlob()`, `replaceAttachment()`, ecc|

#### Logica Allegati (architettura definitiva)

```
Upload  â†’ multipart/form-data con JWT cookie
Preview â†’ fetch() con Authorization: Bearer header â†’ blob â†’ URL.createObjectURL
          (NON <img src="...?token="> per file cross-origin su porta 8443)

Tipi file:
  immagini / PDF / testo  â†’ action "open"    â†’ window.open(blobUrl, "_blank")
  Word / Excel / PPT      â†’ action "download" â†’ <a download> click
  
Replace â†’ PUT /attachments/:id/replace (solo desktop: CSS @media hover:hover)
```

#### Componenti Mancanti ðŸ”²

| File                          | PrioritÃ   | Note                                              |
|-------------------------------|-----------|---------------------------------------------------|
| `WordExportButton.jsx`        | ðŸ”´ Alta   | Chiama `GET /audits/:id/report/word` â†’ blob .docx |
| Sezione Report in UI          | ðŸ”´ Alta   | GiÃ  presente "Export Report" in fondo checklist   |

---

### 4ï¸âƒ£ Architettura Offline-First

| Componente     | Stato         | Note                                          |
|----------------|---------------|-----------------------------------------------|
| IndexedDB cache| âœ… Attivo     | Audit + risposte                              |
| SyncService    | âœ… Attivo     | Batch + retry + backoff esponenziale          |
| Conflict notify| âœ… Attivo     | Server-wins + notifica utente                 |
| Offline upload | ðŸ”² Backlog   | File da IndexedDB â†’ server al sync            |

---

## ðŸ”¥ Note Architetturali Permanenti

| Decisione                        | Motivazione                                             |
|----------------------------------|---------------------------------------------------------|
| `fetchAttachmentBlob()` non `<img src>` | Browser non invia Authorization header cross-origin |
| `conformity_status` trigger pendenti: NC/OSS/NV | OM escluso (Ã¨ osservazione minore, non rilievo) |
| `section_code` non `clause_number` | Colonna reale in `checklist_questions`             |
| Office Online non funziona       | Richiede porta 443 standard (Nginx attuale: 8443)       |
| `fuser -k 3000/tcp` separato     | `tail` non funziona concatenato con `;` su questa shell |

---

## ðŸš€ Prossimi Step (PrioritÃ )

### 1. Export Report Word ðŸ”´ (prossimo sprint)

```
Backend:
  1. Verificare dipendenza: cat /var/www/sgq-backend/package.json | grep docx
  2. Creare: backend/src/controllers/report.controller.js
  3. Aggiungere route: GET /api/v1/audits/:id/report/word
  4. Dati: intestazione audit + riepilogo conformitÃ  + rilievi (section_code, question_text, notes)
           + lista allegati per rilievo + rilievi pendenti

Frontend:
  5. apiService.getWordReport(auditId) â†’ fetch blob â†’ <a download="report.docx">
  6. Collegare "Export Report" button giÃ  in UI

Riferimento: FASE_8_EXPORT_WORD.md (spec esistente â€” leggere prima di implementare)
```

### 2. Nizgin porta 443 (bassa prioritÃ )

```
Prerequisito per Office Online preview (Word/Excel inline nel browser).
Attualmente backend esposto su :8443, Microsoft non raggiunge porte non-standard.
```

### 3. Multi-Standard (backlog)

```
Seed dati ISO 14001 / ISO 45001 in checklist_questions.
standard_id giÃ  presente in DB schema.
```

### 4. RBAC / Anagrafica (backlog)

```
client_name â†’ FK verso tabella clients.
Ruoli utente per organizzazione.
```

---

## ðŸ“š Riferimenti

- **Session Notes 01/03/2026**: [docs/SESSION_NOTES_20260301.md](SESSION_NOTES_20260301.md)
- **ADR-003**: [Analisi Architettura Database](adr/ADR-003-database-architecture-processes-analysis.md)
- **ADR-001**: [Multi-Agent Workflow](adr/ADR-001-multi-agent-workflow.md)
- **Export Word spec**: [FASE_8_EXPORT_WORD.md](../FASE_8_EXPORT_WORD.md)
- **Style Guide**: [.github/instructions/style.instructions.md](../.github/instructions/style.instructions.md)
- **API Base**: `https://www.fr-busato.it:8443/api/v1`
- **Frontend**: `https://systemgest.netlify.app`
- **SSH**: `ssh spascarella@www.fr-busato.it -p 1122`

---

**Ultimo Aggiornamento**: 01 marzo 2026 (pomeriggio — commit `9894ed5`)
**Prossimo Review**: dopo test E2E fix standard selection + Export Word ISO 14001

---

## Aggiornamento stato 01/03/2026 (seconda parte)

### Nuovi completamenti

| Area | Dettaglio | Commit |
|---|---|---|
| **ISO 14001 checklist DB** | 46 domande, sezioni `14001_s4`/`14001_s5`, questionId 122–167 | `9d4a0da` (sessione mattina) |
| **Fix standard selection (4 bug)** | Vedi SESSION_NOTES_20260301.md §seconda parte | `9894ed5` |
| **Manuale utente v1.1** | `docs/MANUALE_UTENTE.md` — flusso completo verificato su codice | `5fec508` |

### Stato multi-standard aggiornato

| Standard | DB | Frontend | Sync server | Export Word |
|---|---|---|---|---|
| ISO 9001:2015 | ✅ 35 q (id 87–121) | ✅ Completo | ✅ | ✅ |
| ISO 14001:2015 | ✅ 46 q (id 122–167, sezioni `14001_s4`/`14001_s5`) | ✅ Completo | ✅ (fix `9894ed5`) | ❌ Backlog |
| ISO 45001:2018 | ❌ 0 domande | ⚠️ Placeholder UI | ❌ | ❌ |

### Debito tecnico standard_id (da ADR futuro)

- `audits.standard_id` colonna legacy — ancora usata da `/audits/sync`
- `audit_standards` junction table già presente per multi-standard
- `/audits` (create) usa `standard_ids: number[]`; `/audits/sync` usa `standard_id: number` singolo — interfacce asimmetriche
- `checklist_sections.section_code` è `VARCHAR(10)` — limite max 10 caratteri

### Prossimi step ordinati per priorità

1. **Test E2E Netlify** — verificare fix `9894ed5` in produzione (modal norme, accordion, sync)
2. **Export Word ISO 14001** — aggiungere sezione ISO 14001 nel `wordExport.js`
3. **Allineamento `/audits/sync`** — accettare `standard_ids[]` per supporto multi-standard server-side
4. **ISO 45001** — seed DB + frontend (dopo ISO 14001 export completo)

