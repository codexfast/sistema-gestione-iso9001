# 📊 DATABASE SCHEMA - SGQ_ISO9001

**⚠️ LEGGERE SEMPRE ALL'INIZIO DI OGNI SESSIONE DI SVILUPPO**

---

## 🎯 QUICK REFERENCE: VALORI ENUM/CHECK

### `conformity_status` (audit_responses)

```sql
CHECK (conformity_status IN ('C', 'NC', 'OSS', 'OM', 'NA', 'NV', NULL))
```

- **C** = Conforme
- **NC** = Non Conforme
- **OSS** = Osservazione
- **OM** = Opportunità Miglioramento
- **NA** = Non Applicabile
- **NV** = Non Verificato

### `question_type` (checklist_questions)

```sql
CHECK (question_type IN ('text', 'yes_no', 'conformity', 'numeric'))
```

⚠️ **MINUSCOLO OBBLIGATORIO!**

- `'text'` = Risposta testuale libera
- `'yes_no'` = Sì/No
- `'conformity'` = Conformità (C/NC/OSS/OM/NA/NV)
- `'numeric'` = Valore numerico

### `audit_status` (audits)

```sql
CHECK (status IN ('draft', 'in_progress', 'completed', 'approved'))
```

⚠️ **MINUSCOLO!**

### `user_role` (users)

```sql
CHECK (role IN ('admin', 'auditor', 'viewer'))
```

⚠️ **MINUSCOLO!**

---

## 📋 TABELLE PRINCIPALI

### 🏢 **organizations**

Gestisce multi-tenancy

| Colonna           | Tipo          | Nullable | Note              |
| ----------------- | ------------- | -------- | ----------------- |
| organization_id   | INT IDENTITY  | NO       | PK                |
| organization_name | NVARCHAR(255) | NO       | Unique            |
| created_at        | DATETIME2     | NO       | Default GETDATE() |
| is_active         | BIT           | NO       | Default 1         |

---

### 👤 **users**

Utenti sistema (con multi-tenancy)

| Colonna         | Tipo          | Nullable | Constraint                           |
| --------------- | ------------- | -------- | ------------------------------------ |
| user_id         | INT IDENTITY  | NO       | PK                                   |
| organization_id | INT           | NO       | FK → organizations                   |
| email           | NVARCHAR(255) | NO       | Unique                               |
| password_hash   | NVARCHAR(255) | NO       |                                      |
| full_name       | NVARCHAR(255) | NO       |                                      |
| role            | NVARCHAR(20)  | NO       | CHECK ('ADMIN', 'AUDITOR', 'VIEWER') |
| is_active       | BIT           | NO       | Default 1                            |
| created_at      | DATETIME2     | NO       |                                      |

---

### 📜 **standards**

Normative (ISO 9001, 14001, 45001...)

| Colonna       | Tipo          | Nullable | Note                    |
| ------------- | ------------- | -------- | ----------------------- |
| standard_id   | INT IDENTITY  | NO       | PK                      |
| standard_code | NVARCHAR(50)  | NO       | Unique (es: 'ISO_9001') |
| standard_name | NVARCHAR(255) | NO       |                         |
| version       | NVARCHAR(20)  | NO       | Es: '2015'              |
| is_active     | BIT           | NO       | Default 1               |

**Dati esistenti:**

- ID 1: ISO 9001:2015
- ID 2: ISO 14001:2015
- ID 3: ISO 45001:2018

---

### 📋 **checklist_sections**

Sezioni checklist (clausole ISO)

| Colonna       | Tipo          | Nullable | Note               |
| ------------- | ------------- | -------- | ------------------ |
| section_code  | NVARCHAR(50)  | NO       | PK (es: 'clause4') |
| section_title | NVARCHAR(255) | NO       |                    |
| standard_id   | INT           | NO       | FK → standards     |
| display_order | INT           | NO       |                    |

**Convenzione naming:**

- `clause4` = Clausola 4 (Contesto)
- `clause5` = Clausola 5 (Leadership)
- `clause6` = Clausola 6 (Pianificazione)
- `clause7` = Clausola 7 (Supporto)
- `clause8` = Clausola 8 (Attività Operative)
- `clause9` = Clausola 9 (Valutazione Prestazioni)
- `clause10` = Clausola 10 (Miglioramento)

---

### ❓ **checklist_questions**

Domande checklist

| Colonna       | Tipo          | Nullable | Constraint                                                   |
| ------------- | ------------- | -------- | ------------------------------------------------------------ |
| question_id   | INT IDENTITY  | NO       | PK                                                           |
| standard_id   | INT           | NO       | FK → standards                                               |
| section_code  | NVARCHAR(50)  | NO       | FK → checklist_sections                                      |
| question_text | NVARCHAR(MAX) | NO       |                                                              |
| question_type | NVARCHAR(20)  | NO       | **CHECK ('TEXT', 'YES_NO', 'MULTIPLE_CHOICE')** ⚠️ MAIUSCOLO |
| is_mandatory  | BIT           | NO       | Default 1                                                    |
| display_order | INT           | NO       |                                                              |
| is_active     | BIT           | NO       | Default 1                                                    |
| created_at    | DATETIME2     | NO       |                                                              |
| updated_at    | DATETIME2     | NO       |                                                              |

⚠️ **ATTENZIONE:**

- `question_type` DEVE essere MAIUSCOLO: `'TEXT'`, NON `'text'`
- Valori: `'TEXT'`, `'YES_NO'`, `'MULTIPLE_CHOICE'`

**Count domande ISO 9001:2015:**

- ✅ **35 domande** (da checklist cliente - ChekList9001.txt)

---

### 🎯 **response_options**

Master opzioni risposta (C, NC, OSS, OM, NA, NV)

| Colonna           | Tipo          | Nullable | Note                            |
| ----------------- | ------------- | -------- | ------------------------------- |
| option_id         | INT IDENTITY  | NO       | PK                              |
| option_code       | NVARCHAR(10)  | NO       | Unique                          |
| option_name_it    | NVARCHAR(100) | NO       |                                 |
| option_name_en    | NVARCHAR(100) | NO       |                                 |
| severity_level    | INT           | NO       | 0=NA/NV, 1=C, 2=OSS/OM, 3=NC    |
| weight_percentage | DECIMAL(5,2)  | YES      | C=100, OSS=50, NC=0, NA/NV=NULL |
| exclude_from_calc | BIT           | NO       | 1 per NA/NV                     |
| display_order     | INT           | NO       |                                 |
| color_hex         | NVARCHAR(7)   | YES      | Es: '#28a745'                   |

**Seed dati (6 opzioni):**
| Code | Nome IT | Peso % | Escludi Calc |
|------|---------|--------|--------------|
| C | Conforme | 100.00 | 0 |
| OSS | Osservazione | 50.00 | 0 |
| NC | Non Conforme | 0.00 | 0 |
| OM | Opportunità Miglioramento | 75.00 | 0 |
| NA | Non Applicabile | NULL | 1 |
| NV | Non Verificato | NULL | 1 |

---

### 🔍 **audits**

Audit (multi-standard)

| Colonna         | Tipo         | Nullable | Constraint                                              |
| --------------- | ------------ | -------- | ------------------------------------------------------- |
| audit_id        | INT IDENTITY | NO       | PK                                                      |
| organization_id | INT          | NO       | FK → organizations                                      |
| audit_number    | NVARCHAR(50) | NO       | Unique                                                  |
| audit_date      | DATE         | NO       |                                                         |
| lead_auditor_id | INT          | YES      | FK → users                                              |
| status          | NVARCHAR(20) | NO       | CHECK ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED') |
| created_at      | DATETIME2    | NO       |                                                         |
| updated_at      | DATETIME2    | NO       |                                                         |

---

### 📝 **audit_responses**

Risposte checklist

| Colonna           | Tipo          | Nullable | Constraint                                           |
| ----------------- | ------------- | -------- | ---------------------------------------------------- |
| response_id       | INT IDENTITY  | NO       | PK                                                   |
| audit_id          | INT           | NO       | FK → audits                                          |
| question_id       | INT           | NO       | FK → checklist_questions                             |
| answer_value      | NVARCHAR(MAX) | YES      |                                                      |
| conformity_status | NVARCHAR(10)  | YES      | **CHECK ('C', 'NC', 'OSS', 'OM', 'NA', 'NV', NULL)** |
| notes             | NVARCHAR(MAX) | YES      | ⚠️ Backend usa "notes", non "response_notes"         |
| is_answered       | BIT           | NO       | Default 0                                            |
| answered_at       | DATETIME2     | YES      | Timestamp risposta                                   |
| created_by        | INT           | YES      | FK → users                                           |
| created_at        | DATETIME2     | NO       |                                                      |
| updated_at        | DATETIME2     | NO       |                                                      |

⚠️ **ATTENZIONE:**

- Colonna si chiama `notes`, NON `response_notes`
- `conformity_status` valori MAIUSCOLI: 'C', 'NC', etc.

---

### 🔗 **audit_standards**

Join table per multi-standard audit

| Colonna     | Tipo                    | Nullable | Note           |
| ----------- | ----------------------- | -------- | -------------- |
| audit_id    | INT                     | NO       | FK → audits    |
| standard_id | INT                     | NO       | FK → standards |
| PRIMARY KEY | (audit_id, standard_id) |          | Composite      |

---

### 🔄 **sync_metadata**

Metadati sincronizzazione offline

| Colonna             | Tipo         | Nullable | Note              |
| ------------------- | ------------ | -------- | ----------------- |
| sync_id             | INT IDENTITY | NO       | PK                |
| audit_id            | INT          | NO       | FK → audits       |
| user_id             | INT          | YES      | Chi ha fatto sync |
| last_sync_timestamp | DATETIME2    | NO       |                   |
| server_version      | INT          | NO       |                   |
| client_version      | INT          | YES      |                   |
| conflict_count      | INT          | NO       | Default 0         |
| created_at          | DATETIME2    | NO       |                   |

---

## 🔧 MIGRATION HISTORY

| ID   | File                       | Descrizione                                    | Data       |
| ---- | -------------------------- | ---------------------------------------------- | ---------- |
| 003  | align_schema_backend       | Fix campi backend (notes, answered_at)         | 2026-01-04 |
| 006  | create_response_options    | Tabella opzioni risposta (deprecated)          | -          |
| 007  | fix_conformity_status      | Fix constraint status                          | -          |
| 008  | create_response_options    | Nuova versione con UI columns                  | 2026-01-11 |
| 008b | alter_response_options     | Aggiunti campi UI (icon, color)                | -          |
| 010  | update_iso9001_35questions | ⏳ **DA ESEGUIRE** - Riduce da 78 a 35 domande | 2026-01-17 |

---

## ⚡ QUICK FIXES COMMON ERRORS

### Errore: `CHECK constraint failed on question_type`

```sql
-- ❌ SBAGLIATO:
INSERT INTO checklist_questions (..., question_type, ...)
VALUES (..., 'yes_no_na', ...);

-- ✅ CORRETTO:
INSERT INTO checklist_questions (..., question_type, ...)
VALUES (..., 'YES_NO', ...);
```

### Errore: `CHECK constraint failed on conformity_status`

```sql
-- ❌ SBAGLIATO:
UPDATE audit_responses SET conformity_status = 'conforme';

-- ✅ CORRETTO:
UPDATE audit_responses SET conformity_status = 'C';
```

### Errore: `Invalid column name 'response_notes'`

```sql
-- ❌ SBAGLIATO (backend vecchio):
SELECT response_notes FROM audit_responses;

-- ✅ CORRETTO:
SELECT notes FROM audit_responses;
```

---

## 📞 CONTATTI & RIFERIMENTI

- **Database**: SQL Server Express 2022, localhost
- **User**: sgq_app / Sgq2024!App
- **Database Name**: SGQ_ISO9001
- **Port**: 1433

**ADR Correlati:**

- ADR-001: Multi-Agent Workflow
- ADR-002: Project Structure & Offline-First

---

**Ultimo aggiornamento:** 2026-01-17  
**Versione schema:** v1.10 (Migration 010 pending)
