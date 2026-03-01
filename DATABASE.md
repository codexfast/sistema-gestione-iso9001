# DATABASE — SGQ ISO 9001

> **Leggere all'inizio di ogni sessione che tocca il DB.**  
> Fonte di verità: `docs/DATABASE_SCHEMA.md` (dettaglio completo) — questo file è il quick-reference operativo.

---

## Connessione

| Parametro | Valore |
|---|---|
| **Host** | `www.fr-busato.it,11043` |
| **Database** | `SGQ_ISO9001` |
| **Driver** | `mssql` (Node.js) |
| **Utente app** | `sgq_app` / `Sgq2024!App` |
| **SSH** | `ssh spascarella@www.fr-busato.it -p 1122` / `Sistemi@2026` |

### Accesso interattivo da terminale

```powershell
# SSH tunnel
plink -P 1122 -pw "Sistemi@2026" -batch spascarella@www.fr-busato.it

# Da VPS — sqlcmd (SQL Server)
sqlcmd -S localhost,11043 -U sgq_app -P Sgq2024!App -d SGQ_ISO9001
```

---

## Tabelle

### `organizations`  *(multi-tenancy root)*

```sql
organization_id   INT IDENTITY  PK
organization_name NVARCHAR(255) UNIQUE NOT NULL
created_at        DATETIME2     DEFAULT GETDATE()
is_active         BIT           DEFAULT 1
```

### `users`

```sql
user_id          INT IDENTITY  PK
organization_id  INT           FK → organizations
email            NVARCHAR(255) UNIQUE NOT NULL
password_hash    NVARCHAR(255) NOT NULL
full_name        NVARCHAR(255)
role             NVARCHAR(20)  CHECK ('admin','auditor','viewer')  -- ⚠️ minuscolo
is_active        BIT           DEFAULT 1
created_at       DATETIME2
```

### `standards`  *(master data — read-only)*

```sql
standard_id    INT IDENTITY  PK
standard_code  NVARCHAR(50)  UNIQUE  -- es: 'ISO_9001'
standard_name  NVARCHAR(255)
version        NVARCHAR(20)          -- es: '2015'
is_active      BIT           DEFAULT 1
```

Seed presenti: `ISO_9001` (id 1), `ISO_14001` (id 2), `ISO_45001` (id 3)

### `checklist_sections`  *(master data)*

```sql
section_code   NVARCHAR(50)  PK      -- es: 'clause4'
section_title  NVARCHAR(255)
standard_id    INT           FK → standards
display_order  INT
```

Clausole ISO 9001: `clause4` … `clause10`

### `checklist_questions`  *(master data)*

```sql
question_id    INT IDENTITY  PK
standard_id    INT           FK → standards
section_code   NVARCHAR(50)  FK → checklist_sections
question_text  NVARCHAR(MAX)
question_type  NVARCHAR(20)  CHECK ('TEXT','YES_NO','MULTIPLE_CHOICE')  -- ⚠️ MAIUSCOLO
is_mandatory   BIT           DEFAULT 1
display_order  INT
is_active      BIT           DEFAULT 1
created_at/updated_at DATETIME2
```

> ISO 9001:2015 ha **35 domande** attive.

### `response_options`  *(master data)*

| code | Nome IT | Peso % | Escludi da calcolo |
|------|---------|--------|--------------------|
| C | Conforme | 100.00 | 0 |
| OSS | Osservazione | 50.00 | 0 |
| NC | Non Conforme | 0.00 | 0 |
| OM | Opportunità Miglioramento | 75.00 | 0 |
| NA | Non Applicabile | NULL | 1 |
| NV | Non Verificato | NULL | 1 |

### `audits`

```sql
audit_id         INT IDENTITY  PK
organization_id  INT           FK → organizations
audit_number     NVARCHAR(50)  UNIQUE
audit_date       DATE
lead_auditor_id  INT           FK → users (nullable)
status           NVARCHAR(20)  CHECK ('draft','in_progress','completed','approved')  -- ⚠️ minuscolo
created_at/updated_at DATETIME2
```

### `audit_standards`  *(join table multi-standard)*

```sql
PK composta: (audit_id, standard_id)
audit_id     INT  FK → audits
standard_id  INT  FK → standards
```

### `audit_responses`

```sql
response_id        INT IDENTITY  PK
audit_id           INT           FK → audits
question_id        INT           FK → checklist_questions
answer_value       NVARCHAR(MAX) nullable
conformity_status  NVARCHAR(10)  CHECK ('C','NC','OSS','OM','NA','NV', NULL)
notes              NVARCHAR(MAX)  -- ⚠️ NON 'response_notes'
is_answered        BIT           DEFAULT 0
answered_at        DATETIME2     nullable
created_by         INT           FK → users (nullable)
created_at/updated_at DATETIME2
```

### `non_conformities`

```sql
nc_id         INT IDENTITY  PK
audit_id      INT           FK → audits
standard_id   INT           FK → standards
section_code  NVARCHAR(50)  FK composite → checklist_sections
nc_number     NVARCHAR(50)  -- es: 'NC-001'
nc_type       NVARCHAR(20)  CHECK ('major','minor','observation')
description   NVARCHAR(MAX)
severity      INT           -- 1=Low 2=Medium 3=High
status        NVARCHAR(20)  CHECK ('open','in_progress','closed')
created_at/updated_at DATETIME2
```

### `attachments`

```sql
attachment_id    INT IDENTITY  PK
attachment_uuid  UNIQUEIDENTIFIER  -- uuid v4
audit_id         INT           FK → audits (nullable se legato a NC)
nc_id            INT           FK → non_conformities (nullable)
question_id      INT           FK → checklist_questions (nullable)
file_name        NVARCHAR(500)
file_type        NVARCHAR(100) -- MIME type
file_size        BIGINT        -- bytes (migration 017: rinominato da file_size_bytes)
mime_type        NVARCHAR(100)
storage_path     NVARCHAR(MAX) -- relativo a uploads/
category         NVARCHAR(50)  DEFAULT 'evidence'
description      NVARCHAR(MAX) nullable
uploaded_by      INT           FK → users
created_at       DATETIME2     DEFAULT GETDATE()
```

> Formati supportati: `.jpg`, `.jpeg`, `.png`, `.heic`, `.mp3`, `.m4a`, `.wav`, `.mp4`, `.mov`, `.pdf`, `.docx`, `.xlsx`

### `pending_issues`  *(migration 018)*

```sql
issue_id          INT IDENTITY  PK
target_audit_id   INT           FK → audits (CASCADE DELETE)
source_audit_id   INT           FK → audits
question_id       INT           FK → checklist_questions
source_response_id INT          FK → audit_responses (NO ACTION — evita ciclo cascade)
status            NVARCHAR(20)  CHECK ('open','resolved','persists')
original_status   NVARCHAR(10)  CHECK ('NC','OSS','OM')
resolution_notes  NVARCHAR(MAX) nullable
organization_id   INT           FK → organizations
created_at/updated_at DATETIME2
```

### `audit_history`  *(tracciabilità ISO 7.5.3)*

```sql
history_id    INT IDENTITY  PK
audit_id      INT           FK → audits
changed_by    INT           FK → users
change_type   NVARCHAR(50)  -- 'created','updated','status_changed','deleted'
field_changed NVARCHAR(100) nullable
old_value     NVARCHAR(MAX) nullable  -- JSON se campo complesso
new_value     NVARCHAR(MAX) nullable
changed_at    DATETIME2     DEFAULT GETDATE()
```

### `sync_metadata`

```sql
sync_id              INT IDENTITY  PK
audit_id             INT           FK → audits (design generico via entity_type)
user_id              INT           FK → users (nullable)
last_sync_timestamp  DATETIME2
server_version       INT
client_version       INT           nullable
conflict_count       INT           DEFAULT 0
created_at           DATETIME2
```

> Non ha FK diretta ad audit_responses o NC: usa `entity_type` ('audit','response','nc') + `entity_id`.

---

## Vincoli critici (errori frequenti)

| Errore | Causa | Fix |
|---|---|---|
| `CHECK constraint failed on question_type` | Valore minuscolo | Usare `'TEXT'`, `'YES_NO'`, `'MULTIPLE_CHOICE'` (MAIUSCOLO) |
| `CHECK constraint failed on conformity_status` | Valore esteso | Usare `'C'`, `'NC'`, `'OSS'`, `'OM'`, `'NA'`, `'NV'` |
| `Invalid column name 'response_notes'` | Nome colonna vecchio | Usare `notes` |
| `CHECK constraint failed on status` (audit) | Valore maiuscolo | Usare `'draft'`, `'in_progress'`, `'completed'` (minuscolo) |

---

## Migration history

| ID | File | Descrizione | Stato |
|---|---|---|---|
| 003 | align_schema_backend | Fix campi backend (notes, answered_at) | ✅ |
| 006 | create_response_options | Opzioni risposta (v1, deprecated) | ✅ |
| 007 | fix_conformity_status | Fix constraint status | ✅ |
| 008 | create_response_options | Versione con colonne UI | ✅ |
| 008b | alter_response_options | Aggiunti campi UI (icon, color) | ✅ |
| 009 | create_audit_standards | Multi-standard support | ✅ |
| 010 | update_iso9001_35questions | Riduce da 78 a 35 domande | ⏳ DA ESEGUIRE |
| 017 | attachments_question_id | Aggiunto `question_id` + `attachment_uuid` | ✅ |
| 018 | pending_issues | Tabella rilievi pendenti | ✅ |

---

## ER Diagram (sintesi)

```
organizations ──< users
organizations ──< audits
audits ──< audit_responses ──── checklist_questions ──< checklist_sections ──< standards
audits ──< non_conformities
audits ──< attachments
audits ──< audit_history
audits ──< audit_standards >── standards
audits ──< pending_issues
audit_responses ──< attachments (via question_id)
```

---

*Aggiornato: 2026-03-01 — Schema v1.12 (pending_issues migration 018)*
