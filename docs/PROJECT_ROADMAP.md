# 📋 Roadmap Implementazione Sistema Gestione ISO 9001

> **Basato su**: [ADR-003](adr/ADR-003-database-architecture-processes-analysis.md)  
> **Data Inizio**: 13 gennaio 2026  
> **Target Completamento**: 28 febbraio 2026 (7 settimane)

---

## 🎯 Obiettivi Progetto

### Obiettivi Primari ✅

1. **Audit Multi-Standard**: Supportare ISO 9001 + ISO 14001 + ISO 45001 simultaneamente
2. **Checklist Dinamica**: Eliminare hardcoding frontend → API-driven (35 domande per standard)
3. **Conformity Status Completo**: 6 opzioni (CO, OSS, NC, OM, NA, NV)
4. **Storage Scalabile**: Azure Blob Storage per allegati illimitati
5. **Audit Trail**: Storico completo modifiche risposte checklist
6. **GDPR Compliance**: Export dati utente + retention 10 anni

### Funzionalità Secondarie 🎁

7. **Email Alert NC Scadute**: Notifiche automatiche giornaliere
8. **Export Report**: DOCX/PDF per audit completati
9. **NC Management**: Azioni correttive semplificate (no workflow approvazioni)

---

## 📅 Timeline Executive Summary

| Settimana           | Obiettivo                                       | Status         | Completamento |
| ------------------- | ----------------------------------------------- | -------------- | ------------- |
| **W1** (13-17 Gen)  | 🔴 **CRITICAL**: Multi-standard + Checklist API | 🚧 In corso    | 0%            |
| **W2** (20-24 Gen)  | 🟡 NC Management + Azure Blob                   | ⏳ Pianificato | 0%            |
| **W3** (27-31 Gen)  | 🟡 Email Alert + GDPR Export                    | ⏳ Pianificato | 0%            |
| **W4-5** (3-14 Feb) | 🟢 Report Export + Retention                    | ⏳ Pianificato | 0%            |
| **W6+** (17 Feb+)   | 🔵 Seed ISO 14001/45001 + Advanced              | ⏳ Pianificato | 0%            |

**Progress Overall**: 🟥🟥🟥🟥🟥🟥🟥 0% (0/50 tasks)

---

## 🗂️ Breakdown per Area Funzionale

### 1️⃣ Database Schema (DBA)

**Responsabile**: Da assegnare  
**Priorità**: 🔴 CRITICAL  
**Target**: Fine Settimana 1 (17/01/2026)

#### Migration Sequence

| ID  | Nome                        | Descrizione                                     | Priorità | Status  | Due Date |
| --- | --------------------------- | ----------------------------------------------- | -------- | ------- | -------- |
| 006 | `fix_conformity_status`     | Aggiungere OSS, NV a CHECK constraint           | 🔴       | ⏳ TODO | 13/01    |
| 007 | `create_corrective_actions` | Tabella azioni correttive NC                    | 🔴       | ⏳ TODO | 13/01    |
| 008 | `alter_non_conformities`    | Campi status, resolution_date, resolution_notes | 🔴       | ⏳ TODO | 13/01    |
| 009 | `create_audit_standards`    | Tabella many-to-many audit ↔ standards          | 🔴       | ⏳ TODO | 14/01    |
| 010 | `alter_audits_deprecate`    | Deprecare standard_id, aggiungere archived_at   | 🔴       | ⏳ TODO | 14/01    |
| 011 | `create_response_history`   | Tabella audit trail modifiche risposte          | 🟡       | ⏳ TODO | 15/01    |
| 012 | `create_trigger_history`    | Trigger UPDATE audit_responses → history        | 🟡       | ⏳ TODO | 15/01    |
| 013 | `alter_attachments_azure`   | Campi azure_blob_url, file_size, mime_type      | 🟡       | ⏳ TODO | 20/01    |
| 014 | `create_email_log`          | Tabella tracking email inviate                  | 🟡       | ⏳ TODO | 27/01    |
| 015 | `create_conformity_lookup`  | Tabella master conformity_statuses              | 🟢       | ⏳ TODO | 03/02    |

**Script Path**: `database/migrations/`

---

### 2️⃣ Backend API (Node.js/Express)

**Responsabile**: Da assegnare  
**Priorità**: 🔴 CRITICAL  
**Target**: Fine Settimana 2 (24/01/2026)

#### Endpoints Nuovi

##### 🔴 CRITICAL (Settimana 1)

| Endpoint                       | Metodo | Controller                         | Status  | Test Coverage |
| ------------------------------ | ------ | ---------------------------------- | ------- | ------------- |
| `/api/standards/:id/questions` | GET    | `standardsController.getQuestions` | ⏳ TODO | 0%            |
| `/api/audits` (multi-standard) | POST   | `auditsController.create`          | ⏳ TODO | 0%            |
| `/api/audits/:id/standards`    | GET    | `auditsController.getStandards`    | ⏳ TODO | 0%            |
| `/api/audits/:id/checklist`    | GET    | `auditsController.getChecklist`    | ⏳ TODO | 0%            |

##### 🟡 HIGH (Settimana 2-3)

| Endpoint                     | Metodo | Controller                         | Status  | Test Coverage |
| ---------------------------- | ------ | ---------------------------------- | ------- | ------------- |
| `/api/attachments/upload`    | POST   | `attachmentsController.uploadBlob` | ⏳ TODO | 0%            |
| `/api/responses/:id/history` | GET    | `responsesController.getHistory`   | ⏳ TODO | 0%            |
| `/api/users/:id/export-data` | GET    | `usersController.exportGDPR`       | ⏳ TODO | 0%            |

##### 🟡 MEDIUM (Settimana 3-4)

| Endpoint                 | Metodo | Controller                | Status  | Test Coverage |
| ------------------------ | ------ | ------------------------- | ------- | ------------- |
| `/api/nc/:id/send-alert` | POST   | `ncController.sendAlert`  | ⏳ TODO | 0%            |
| `/api/email-log`         | GET    | `emailController.getLogs` | ⏳ TODO | 0%            |

##### 🟢 LOW (Settimana 4-5)

| Endpoint                      | Metodo | Controller                     | Status  | Test Coverage |
| ----------------------------- | ------ | ------------------------------ | ------- | ------------- |
| `/api/audits/:id/export/docx` | GET    | `reportsController.exportDOCX` | ⏳ TODO | 0%            |
| `/api/audits/:id/export/pdf`  | GET    | `reportsController.exportPDF`  | ⏳ TODO | 0%            |

**Path**: `backend/src/controllers/`, `backend/src/routes/`

#### Servizi Nuovi

| Servizio               | Scopo                         | Dipendenze            | Status  |
| ---------------------- | ----------------------------- | --------------------- | ------- |
| `azureBlobService.js`  | Upload/download Azure Storage | `@azure/storage-blob` | ⏳ TODO |
| `emailService.js`      | Invio email (SendGrid/SMTP)   | `nodemailer`          | ⏳ TODO |
| `gdprExportService.js` | ZIP export dati utente        | `archiver`            | ⏳ TODO |
| `reportService.js`     | Generazione DOCX/PDF          | `docx`, `pdfkit`      | ⏳ TODO |

**Path**: `backend/src/services/`

#### Scheduled Jobs (Cron)

| Job                  | Schedule      | Scopo                        | Status  |
| -------------------- | ------------- | ---------------------------- | ------- |
| `ncAlertJob.js`      | Daily 9:00 AM | Email NC scadute             | ⏳ TODO |
| `auditArchiveJob.js` | Yearly 1 Jan  | Archiviazione audit 10+ anni | ⏳ TODO |

**Path**: `backend/src/jobs/`  
**Scheduler**: `node-cron` o `bull` (message queue)

---

### 3️⃣ Frontend UI (React)

**Responsabile**: Da assegnare  
**Priorità**: 🔴 CRITICAL  
**Target**: Fine Settimana 2 (24/01/2026)

#### Pagine/Componenti Modificati

##### 🔴 CRITICAL (Settimana 1)

| File                                   | Modifica                                | Status  | Test Coverage |
| -------------------------------------- | --------------------------------------- | ------- | ------------- |
| `CreateAuditPage.jsx`                  | Multi-select standard (checkbox)        | ⏳ TODO | 0%            |
| `AuditChecklistPage.jsx`               | Tabs per standard + dropdown 6 stati    | ⏳ TODO | 0%            |
| `checklistService.js` **[NUOVO]**      | API call `GET /standards/:id/questions` | ⏳ TODO | 0%            |
| `checklistInitializer.js` **[DELETE]** | ❌ Eliminare file hardcoded             | ⏳ TODO | -             |

##### 🟡 HIGH (Settimana 2)

| File                                   | Modifica                                  | Status  | Test Coverage |
| -------------------------------------- | ----------------------------------------- | ------- | ------------- |
| `AttachmentUpload.jsx`                 | Azure Blob upload + progress bar          | ⏳ TODO | 0%            |
| `ResponseHistoryModal.jsx` **[NUOVO]** | Modale storico modifiche                  | ⏳ TODO | 0%            |
| `NonConformitiesPage.jsx`              | Badge NC scadute + CRUD azioni correttive | ⏳ TODO | 0%            |

##### 🟡 MEDIUM (Settimana 3)

| File                               | Modifica                     | Status  | Test Coverage |
| ---------------------------------- | ---------------------------- | ------- | ------------- |
| `SettingsPage.jsx`                 | Pulsante "Esporta dati GDPR" | ⏳ TODO | 0%            |
| `ReportExportPage.jsx` **[NUOVO]** | Download DOCX/PDF            | ⏳ TODO | 0%            |

##### 🟢 LOW (Settimana 4-5)

| File            | Modifica                  | Status  | Test Coverage |
| --------------- | ------------------------- | ------- | ------------- |
| `AdminPage.jsx` | Gestione retention policy | ⏳ TODO | 0%            |

**Path**: `app/src/pages/`, `app/src/components/`, `app/src/services/`

---

### 4️⃣ Infrastructure & DevOps

**Responsabile**: Da assegnare  
**Priorità**: 🔴 CRITICAL  
**Target**: Fine Settimana 1 (17/01/2026)

#### Configurazioni Cloud

| Risorsa                | Provider      | Scopo                         | Status  | Owner     |
| ---------------------- | ------------- | ----------------------------- | ------- | --------- |
| **Azure Blob Storage** | Azure         | Container `sgq-attachments`   | ⏳ TODO | QS Studio |
| **SendGrid API Key**   | SendGrid      | Invio email NC alert          | ⏳ TODO | QS Studio |
| **SQL Server Backup**  | Azure/On-Prem | Backup giornaliero automatico | ⏳ TODO | DBA       |

#### Environment Variables

**File**: `backend/.env`

```env
# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_BLOB_CONTAINER=sgq-attachments
AZURE_BLOB_SAS_TOKEN=...

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@qsstudio.it

# Cron Jobs
NC_ALERT_CRON=0 9 * * *  # Daily 9:00 AM
AUDIT_ARCHIVE_CRON=0 0 1 1 *  # Yearly 1 Jan

# GDPR
GDPR_EXPORT_MAX_SIZE_MB=1000
AUDIT_RETENTION_YEARS=10
```

**Status**: ⏳ TODO

---

### 5️⃣ Testing & QA

**Responsabile**: Da assegnare  
**Target**: Continuous (ogni settimana)

#### Test Coverage Targets

| Tipo Test         | Target Coverage     | Attuale | Status  |
| ----------------- | ------------------- | ------- | ------- |
| **Backend Unit**  | ≥80%                | TBD     | ⏳ TODO |
| **Frontend Unit** | ≥70%                | TBD     | ⏳ TODO |
| **Integration**   | 100% critical paths | 0%      | ⏳ TODO |
| **E2E**           | 100% happy paths    | 0%      | ⏳ TODO |

#### Test Plan Settimana per Settimana

##### Settimana 1 Tests

| Test ID  | Descrizione                                | Tipo        | Priorità | Status  |
| -------- | ------------------------------------------ | ----------- | -------- | ------- |
| E2E-001  | Creare audit ISO 9001+14001 (70 domande)   | E2E         | 🔴       | ⏳ TODO |
| E2E-002  | Compilare checklist con 6 stati conformità | E2E         | 🔴       | ⏳ TODO |
| INT-001  | Migration 006-010 rollback sicuro          | Integration | 🔴       | ⏳ TODO |
| UNIT-001 | `standardsController.getQuestions`         | Unit        | 🔴       | ⏳ TODO |

##### Settimana 2 Tests

| Test ID  | Descrizione                                     | Tipo | Priorità | Status  |
| -------- | ----------------------------------------------- | ---- | -------- | ------- |
| E2E-003  | Upload file 100MB su Azure Blob                 | E2E  | 🟡       | ⏳ TODO |
| E2E-004  | Modificare risposta 3 volte, verificare history | E2E  | 🟡       | ⏳ TODO |
| LOAD-001 | 50 upload simultanei 100MB                      | Load | 🟡       | ⏳ TODO |

##### Settimana 3 Tests

| Test ID | Descrizione                     | Tipo | Priorità | Status  |
| ------- | ------------------------------- | ---- | -------- | ------- |
| E2E-005 | Export GDPR utente con 50 audit | E2E  | 🟡       | ⏳ TODO |
| E2E-006 | Cron job NC alert (mock SMTP)   | E2E  | 🟡       | ⏳ TODO |

**Path**: `backend/tests/`, `app/tests/`

---

## 🚀 Sprint Planning (Agile 2-Week Sprints)

### Sprint 1 (13-24 gennaio) - Foundation

**Obiettivo**: Database multi-standard + API checklist dinamica

**User Stories**:

1. **US-001** (40 SP): Come DBA, voglio migrare DB a multi-standard (Migration 006-010)
2. **US-002** (20 SP): Come backend dev, voglio API `/standards/:id/questions`
3. **US-003** (30 SP): Come frontend dev, voglio eliminare checklist hardcoded
4. **US-004** (10 SP): Come DevOps, voglio setup Azure Blob Storage

**Total**: 100 Story Points

**Definition of Done**:

- ✅ Migration 006-010 eseguite senza errori
- ✅ Test E2E audit multi-standard PASSED
- ✅ Frontend carica 70 domande da API (ISO 9001+14001)
- ✅ Azure Blob container funzionante

---

### Sprint 2 (27 Gen - 7 Feb) - Features

**Obiettivo**: NC management + Upload Azure + Email alert

**User Stories**:

1. **US-005** (30 SP): Come utente, voglio upload file illimitati su Azure
2. **US-006** (20 SP): Come auditor, voglio vedere storico modifiche risposte
3. **US-007** (25 SP): Come RCOM, voglio ricevere email per NC scadute
4. **US-008** (25 SP): Come utente, voglio esportare i miei dati (GDPR)

**Total**: 100 Story Points

**Definition of Done**:

- ✅ Upload 100MB file funziona
- ✅ Modale storico modifiche visualizza 3+ cambiamenti
- ✅ Email alert NC inviate giornalmente (test mock)
- ✅ ZIP export GDPR contiene tutti i dati

---

### Sprint 3 (10-21 Feb) - Polish

**Obiettivo**: Report export + Retention policy + Seed ISO 14001/45001

**User Stories**:

1. **US-009** (30 SP): Come auditor, voglio esportare report in DOCX/PDF
2. **US-010** (20 SP): Come admin, voglio configurare retention 10 anni
3. **US-011** (40 SP): Come QS Studio, voglio seed checklist ISO 14001/45001
4. **US-012** (10 SP): Come team, voglio database backup automatico

**Total**: 100 Story Points

**Definition of Done**:

- ✅ Export report DOCX/PDF funziona
- ✅ Audit > 10 anni automaticamente archiviati
- ✅ Posso creare audit con 3 standard simultaneamente (105 domande)
- ✅ Backup SQL Server configurato

---

## 📊 KPI & Metriche di Successo

### Metriche Tecniche

| Metrica                    | Target              | Attuale | Status |
| -------------------------- | ------------------- | ------- | ------ |
| **Test Coverage Backend**  | ≥80%                | TBD     | ⏳     |
| **Test Coverage Frontend** | ≥70%                | TBD     | ⏳     |
| **Migration Success Rate** | 100%                | 0%      | ⏳     |
| **API Response Time**      | <500ms (p95)        | TBD     | ⏳     |
| **Upload Speed**           | >5MB/s (Azure Blob) | TBD     | ⏳     |

### Metriche Funzionali

| Metrica                  | Target                       | Attuale      | Status |
| ------------------------ | ---------------------------- | ------------ | ------ |
| **Checklist Questions**  | 35 per standard (API-driven) | 26 hardcoded | ❌     |
| **Conformity Status**    | 6 opzioni                    | 4 opzioni    | ❌     |
| **Audit Multi-Standard** | Supportato                   | No           | ❌     |
| **Email NC Alert**       | Giornaliero automatico       | No           | ❌     |
| **GDPR Export**          | Funzionante                  | No           | ❌     |

---

## 🎖️ Team & Ownership

| Ruolo             | Nome      | Responsabilità                                   | Sprint Commitment |
| ----------------- | --------- | ------------------------------------------------ | ----------------- |
| **DBA**           | TBD       | Migration 006-015, backup, performance tuning    | Sprint 1-2        |
| **Backend Lead**  | TBD       | API endpoints, services, cron jobs               | Sprint 1-3        |
| **Frontend Lead** | TBD       | UI components, state management, API integration | Sprint 1-3        |
| **DevOps**        | TBD       | Azure setup, CI/CD, monitoring                   | Sprint 1          |
| **QA Lead**       | TBD       | Test plan, E2E, coverage report                  | Sprint 1-3        |
| **Product Owner** | QS Studio | Priorità, acceptance criteria, UAT               | All Sprints       |

---

## 🔥 Rischi & Mitigazioni

| ID        | Rischio                            | Probabilità | Impatto  | Mitigazione                            | Owner    |
| --------- | ---------------------------------- | ----------- | -------- | -------------------------------------- | -------- |
| **R-001** | Migration 009 fallisce (data loss) | 🟢 Bassa    | 🔴 Alto  | Backup pre-migration + rollback script | DBA      |
| **R-002** | Storage Azure costi eccessivi      | 🟡 Media    | 🔴 Alto  | Quota 10GB/org + monitoring costi      | DevOps   |
| **R-003** | Email spam NC alert                | 🟡 Media    | 🟡 Medio | Digest giornaliero invece di N email   | Backend  |
| **R-004** | Frontend performance (105 domande) | 🟡 Media    | 🟡 Medio | React-window virtualizzazione          | Frontend |
| **R-005** | GDPR export timeout (ZIP > 1GB)    | 🟡 Media    | 🟡 Medio | Stream ZIP + Azure Blob link           | Backend  |

---

## 📞 Communication Plan

### Standup Giornalieri

**Quando**: Ogni giorno 9:30 AM  
**Durata**: 15 minuti  
**Formato**:

- Cosa ho fatto ieri?
- Cosa farò oggi?
- Blocchi/impedimenti?

### Sprint Review

**Quando**: Fine Sprint (ogni 2 settimane)  
**Durata**: 1 ora  
**Formato**:

- Demo funzionalità completate
- Review metriche (velocity, coverage)
- Feedback QS Studio (Product Owner)

### Sprint Retrospective

**Quando**: Post Sprint Review  
**Durata**: 45 minuti  
**Formato**:

- Cosa è andato bene?
- Cosa migliorare?
- Action items per prossimo Sprint

---

## ✅ Definition of Done (DoD) Progetto

**Il progetto è considerato COMPLETO quando**:

### Funzionalità

- [x] **Multi-Standard Audit**: Posso creare audit con ISO 9001+14001+45001 (105 domande)
- [x] **Checklist API-Driven**: Frontend carica domande da DB (zero hardcoding)
- [x] **6 Conformity Status**: CO, OSS, NC, OM, NA, NV funzionanti
- [x] **Upload Illimitato**: File 500MB+ caricabili su Azure Blob
- [x] **Audit Trail**: Storico modifiche visibile in UI
- [x] **Email NC Alert**: Job giornaliero funzionante
- [x] **GDPR Export**: ZIP con tutti i dati utente scaricabile

### Qualità

- [x] **Test Coverage**: Backend ≥80%, Frontend ≥70%
- [x] **E2E Tests**: 100% happy paths testati e PASSED
- [x] **Performance**: API response <500ms (p95)
- [x] **Security**: Nessuna credenziale hardcoded, JWT httpOnly

### Documentazione

- [x] **ADR Aggiornati**: Tutte le decisioni architetturali documentate
- [x] **README**: Setup instructions aggiornate
- [x] **API Docs**: OpenAPI/Swagger completo

### Deployment

- [x] **Backup Automatico**: SQL Server maintenance plan attivo
- [x] **Monitoring**: Logs + error tracking (es: Sentry)
- [x] **CI/CD**: Pipeline automatica (build → test → deploy)

---

## 📚 Riferimenti

- **ADR-003**: [Analisi Architettura Database](adr/ADR-003-database-architecture-processes-analysis.md)
- **ADR-001**: [Multi-Agent Workflow](adr/ADR-001-multi-agent-workflow.md)
- **Style Guide**: [.github/instructions/style.instructions.md](../.github/instructions/style.instructions.md)

---

**Ultimo Aggiornamento**: 10 gennaio 2026  
**Prossimo Review**: 17 gennaio 2026 (fine Sprint 1 - Settimana 1)
