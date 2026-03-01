# Open Points - Sistema Gestione ISO 9001

**Ultimo aggiornamento**: 2026-03-01 (pomeriggio) — commit `9894ed5`
**Owner**: Team SGQ ISO  
**Stato Generale**: 🟢 **Nessun blocco critico** — ISO 14001 frontend completato, export Word e test E2E prossimi

---

## 🎯 Priorità (prossima sessione)

### P1 - TEST E2E 🟡

- [ ] **Test Netlify**: creare audit con ISO 9001 + ISO 14001 dal modal → verificare `selectedStandards` salvato
- [ ] **Test accordion**: tab ISO 14001 visibile dopo selezione da Dati Generali 1.1
- [ ] **Test sync**: `standard_id: 2` inviato correttamente al server per ISO 14001
- [ ] **Test riapertura**: risposte ISO 14001 ripristinate dal server al ricaricamento

### P2 - EXPORT WORD ISO 14001 🟠

- [ ] Aggiungere sezione ISO 14001 nel `wordExport.js` (46 domande → NC/OSS/OM riepilogati)

---

## ✅ Risolti il 01/03/2026 (seconda sessione)

### **#006 - ✅ RISOLTO - Norme selezionate nel modal ignorate**

**Commit**: `9894ed5` | **File**: `AuditSelector.jsx`  
**Sintomo**: Selezionando ISO 14001 + ISO 9001 nel modal di creazione, il nuovo audit veniva creato sempre solo con `["ISO_9001"]`.  
**Root cause**: `formData.norms` (array locale del modal) non era mai copiato in `submitData.selectedStandards` prima di chiamare `onCreate()`. `createNewAudit()` legge `metadata.selectedStandards`, trovava `undefined` e usava il default.  
**Fix**: `submitData.selectedStandards = formData.norms` aggiunto nel `handleSubmit` prima di `onCreate(submitData)`.

---

### **#007 - ✅ RISOLTO - Tab checklist ISO 14001 non visibile dopo selezione da Dati Generali**

**Commit**: `9894ed5` | **File**: `AuditAccordionLayout.jsx`  
**Sintomo**: Aggiungendo ISO 14001 da accordion Dati Generali → 1.1, il tab checklist ISO 14001 non appariva nella sezione Checklist.  
**Root cause**: `GeneralDataSection` salva il `standard_code` del DB (`"ISO_14001_2015"`), ma l'accordeon usava `selectedStandards.includes("ISO_14001")` che non matchava.  
**Fix**: Sostituito con `selectedStandards.some(s => s === "ISO_14001" || s === "ISO_14001_2015")` — stesso pattern già corretto per ISO 9001.

---

### **#008 - ✅ RISOLTO - `backendToFrontend` formato inconsistente**

**Commit**: `9894ed5` | **File**: `auditConverter.js`  
**Sintomo**: Audit caricati dal server avevano `selectedStandards: ["ISO_9001_2015"]` mentre audit creati localmente avevano `["ISO_9001"]` → stesso componente si comportava diversamente a seconda dell'origine.  
**Root cause**: `backendToFrontend` restituiva il codice con anno (`ISO_9001_2015`); non sfruttava il campo `standards` (CSV da `audit_standards` JOIN) già presente nella risposta `listAudits`.  
**Fix**: Normalizzazione a formato canonico senza anno; ora usa `backendAudit.standards` per multi-standard reale, con fallback su `standard_id`.

---

### **#009 - ✅ RISOLTO - `syncService` inviava `standard_ids: ["ISO_9001"]` (stringa)**

**Commit**: `9894ed5` | **File**: `syncService.js`  
**Sintomo**: La sync inviava al server `standard_ids: ["ISO_9001"]` (array di codici stringa). Il backend `/audits/sync` legge `standard_id: number` (intero singolo) → il valore veniva ignorato, tutti gli audit sincronizzati ricevevano `standard_id=1`.  
**Root cause**: nessuna conversione codice→intero nel payload sync; confusione tra `/audits` (usa `standard_ids[]`) e `/audits/sync` (usa `standard_id` singolo).  
**Fix**: Aggiunta funzione `resolveStandardId()` che converte `"ISO_14001"` → `2`; ora invia `standard_id: 2` per ISO 14001.

---

## ✅ Risolti Recentemente (sessioni precedenti)

### **#001 - ✅ RISOLTO - Le risposte checklist si salvano correttamente su database**

**Data Chiusura**: 11 gennaio 2026, 19:20

**Sintomo**:

- Rispondo a domanda in audit → vedo "Salvato" nell'app
- Query DB: `SELECT COUNT(*) FROM audit_responses` → **0 righe**
- Risposte salvate SOLO in IndexedDB browser (dati locali non sincronizzati)

**Impatto**:

- ❌ Impossibile generare report dal backend
- ❌ Dati persi se utente cancella cache browser
- ❌ Nessun backup centralizzato

**Root Cause**:

```
Frontend (StorageContext.jsx) → invia "compliant"
Backend (validation) → rifiuta, accetta SOLO "C"
Sync fallisce → risposte restano in IndexedDB
```

**✅ SOLUZIONE COMPLETATA** (100% - CHIUSO 11/01/2026 19:20):

- [x] **Step 1.1**: Creato `response_options` table (Migration 008)
- [x] **Step 1.2**: Aggiunti colori UI (Migration 008b)
- [x] **Step 1.3**: Aggiornato frontend CHECKLIST_STATUS (`C`, `NC`, `OSS`, ...)
- [x] **Step 1.4**: Creato tool migrazione `migrate-status-codes.html`
- [x] **Step 1.5**: ✅ Backend endpoint `/response-options` funzionante (6 opzioni)
- [x] **Step 1.6**: ✅ Frontend integrato con API (ChecklistModule.jsx)
- [x] **Step 1.7**: ✅ **COMPLETATO** - E2E sync verificato su DB reale
  - **Evidenza**: 52 risposte salvate in `audit_responses`
  - **Status codes**: C (37), NA (5), NC (4), OM (4), OSS (2) → 100% corretti
  - **Ultime modifiche**: 4 gennaio 2026 (sync attivo da giorni)
  - **Note**: Salvate correttamente (es. "test 8.6", "bilancio")
  - **Timestamp**: `created_at` e `updated_at` popolati ✅

**PROSSIMA AZIONE** (ORA):

```bash
# 1. Eseguire migrazione dati esistenti
http://localhost:3001/migrate-status-codes.html

# 2. Test E2E sync:
# - Aprire audit esistente
# - Modificare risposta domanda (es. da NOT_ANSWERED a "C")
# - Attendere auto-sync (30 secondi)
# - Query DB: SELECT TOP 10 * FROM audit_responses ORDER BY response_id DESC
# - Verificare presenza riga con conformity_status = 'C'
```

**Acceptance Criteria** (TUTTI SODDISFATTI ✅):

1. ✅ Query DB: `SELECT COUNT(*) FROM audit_responses` → **52 righe**
2. ✅ `conformity_status` usa SOLO nuovi codici: C (37), NC (4), OSS (2), OM (4), NA (5)
3. ✅ Note salvate correttamente (es. "test 8.6", "bilancio")
4. ✅ Timestamp popolati: `created_at`, `updated_at`
5. ✅ Auto-sync funzionante dal 4 gennaio 2026

**Tempo Effettivo**: 3 ore (migration + API integration + verifica)

---

## 📋 Priorità Alta (questa settimana)

### P1 - ALTA 🟠

#### **#003 - Export file Word non funziona su tablet Android**

**Sintomo**:

- Desktop Chrome → export report ✅ funziona
- Tablet Android → click "Esporta" → errore silenzioso

**Root Cause**:
File System Access API non supportata su Android Chrome

**Soluzione Proposta** (ADR-003):

```javascript
// Fallback per Android
const blob = new Blob([docxData], {
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});
const url = URL.createObjectURL(blob);

// Tentativo 1: Download diretto
const a = document.createElement("a");
a.href = url;
a.download = "Audit_Report.docx";
a.click();

// Tentativo 2: Share API (se disponibile)
if (navigator.share) {
  const file = new File([blob], "Audit_Report.docx", { type: blob.type });
  await navigator.share({ files: [file], title: "Report Audit ISO 9001" });
}
```

**File da Modificare**: `app/src/services/wordExport.js` (linee 150-180)

**Test Richiesto**:

- ⚠️ **Serve tablet Android fisico** (emulatore non affidabile per File API)
- User test con tablet in stabilimento

**Tempo Stimato**: 3 ore (2h dev, 1h test device)

---

## 📌 Priorità Media (prossimi sprint)

### P2 - MEDIA 🟡

#### **#004 - Quota storage 50MB Android (rischio overflow con foto)**

**Sintomo**:

- 1 audit con 10 foto (3MB ciascuna) = 30MB
- 2 audit = 60MB → **superato limite Android** → app crasha

**Soluzione Proposta** (ADR-003):

1. Service `storageQuotaService.js`:

   - Monitora spazio IndexedDB ogni 5 minuti
   - Warning toast a 60% utilizzo (30MB)
   - Auto-cleanup a 80% (40MB): elimina audit sincronizzati >30 giorni

2. UI indicator barra spazio in Settings page

**File da Creare**:

- `app/src/services/storageQuotaService.js` (nuovo)
- `app/src/components/settings/StorageInfo.jsx` (nuovo)

**Test Richiesto**:

- Simulare 20 audit con foto da 2-3MB ciascuna
- Verificare cleanup automatico
- Test su tablet Android reale

**Tempo Stimato**: 5 ore (3h dev, 2h test)

---

#### **#002 - Rate limiting troppo restrittivo (MITIGATO temporaneamente)**

**Stato**: 🟢 **Funziona** in locale (rate limiter disabilitato)

**Problema Originale**:

- Sync auto ogni 30s → 120 richieste/ora
- Rate limit backend: 100 req/15min → blocco dopo ~7 minuti

**Fix Temporaneo**:

```javascript
// backend/src/server.js line 64
// app.use('/api/', limiter); // COMMENTATO per testing locale
```

**Fix Permanente** (TODO prima di deploy):

```javascript
// Aumentare limite a 500 req/15min
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 500, // ← NEW
  message: "Troppe richieste, riprova tra 15 minuti",
});
```

**File da Modificare**: `backend/src/server.js` (line 64)  
**Env Variable**: `RATE_LIMIT_MAX_REQUESTS=500` in production

**Tempo Stimato**: 30 minuti (semplice config)

---

## ✅ Risolti

### **#005 - Opzione "Non Verificato" (NV) mancante** ✅

**Risoluzione**: Migration 008 aggiunto NV  
**Verifica**: Query DB conferma 6 opzioni (C, OSS, NC, OM, NA, NV)  
**Data Chiusura**: 2026-01-11

---

## 🛠️ Miglioramenti Architetturali (backlog)

### **BP-001 - Schema DB versionato non esportato automaticamente**

**Problema**: `database/schema.sql` non si aggiorna dopo nuove migration

**Soluzione Creata**: Script PowerShell `database/scripts/export-schema.ps1`

**Prossimi Step**:

1. Eseguire script manualmente: `.\database\scripts\export-schema.ps1`
2. Committare nuovo `schema.sql`
3. (Opzionale) Hook Git pre-commit per auto-export

**Priorità**: Bassa (non blocca sviluppo)

---

### **BP-002 - Icone PWA PNG per Android**

**Problema**: `manifest.json` usa SVG → non supportato da alcuni launcher Android

**Soluzione**:

```json
// app/public/manifest.json
{
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**File da Creare**:

- `app/public/icons/icon-192.png`
- `app/public/icons/icon-512.png`

**Priorità**: Bassa (fallback SVG funziona su Chrome)

---

## 📊 Statistiche

| Priorità     | Aperti | Risolti | Totale |
| ------------ | ------ | ------- | ------ |
| P0 - Critico | 1      | 0       | 1      |
| P1 - Alta    | 1      | 0       | 1      |
| P2 - Media   | 2      | 0       | 2      |
| Risolti      | -      | 1       | 1      |
| Backlog      | 2      | -       | 2      |
| **TOTALE**   | **4**  | **1**   | **7**  |

**Grafico Priorità**:

```
P0 ████░░░░░░ (1)  ← BLOCCA TUTTO
P1 ████░░░░░░ (1)
P2 ████████░░ (2)
```

---

## 🎯 Piano d'Azione Questa Settimana

### Lunedì 2026-01-11 (OGGI)

- [ ] **#001 Step 1.6**: Integrare frontend con API `/response-options` (2h)
- [ ] **#001 Step 1.7**: Test E2E sync risposte (1h)
- [ ] **#001**: Eseguire `migrate-status-codes.html` per convertire dati esistenti

### Martedì 2026-01-12

- [ ] **#002**: Abilitare rate limiter con limite 500 (30min)
- [ ] **BP-001**: Eseguire export-schema.ps1 e committare (15min)
- [ ] **#003**: Implementare fallback Android export (3h)

### Mercoledì 2026-01-13

- [ ] **#003**: Test export su tablet Android fisico (1h)
- [ ] **#004**: Creare storageQuotaService.js (2h)

### Giovedì 2026-01-14

- [ ] **#004**: Implementare UI storage indicator (2h)
- [ ] **#004**: Test overflow scenario con 20 audit (1h)

### Venerdì 2026-01-15

- [ ] **BP-002**: Generare icone PNG 192x512 (1h)
- [ ] **Retrospettiva**: Review open points → priorità prossima settimana

---

## 📖 Riferimenti

### File Chiave

- **Issue Tracker**: `docs/ISSUE_TRACKER.md` (dettagli tecnici problemi)
- **ADR Mobile**: `docs/adr/ADR-003-pwa-mobile-android-strategy.md` (strategia PWA)
- **Migrazioni DB**: `database/migrations/00*.sql`
- **Tool Migrazione**: `app/public/migrate-status-codes.html`

### Comandi Utili

```powershell
# Test backend locale
cd backend; npm start

# Test endpoint response-options
curl http://localhost:10443/api/v1/response-options | ConvertFrom-Json

# Query DB audit responses
sqlcmd -S SERVER -d DB -Q "SELECT TOP 10 * FROM audit_responses ORDER BY response_id DESC"

# Esportare schema DB
.\database\scripts\export-schema.ps1
```

### Contatti

- **Tech Lead**: [Nome]
- **QA**: [Nome]
- **User tester tablet**: [Nome] (per test Android fisico)

---

## 🔄 Workflow Update

**Frequenza Aggiornamento**: Ogni fine giornata  
**Owner**: Tech Lead  
**Review**: Venerdì retrospettiva settimanale

**Template Aggiornamento**:

```markdown
## [Data] - Update

### Completati Oggi

- [ ] #XXX - Descrizione (tempo effettivo: Xh)

### Blocchi Incontrati

- Problema: ...
- Soluzione: ...

### Prossimi Passi Domani

- [ ] Task 1
- [ ] Task 2
```

---

**NOTA IMPORTANTE**: Questo documento è la **SINGOLA FONTE DI VERITÀ** per priorità. Tutti gli altri documenti (ISSUE_TRACKER.md, ADR) sono di supporto ma questo file guida il lavoro quotidiano.

**Regola d'Oro**:

> Se non è in `open_points.md` → non è prioritario → non lavorarci ora.
