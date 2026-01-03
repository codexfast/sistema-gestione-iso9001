# DATA FLOW AUDIT - Sistema Gestione ISO 9001

**Data**: 2025-12-22  
**Obiettivo**: Verificare coerenza Frontend ↔ Backend ↔ Database

---

## ✅ AUDIT METADATA - FUNZIONA PARZIALMENTE

### Frontend → Backend

**File**: `app/src/contexts/StorageContext.jsx` (linea ~350-370)
**Payload inviato**:

```javascript
{
  audit_uuid: "audit-001-rp-2025",         // ✅ MATCH
  audit_number: "2025-01",                 // ✅ MATCH
  client_name: "Raccorderia Piacentina",  // ✅ MATCH
  project_year: 2025,                      // ✅ MATCH
  audit_date: "2025-12-22",                // ✅ MATCH
  auditor_name: "Non specificato",         // ✅ MATCH
  audit_type: "internal",                  // ✅ MATCH
  status: "completed",                     // ✅ MATCH
  notes: null,                             // ✅ MATCH
  total_questions: 78,                     // ✅ MATCH
  answered_questions: 0,                   // ❌ SBAGLIATO (dovrebbe essere contato dal frontend)
  conformities_count: 0,                   // ❌ SBAGLIATO
  non_conformities_count: 0,               // ❌ SBAGLIATO
  completion_percentage: 0,                // ❌ SBAGLIATO
  standard_id: 1,                          // ✅ MATCH
  updated_at: "2025-12-22T10:12:24.473Z"   // ✅ MATCH
}
```

### Backend → Database

**File**: `backend/src/controllers/audit.controller.js` (linea ~606-730)
**Endpoint**: `POST /api/v1/audits/sync` → `upsertAudit()`

**Query INSERT**:

```sql
INSERT INTO audits (
  audit_uuid,           -- ✅ NVARCHAR(100) - modificato da UNIQUEIDENTIFIER
  audit_number,         -- ✅ NVARCHAR(50)
  client_name,          -- ✅ NVARCHAR(255)
  project_year,         -- ✅ INT
  audit_date,           -- ✅ DATE
  auditor_name,         -- ✅ NVARCHAR(255)
  audit_type,           -- ✅ NVARCHAR(50)
  status,               -- ✅ NVARCHAR(50)
  notes,                -- ✅ NVARTEXT
  total_questions,      -- ✅ INT
  answered_questions,   -- ✅ INT
  conformities_count,   -- ✅ INT
  non_conformities_count, -- ✅ INT
  completion_percentage,  -- ✅ DECIMAL(5,2)
  standard_id,          -- ✅ INT (NON nello schema.sql originale!)
  organization_id,      -- ✅ INT (NON nello schema.sql originale!)
  created_by,           -- ✅ INT (user_id dal token JWT)
  created_at,           -- ✅ DATETIME2
  updated_at            -- ✅ DATETIME2
)
```

**Risultato Database** (dalla tua tabella):
| Campo | Valore | Status |
|-------|--------|--------|
| audit_id | 1010 | ✅ AUTO-INCREMENT |
| audit_uuid | audit-001-rp-2025 | ✅ SCRITTO |
| audit_number | 2025-01 | ✅ SCRITTO |
| client_name | Raccorderia Piacentina | ✅ SCRITTO |
| answered_questions | **0** | ❌ SBAGLIATO - dovrebbe essere >0 |
| conformities_count | **0** | ❌ SBAGLIATO |
| completion_percentage | **0.00** | ❌ SBAGLIATO |

**PROBLEMA**: Il frontend invia `answered_questions=0` perché **non conta le risposte prima del sync**.

---

## ❌ CHECKLIST RESPONSES - NON FUNZIONA

### Frontend Struttura Dati

**File**: `app/src/data/mockAudits.js` (linea ~95-150)

```javascript
checklist: {
  ISO_9001: {
    clause4_Context: {
      questions: [
        {
          id: "q4.1", // ❌ FRONTEND usa STRING
          clauseRef: "4.1", // ✅ Usabile per mapping
          status: "C", // ✅ Valido
          notes: "Note...", // ✅ Maps to response_notes
          evidenceRef: "foto1.jpg", // ❌ NON esiste nel DB (serve attachments separato)
        },
      ];
    }
  }
}
```

### Frontend → Backend (CURRENT - NON CHIAMATO)

**File**: `app/src/contexts/StorageContext.jsx` (linea ~385-420)
**Funzione**: `extractChecklistResponses(audit)` - CREATA ma NON usata ancora!

**Payload TEORICO** (se funzionasse):

```javascript
{
  auditId: "audit-001-rp-2025",
  responses: [
    {
      clause_ref: '4.1',         // ✅ Mappabile a question_id via lookup
      conformity_status: 'C',    // ✅ MATCH DB
      notes: 'Note...',          // ✅ Maps to response_notes
      evidence: 'foto1.jpg',     // ❌ NON gestito (serve attachment separato)
      client_updated_at: "2025-12-22T10:15:00Z"
    },
    // ... altre 77 domande
  ]
}
```

### Backend Endpoint

**File**: `backend/src/controllers/response.controller.js` (linea ~275-400)
**Endpoint**: `POST /api/v1/audits/:auditId/responses/bulk`
**Metodo**: `bulkSaveResponses(req, res)`

**Si aspetta**:

```javascript
{
  responses: [
    {
      clause_ref: "4.1", // ✅ MODIFICATO - fa lookup a question_id
      conformity_status: "C", // ✅ NVARCHAR(50)
      notes: "...", // ✅ NVARTEXT (response_notes)
      evidence: null, // ⚠️ IGNORATO (non esiste in DB)
      client_updated_at: "...", // ✅ Per conflict resolution
    },
  ];
}
```

**Query INSERT**:

```sql
INSERT INTO audit_responses (
  audit_id,           -- ✅ INT (dal path param)
  question_id,        -- ✅ INT (lookup da clause_ref)
  conformity_status,  -- ✅ NVARCHAR(50)
  notes,              -- ❌ NOME SBAGLIATO! DB ha response_notes
  evidence,           -- ❌ CAMPO NON ESISTE in audit_responses
  is_answered,        -- ✅ BIT (calcolato: status !== 'NOT_ANSWERED')
  answered_at,        -- ✅ DATETIME2 (GETDATE() se answered)
  created_by,         -- ✅ INT (user_id)
  created_at,         -- ✅ DATETIME2
  updated_at          -- ✅ DATETIME2
)
```

**PROBLEMI TROVATI**:

1. ❌ **Frontend NON chiama mai `POST /responses/bulk`** - le risposte restano solo in IndexedDB
2. ❌ **Backend usa `notes` ma DB ha `response_notes`**
3. ❌ **Backend usa `evidence` ma campo NON esiste in audit_responses**
4. ❌ **Frontend non aggiorna `answered_questions` prima del sync audit**

### Database Verifiche

**Query da eseguire in SSMS**:

```sql
-- 1. Conta risposte per ogni audit
SELECT
  a.audit_number,
  a.client_name,
  COUNT(ar.response_id) AS risposte_salvate,
  a.answered_questions AS risposte_dichiarate
FROM audits a
LEFT JOIN audit_responses ar ON a.audit_id = ar.audit_id
WHERE a.organization_id = 1
GROUP BY a.audit_number, a.client_name, a.answered_questions;

-- 2. Verifica se audit_responses ha righe
SELECT COUNT(*) AS total_responses FROM audit_responses;

-- 3. Se >0, mostra esempio
SELECT TOP 5
  ar.*,
  cq.section_code,
  cq.question_text
FROM audit_responses ar
INNER JOIN checklist_questions cq ON ar.question_id = cq.question_id
ORDER BY ar.response_id DESC;
```

**PREVISIONE**: Tutte le query ritorneranno **0 righe** perché il frontend non ha MAI chiamato `bulkSaveResponses`.

---

## 🔧 PIANO FIX PRIORITARIO

### P0 - CRITICAL (Blocca tutto)

**Fix #1**: Chiamare `bulkSaveResponses` dopo sync audit

- **File**: `app/src/contexts/StorageContext.jsx`
- **Linea**: ~460 (dopo `syncService.enqueue("update_audit")`)
- **Azione**: Aggiungere:
  ```javascript
  const responses = extractChecklistResponses(updated);
  if (responses.length > 0 && navigator.onLine) {
    syncService.enqueue("save_responses", {
      auditId: updated.id,
      responses: responses,
    });
  }
  ```

**Fix #2**: Correggere nomi campi backend

- **File**: `backend/src/controllers/response.controller.js`
- **Linea**: ~360-380
- **Azione**:
  - Cambiare `notes` → `response_notes`
  - Rimuovere `evidence` (va in attachments separato)

**Fix #3**: Aggiornare metriche audit prima del sync

- **File**: `app/src/contexts/StorageContext.jsx`
- **Funzione**: `updateCurrentAudit()`
- **Azione**: Prima di `enqueue("update_audit")`, ricalcolare:
  ```javascript
  updated.metadata.answeredQuestions = contaRisposteAnswered(updated.checklist);
  updated.metadata.conformitiesCount = contaStatus(updated.checklist, "C");
  updated.metadata.nonConformitiesCount = contaStatus(updated.checklist, "NC");
  updated.metadata.completionPercentage = (answered / total) * 100;
  ```

### P1 - HIGH

**Fix #4**: Mapping question_id nel backend

- **File**: `backend/src/controllers/response.controller.js`
- **Status**: ✅ GIÀ FATTO (lookup via clause_ref)
- **Verifica**: Testare che funzioni

**Fix #5**: Gestire attachments separatamente

- **Complessità**: ALTA - richiede upload file separato
- **Rimandare**: Dopo aver fixato responses base

### P2 - MEDIUM

**Fix #6**: Allineare schema.sql con database reale

- Aggiungere `standard_id`, `organization_id` in `audits`
- Aggiungere `section_code` in `checklist_questions` (se manca)

---

## 📊 CHECKLIST VERIFICA

### Audit Metadata Sync

- [x] Frontend invia payload corretto
- [x] Backend riceve e salva in DB
- [x] Database ha 3 audit scritti
- [ ] **Metriche aggregate corrette** (answered_questions, etc.)

### Checklist Responses Sync

- [x] Frontend ha funzione extract (creata)
- [ ] **Frontend chiama enqueue("save_responses")**
- [x] Backend ha endpoint `bulkSaveResponses`
- [ ] **Backend usa nomi campi corretti**
- [ ] **Database ha righe in audit_responses**

### Attachments Sync

- [ ] Non verificato (complessità alta)

### Non Conformities Sync

- [ ] Non verificato

---

## 🎯 PROSSIMI STEP

1. **VERIFICA DATABASE** (tu fai in SSMS):

   ```sql
   SELECT COUNT(*) FROM audit_responses;
   ```

   Se ritorna **0** → conferma che responses non vengono scritte

2. **APPLICO FIX #1** (io): Aggiungo enqueue save_responses

3. **APPLICO FIX #2** (io): Correggo nomi campi backend

4. **APPLICO FIX #3** (io): Calcolo metriche pre-sync

5. **TEST E2E** (tu fai):
   - Ricarica browser
   - Modifica risposta checklist
   - Attendi 30s (auto-sync)
   - Verifica SSMS: `SELECT COUNT(*) FROM audit_responses;` → deve essere >0

---

**FINE ANALISI SISTEMATICA**
