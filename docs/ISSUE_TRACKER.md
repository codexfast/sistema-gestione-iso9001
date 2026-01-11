# ISSUE TRACKER - Sistema Gestione ISO 9001

**Ultimo Aggiornamento**: 11 gennaio 2026, 17:00  
**Scopo**: Tracciare problemi aperti e soluzioni implementate

---

## 🔴 **PROBLEMI CRITICI APERTI**

### **#001 - Checklist Responses NON Salvano in Database**

**Status**: 🟡 IN PROGRESS (60% completato)  
**Priorità**: P0 - CRITICO  
**Scoperto**: 10 gennaio 2026  
**Owner**: System Architect

**Problema**:
Frontend salva risposte checklist solo in IndexedDB locale, mai sincronizzate con SQL Server.

**Evidenza**:

```sql
-- Query database
SELECT COUNT(*) FROM audit_responses;
-- Risultato: 0 righe (tabella vuota)

-- Console frontend mostra:
[VALIDATION] Invalid conformity_status: compliant
[VALIDATION] Invalid conformity_status: non_compliant
```

**Root Cause**:

1. Frontend usa codici obsoleti (`compliant`, `non_compliant`)
2. Backend valida solo nuovi codici (`C`, `NC`, `OSS`, `OM`, `NA`, `NV`)
3. Sync queue enqueue ma validazione backend rigetta payload

**Soluzione Implementata** (parziale):

| Step | Descrizione                                       | Status   | File Modificato                                                      |
| ---- | ------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| 1.1  | Migration 008: Tabella `response_options`         | ✅ FATTO | `database/migrations/008_create_response_options.sql`                |
| 1.2  | Migration 008b: Colonne `color_hex`, `icon_class` | ✅ FATTO | `database/migrations/008b_alter_response_options_add_ui_columns.sql` |
| 1.3  | Aggiorna `CHECKLIST_STATUS` in frontend           | ✅ FATTO | `app/src/data/auditDataModel.js`                                     |
| 1.4  | Migrazione dati IndexedDB (`compliant` → `C`)     | ✅ FATTO | `app/public/migrate-status-codes.html`                               |
| 1.5  | **Backend endpoint `/response-options`**          | ❌ TODO  | `backend/src/controllers/response.controller.js`                     |
| 1.6  | **Frontend carica opzioni da API**                | ❌ TODO  | `app/src/components/ChecklistModule.jsx`                             |
| 1.7  | **Test E2E sync completo**                        | ❌ TODO  | Manuale                                                              |

**Prossimi Passi**:

1. Creare endpoint `GET /api/v1/response-options` (backend)
2. Modificare frontend per caricare opzioni dinamicamente
3. Test: modifica risposta → verifica salvataggio DB
4. Query verifica: `SELECT * FROM audit_responses WHERE conformity_status IN ('C', 'NC', 'OM')`

**Acceptance Criteria**:

- ✅ Query `SELECT COUNT(*) FROM audit_responses` → >0 righe
- ✅ Modifica risposta in UI → sync automatico entro 30s
- ✅ Database mostra `conformity_status` = 'C', 'NC', 'OSS', 'OM', 'NA', 'NV'

**Note**:

- Rate limiter disabilitato per testing locale (riabilitare in produzione)
- `backend/src/server.js` line 64: `// app.use('/api/', limiter);` commentato

---

### **#002 - Rate Limiting Troppo Restrittivo (RISOLTO TEMPORANEAMENTE)**

**Status**: 🟢 MITIGATO (riabilitare in produzione)  
**Priorità**: P2 - MEDIO  
**Scoperto**: 10 gennaio 2026  
**Risolto**: 10 gennaio 2026

**Problema**:
Sync automatico ogni 30s esaurisce rate limit (100 req/15min) causando HTTP 429.

**Soluzione Temporanea**:

```javascript
// backend/src/server.js line 64
// app.use('/api/', limiter); // COMMENTATO per testing locale
```

**Soluzione Permanente** (TODO):

- Aumentare limit a 500 req/15min in produzione
- Aggiungere variabile ENV: `RATE_LIMIT_MAX_REQUESTS=500`
- Implementare rate limit per user, non per IP

**File da Modificare**:

- `backend/src/server.js`
- `backend/.env.example`

---

## 🟡 **PROBLEMI MEDI APERTI**

### **#003 - File Export Word Non Funziona su Android**

**Status**: 🟡 DOCUMENTATO (ADR-003)  
**Priorità**: P1 - ALTO (uso mobile primario)  
**Scoperto**: 11 gennaio 2026

**Problema**:
File System Access API non supportata su Android Chrome → export report fallisce.

**Soluzione Proposta** (ADR-003):

- Fallback download blob + Share API
- File: `app/src/utils/mobileExport.js`

**Status**: Non implementato, solo documentato in ADR-003

**Prossimi Passi**:

- Test su tablet Android reale (conferma problema)
- Implementa `mobileExport.js` se necessario

---

### **#004 - Storage Quota Android (50MB Limit)**

**Status**: 🟡 DOCUMENTATO (ADR-003)  
**Priorità**: P2 - MEDIO  
**Scoperto**: 11 gennaio 2026

**Problema**:
IndexedDB su Android ha quota ~50MB → 20-30 audit con foto → overflow.

**Soluzione Proposta** (ADR-003):

- Monitoring quota: warning UI a 60%, cleanup a 80%
- File: `app/src/services/storageQuotaService.js`

**Status**: Non implementato

**Acceptance Criteria**:

- ✅ Warning toast a 60% quota
- ✅ Cleanup automatico audits vecchi (>30gg + synced)
- ✅ App non crasha a quota piena

---

## 🟢 **PROBLEMI RISOLTI**

### **#005 - Opzione NV (Non Verificato) Mancante**

**Status**: ✅ RISOLTO  
**Priorità**: P1 - ALTO  
**Risolto**: 11 gennaio 2026

**Problema**:
UI mostra solo 5 opzioni (C, NC, OSS, OM, NA), manca NV.

**Soluzione**:

- Migration 008: aggiunto `NV` in `response_options`
- Constraint DB aggiornato: `CHECK conformity_status IN ('C', 'NC', 'OSS', 'OM', 'NA', 'NV')`

**Verifica**:

```sql
SELECT option_code, option_name_it FROM response_options ORDER BY display_order;
-- Output:
-- C    | Conforme (Soddisfatto)
-- OSS  | Osservazione
-- NC   | Non Conforme
-- OM   | Opportunità Miglioramento
-- NA   | Non Applicabile
-- NV   | Non Verificato ← AGGIUNTO
```

---

## 📊 **STATISTICHE ISSUE**

| Categoria         | Count | %        |
| ----------------- | ----- | -------- |
| 🔴 Critici Aperti | 1     | 20%      |
| 🟡 Medi Aperti    | 2     | 40%      |
| 🟡 Mitigati       | 1     | 20%      |
| 🟢 Risolti        | 1     | 20%      |
| **TOTALE**        | **5** | **100%** |

**Priorità Focus**: #001 (Sync Responses) → blocca tutte le feature audit

---

## 🎯 **PROSSIMA AZIONE IMMEDIATA**

**Tornare a #001 - Completare Sync Responses**

**Step 1.5**: Creare endpoint backend `GET /api/v1/response-options`

**File**: `backend/src/controllers/response.controller.js`

**Codice**:

```javascript
async function getResponseOptions(req, res) {
  try {
    const result = await query(`
            SELECT option_code, option_name_it, option_name_en,
                   option_description, severity_level, weight_percentage,
                   exclude_from_calc, display_order, icon_class, color_hex
            FROM response_options
            WHERE is_active = 1
            ORDER BY display_order
        `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    logger.error("Error getting response options", { error: error.message });
    res
      .status(500)
      .json({ error: "Errore opzioni risposta", code: "OPTIONS_GET_ERROR" });
  }
}
```

**Tempo Stimato**: 15 minuti

**Vuoi procedere con Step 1.5?** (Sì/No)

---

## 📝 **NOTE METODOLOGIA**

**Policy Aggiornamento**:

- Ogni problema rilevato → apri issue qui con ID univoco
- Ogni soluzione implementata → aggiorna status + file modificato
- Ogni giorno → aggiorna "Ultimo Aggiornamento" header
- Priorità: P0 (blocca tutto), P1 (blocca feature), P2 (miglioria), P3 (nice-to-have)

**Workflow**:

1. Identifica problema → Apri issue
2. Analizza root cause → Documenta
3. Proponi soluzione → Ottieni approval
4. Implementa → Aggiorna status
5. Verifica → Chiudi issue

**Reference**:

- ISO 9001:2015 punto 10.2: Non conformità e azioni correttive
- ISO 9001:2015 punto 8.5.1: Controllo della produzione e fornitura di servizi
