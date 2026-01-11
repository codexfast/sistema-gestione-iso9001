# Test E2E Sync Workflow - Step 1.7

**Data**: 11 gennaio 2026  
**Obiettivo**: Verificare che le risposte checklist si salvino correttamente su database

---

## ✅ Pre-requisiti

- [x] Backend in esecuzione su porta 10443
- [x] Frontend in esecuzione su localhost:3000
- [x] Migration 008 + 008b eseguite
- [x] Step 1.6 completato (API integration)
- [ ] **Migrazione dati legacy completata** (`migrate-status-codes.html`)

---

## 📋 Procedura Test E2E

### Fase 1: Migrazione Dati Esistenti

1. **Apri**: http://localhost:3000/migrate-status-codes.html
2. **Attendi**: Completamento migrazione
3. **Verifica output**:
   - ✅ "X audit migrati con successo"
   - ✅ "Sync queue svuotata"
   - ❌ Se errori → screenshot + console log

### Fase 2: Test Modifica Risposta

1. **Apri app principale**: http://localhost:3000
2. **Login** (se richiesto)
3. **Apri audit esistente** o crea nuovo audit
4. **Vai in Checklist**
5. **Seleziona una domanda** (es. prima domanda clausola 4.1)
6. **Modifica stato** da "Non risposto" → **"C"** (Conforme)
7. **Aggiungi nota**: "Test sync E2E - Step 1.7"
8. **Verifica UI**: Vedi indicatore "Salvato" o "Sincronizzato"

### Fase 3: Verifica Database

**Attendi 30 secondi** (auto-sync interval), poi esegui query:

```sql
-- Query 1: Verifica presenza dati
SELECT COUNT(*) as total_responses
FROM audit_responses;
-- ATTESO: > 0 righe

-- Query 2: Ultimi 10 record
SELECT TOP 10
    response_id,
    audit_id,
    question_id,
    conformity_status,
    notes,
    created_at,
    updated_at
FROM audit_responses
ORDER BY response_id DESC;
-- ATTESO: Vedere riga con conformity_status = 'C' e notes = 'Test sync E2E - Step 1.7'

-- Query 3: Statistiche per status
SELECT
    conformity_status,
    COUNT(*) as count
FROM audit_responses
GROUP BY conformity_status
ORDER BY count DESC;
-- ATTESO: Codici C, NC, OSS, OM, NA, NV (NON 'compliant', 'non_compliant')

-- Query 4: Verifica join con response_options
SELECT
    ar.response_id,
    ar.conformity_status,
    ro.option_name_it,
    ro.color_hex,
    ar.notes
FROM audit_responses ar
LEFT JOIN response_options ro ON ar.conformity_status = ro.option_code
ORDER BY ar.response_id DESC;
-- ATTESO: Join corretto, nomi italiani visibili
```

### Fase 4: Verifica Sync Bidirezionale (Opzionale)

1. **Modifica dato direttamente in DB**:

   ```sql
   UPDATE audit_responses
   SET notes = 'Modificato da DB - test bidirezionale'
   WHERE response_id = (SELECT MAX(response_id) FROM audit_responses);
   ```

2. **Ricarica app** (F5)
3. **Verifica**: Nota aggiornata visibile in UI

---

## ✅ Acceptance Criteria

| Criterio                                             | Status | Note |
| ---------------------------------------------------- | ------ | ---- |
| Migrazione legacy completata senza errori            | ⬜     |      |
| Query `SELECT COUNT(*)` > 0                          | ⬜     |      |
| Risposta modificata in UI appare in DB entro 30s     | ⬜     |      |
| `conformity_status` usa nuovi codici (C, NC, OSS...) | ⬜     |      |
| Join con `response_options` funziona                 | ⬜     |      |
| Note salvate correttamente                           | ⬜     |      |
| Timestamp `created_at` / `updated_at` popolati       | ⬜     |      |

---

## 🐛 Troubleshooting

### Problema: Nessuna riga in `audit_responses`

**Cause possibili**:

1. Sync service non attivo → Verifica console browser per errori
2. Token JWT scaduto → Rifare login
3. Validation backend fallisce → Verifica log backend: `backend/logs/app.log`
4. CORS blocca richiesta → Verifica backend `server.js` cors config

**Debug**:

```javascript
// Console browser
localStorage.getItem("sgq_sync_queue");
// Se presente, significa che sync non è avvenuto
```

### Problema: Status salvato come NULL

**Causa**: Frontend invia status non valido

**Fix**:

```javascript
// Verifica in console browser:
const STATUS = { C: "C", NC: "NC", OSS: "OSS", OM: "OM", NA: "NA" };
console.log(STATUS); // Deve mostrare oggetto corretto
```

### Problema: "compliant" invece di "C" in DB

**Causa**: Migrazione non eseguita o fallita

**Fix**: Rieseguire `migrate-status-codes.html`

---

## 📊 Risultati Attesi

**PRIMA del test** (baseline):

```sql
SELECT COUNT(*) FROM audit_responses;
-- Risultato: 0 righe (o poche righe legacy)
```

**DOPO il test** (target):

```sql
SELECT COUNT(*) FROM audit_responses;
-- Risultato: 1+ righe

SELECT conformity_status FROM audit_responses WHERE notes LIKE '%Test sync E2E%';
-- Risultato: 'C'
```

---

## 📝 Note Operative

- **Tempo stimato**: 15 minuti
- **Prerequisiti**: Backend + Frontend running
- **Rollback**: Non necessario (test non-distruttivo)
- **Log**: Screenshot di ogni fase in `docs/screenshots/step-1-7/`

---

## ✅ Completamento

Al completamento di tutti i criteri, aggiornare:

1. **[open_points.md](open_points.md)**:

   - Step 1.7 ✅ completato
   - Issue #001 → 100% completo
   - Stato generale → 🟢 RISOLTO

2. **[ISSUE_TRACKER.md](ISSUE_TRACKER.md)**:

   - Issue #001 → Status: 🟢 RESOLVED
   - Data chiusura: 11/01/2026

3. **Commit Git**:

   ```bash
   git add .
   git commit -m "fix(sync): Issue #001 - Checklist responses sync to database ✅

   - Migration 008/008b: response_options table
   - Frontend: Updated to new status codes (C, NC, OSS, OM, NA, NV)
   - API integration: ChecklistModule loads options dynamically
   - E2E test: Verified persistence to SQL Server

   Closes #001"
   ```

---

**Firma Test**: **********\_\_\_**********  
**Data**: **_ / _** / 2026
