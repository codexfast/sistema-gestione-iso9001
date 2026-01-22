# ADR-002: Strategia Allineamento Checklist ISO 9001:2015

---

**Stato**: In Analisi  
**Data**: 2026-01-04  
**Autore**: System Architect + User  
**Sessione**: Debug sync checklist responses  
**Tag**: architettura, qualità, conformità-iso, data-model

---

## Contesto e Problema Scoperto

Durante il debug del sync delle risposte checklist (audit 1010 - Raccorderia Piacentina), è emerso un **problema architetturale critico**:

### Sintomi Iniziali

- Frontend mostra **26/26 domande completate** (100%)
- Database contiene **24 risposte salvate** su **78 domande totali** (30.77%)
- View `vw_audit_checklist_comparison` mostrava 78 righe (tutte le domande DB) invece di 26

### Root Cause Analysis

Il sistema utilizza **DUE checklist diverse**:

| Componente   | Domande | Fonte                                               | Granularità                                   |
| ------------ | ------- | --------------------------------------------------- | --------------------------------------------- |
| **Frontend** | 26      | `app/src/utils/checklistInitializer.js` (hardcoded) | 1 domanda per clausola principale (4-10)      |
| **Backend**  | 78      | `database/seed_checklist_iso9001_v3.sql`            | Più domande per clausola, dettaglio variabile |

### Impatto

- ❌ **Data inconsistency**: Frontend e backend non sincronizzati
- ❌ **Sync parziale**: Solo 24/78 risposte salvate (26 frontend - 2 errori sync)
- ❌ **Audit incompiuto**: Mancano 52 domande se si considera il DB come riferimento
- ❌ **Conformità ISO dubbia**: Nessuna delle due checklist validata contro norma ufficiale

---

## Analisi Fonti Normative

### Documento 1: UNI EN ISO 9001:2015 Rev. 0.txt

- **Path**: `Normative/UNI EN ISO 9001_2015 Rev. 0.txt`
- **Editore**: UNI (Ente Nazionale Italiano di Normazione)
- **Versione**: Settembre 2015
- **Proprietà**: Tecnove Spa - Licenza UNIstore 2023/316641
- **Contenuto**: Testo normativo completo ISO 9001:2015 (2232 righe)

### Documento 2: Linea Guida Conforma 9001_2015.txt ⭐ GOLD STANDARD

- **Path**: `Quaderni/Linea Guida Conforma 9001_2015.txt`
- **Autore**: CONFORMA (Associazione Organismi Certificazione Italiani)
  - Membri: BUREAU VERITAS, CERTIQUALITY, DNV GL, RINA Services, SGS, ICMQ, IMQ, ecc.
- **Revisore**: Marco CIBIEN (UNI)
- **Pubblicazione**: Novembre 2015
- **Struttura**: Per ogni clausola ISO 9001:2015:
  - "DESCRIZIONE DEL REQUISITO E RELATIVE CONSIDERAZIONI"
  - "POSSIBILI EVIDENZE A SUPPORTO DELLA CONFORMITÀ"
- **Contenuto**: 2510 righe - Guida pratica per auditor e organizzazioni

### Analisi Clausole Conforma

Conteggio clausole/sottoclausole nella guida:

**Clausola 4 - Contesto dell'Organizzazione**:

- 4.1, 4.2, 4.3, 4.4 = **4 punti**

**Clausola 5 - Leadership**:

- 5.1.1 Generalità, 5.1.2 Focalizzazione Cliente
- 5.2.1 Stabilire politica, 5.2.2 Comunicare politica
- 5.3 Ruoli responsabilità
- Totale: **5 punti**

**Clausola 6 - Pianificazione**:

- 6.1, 6.2, 6.3 = **3 punti**

**Clausola 7 - Supporto**:

- 7.1.1 Generalità, 7.1.2 Persone, 7.1.3 Infrastrutture, 7.1.4 Ambiente, 7.1.5.1 + 7.1.5.2 Misurazione, 7.1.6 Conoscenza
- 7.2 Competenza, 7.3 Consapevolezza, 7.4 Comunicazione
- 7.5.1 Generalità, 7.5.2 Creazione, 7.5.3 Controllo
- Totale: **13 punti**

**Clausola 8 - Attività Operative**:

- 8.1 Pianificazione controllo
- 8.2.1 Comunicazione cliente, 8.2.2 Determinazione requisiti, 8.2.3 Riesame requisiti, 8.2.4 Modifiche
- 8.3.1-8.3.6 Progettazione (6 punti - SE APPLICABILE)
- 8.4.1-8.4.3 Controllo fornitori (3 punti)
- 8.5.1-8.5.6 Produzione/erogazione (6 punti)
- 8.6 Rilascio, 8.7 Output non conformi
- Totale: **23 punti** (18 se 8.3 non applicabile)

**Clausola 9 - Valutazione Prestazioni**:

- 9.1.1 Generalità, 9.1.2 Soddisfazione cliente, 9.1.3 Analisi valutazione
- 9.2 Audit interno
- 9.3.1 Generalità, 9.3.2 Input riesame, 9.3.3 Output riesame
- Totale: **7 punti**

**Clausola 10 - Miglioramento**:

- 10.1, 10.2, 10.3 = **3 punti**

**TOTALE CLAUSOLE ISO 9001:2015**: **~58 punti** (53 se 8.3 escluso)

---

## Analisi Database Attuale

### Query Diagnostica Eseguita

```sql
SELECT COUNT(DISTINCT section_code) AS num_clausole
FROM checklist_questions WHERE standard_id = 1;
-- Risultato: 31 clausole

SELECT section_code, COUNT(*) AS domande_per_sezione
FROM checklist_questions WHERE standard_id = 1
GROUP BY section_code ORDER BY section_code;
```

### Risultati

- **31 section_code univoche** (vs 58 clausole Conforma)
- **78 domande totali** (media 2.5 domande/clausola)

### Discrepanze Identificate

**Database HA PIÙ domande del necessario**:

- **10.2**: 5 domande (Conforma = 1 clausola)
- **9.1**: 4 domande (Conforma = 3 clausole: 9.1.1, 9.1.2, 9.1.3)
- **9.2**: 4 domande (Conforma = 1 clausola)
- **9.3**: 4 domande (Conforma = 3 clausole: 9.3.1, 9.3.2, 9.3.3)
- **8.6**: 3 domande (Conforma = 1 clausola)
- **8.7**: 3 domande (Conforma = 1 clausola)

**Database HA MENO sezioni del necessario**:

- **5.1**: 3 domande (Conforma richiede 5.1.1 + 5.1.2 separate)
- **5.2**: 2 domande (Conforma richiede 5.2.1 + 5.2.2 separate)
- **7.1**: Solo 7.1.2, 7.1.3, 7.1.4, 7.1.5, 7.1.6 (manca 7.1.1 Generalità)
- **7.5**: 2 domande (Conforma richiede 7.5.1, 7.5.2, 7.5.3 separate)
- **8.2**: 3 domande (Conforma richiede 8.2.1, 8.2.2, 8.2.3, 8.2.4 separate)
- **8.3**: 2 domande (Conforma richiede 8.3.1-8.3.6 = 6 clausole SE applicabile)
- **8.5**: 4 domande (Conforma richiede 8.5.1-8.5.6 = 6 clausole)
- **9.1**: 4 domande (manca separazione 9.1.1, 9.1.2, 9.1.3)

**Conclusione**: Il database attuale NON segue la struttura ufficiale Conforma.

---

## Analisi Frontend Attuale

### File: `app/src/utils/checklistInitializer.js`

**Struttura**:

```javascript
const ISO_9001_QUESTIONS_TEMPLATE = [
  {
    clauseId: "clause4_Context",
    clauseTitle: "4. Contesto...",
    questions: [
      {
        id: "q4.1",
        title: "4.1 - Comprendere...",
        text: "...",
        clauseRef: "4.1",
      },
      { id: "q4.2", title: "4.2 - Esigenze...", text: "...", clauseRef: "4.2" },
      {
        id: "q4.3",
        title: "4.3 - Campo applicazione...",
        text: "...",
        clauseRef: "4.3",
      },
      {
        id: "q4.4",
        title: "4.4 - Sistema gestione...",
        text: "...",
        clauseRef: "4.4",
      },
    ],
  },
  // ... altre clausole
];
```

**Caratteristiche**:

- **26 domande hardcoded** (1 per clausola principale)
- **Granularità semplificata**: non distingue sottoclausole (es: 5.1.1 vs 5.1.2)
- **Vantaggio**: checklist rapida per audit screening
- **Svantaggio**: NON conforme per certificazione ISO 9001:2015 completa

---

## Strategie di Correzione Proposte

### Opzione A: Single Source of Truth - Database Conforma ⭐ RACCOMANDATO

**Obiettivo**: Allineare TUTTO al Gold Standard Conforma

**Step 1 - Estrazione Checklist da Linea Guida**:

1. Parsing automatico file `Quaderni/Linea Guida Conforma 9001_2015.txt`
2. Estrazione di:
   - Section_code (es: 5.1.1, 8.2.3)
   - Section_title
   - Testo domanda da "POSSIBILI EVIDENZE"
3. Generazione file `database/seeds/seed_checklist_iso9001_conforma_official.sql`

**Step 2 - Migration Database**:

```sql
-- Migration 005: Replace checklist with Conforma official
BEGIN TRANSACTION;

-- Backup domande esistenti
SELECT * INTO checklist_questions_backup_20260104
FROM checklist_questions WHERE standard_id = 1;

-- Backup risposte audit 1010
SELECT * INTO audit_responses_backup_20260104
FROM audit_responses WHERE audit_id = 1010;

-- Cancella domande obsolete
DELETE FROM checklist_questions WHERE standard_id = 1;

-- Inserisci 58 domande Conforma
-- (eseguire seed_checklist_iso9001_conforma_official.sql)

COMMIT;
```

**Step 3 - Frontend Refactoring**:

```javascript
// PRIMA (checklistInitializer.js - ELIMINARE)
const ISO_9001_QUESTIONS_TEMPLATE = [
  /* 26 domande hardcoded */
];

// DOPO (nuovo file: app/src/services/checklistService.js)
export async function fetchChecklistQuestions(standardId) {
  const response = await apiService.get(`/standards/${standardId}/questions`);
  return response.data.questions; // 58 domande da backend
}

// In StorageContext.jsx
async function createNewAudit(metadata) {
  const questions = await checklistService.fetchChecklistQuestions(1); // ISO 9001
  const checklist = buildChecklistStructure(questions);
  // ... salva audit con checklist dinamica
}
```

**Step 4 - Backend API Endpoint**:

```javascript
// backend/src/routes/standard.routes.js
router.get('/standards/:standardId/questions', standardController.getQuestions);

// backend/src/controllers/standard.controller.js
async getQuestions(req, res) {
    const { standardId } = req.params;
    const questions = await query(`
        SELECT
            cq.question_id,
            cq.section_code,
            cs.section_title,
            cq.question_text,
            cq.display_order
        FROM checklist_questions cq
        JOIN checklist_sections cs ON cq.section_code = cs.section_code
        WHERE cq.standard_id = @standardId AND cq.is_active = 1
        ORDER BY cq.display_order
    `, { standardId });
    res.json({ questions });
}
```

**Vantaggi**:

- ✅ **Conformità certificazione**: checklist validata da CONFORMA (organismi certificatori)
- ✅ **Single source of truth**: database è l'unica fonte
- ✅ **Scalabilità**: aggiungere ISO 14001/45001 è semplice (stessa logica)
- ✅ **Tracciabilità**: ogni domanda referenziata a clausola normativa precisa

**Svantaggi**:

- ⚠️ **Breaking change**: checklist esistenti (audit 1010) incompatibili
- ⚠️ **Refactoring frontend**: medio impatto (2-4 ore lavoro)
- ⚠️ **Data migration**: risposte esistenti devono essere mappate a nuove domande

---

### Opzione B: Dual Mode - Checklist Semplificata + Completa

**Obiettivo**: Mantenere entrambe le versioni per casi d'uso diversi

**Implementazione**:

```javascript
// Database: aggiungere campo checklist_type
ALTER TABLE checklist_questions ADD checklist_type NVARCHAR(20) DEFAULT 'full'
CHECK (checklist_type IN ('simplified', 'full'));

-- 26 domande simplified (audit screening rapido)
UPDATE checklist_questions SET checklist_type = 'simplified'
WHERE question_id IN (1, 5, 9, 14, ...); -- IDs domande principali

-- 58 domande full (audit certificazione)
INSERT INTO checklist_questions (standard_id, section_code, question_text, checklist_type, ...)
VALUES (1, '5.1.1', 'L''alta direzione dimostra...', 'full', ...);
```

**Frontend**:

```javascript
// Creazione audit con scelta tipo checklist
const audit = await createAudit({
  clientName: "Raccorderia Piacentina",
  checklistType: "simplified" | "full", // user selects
  standardId: 1,
});
```

**Vantaggi**:

- ✅ **Retrocompatibilità**: audit esistenti continuano a funzionare
- ✅ **Flessibilità**: auditor sceglie checklist in base a obiettivo

**Svantaggi**:

- ❌ **Complessità**: mantenere 2 checklist parallele
- ❌ **Confusione**: quale checklist usare quando?
- ❌ **Doppio lavoro**: aggiornamenti normativi vanno fatti 2 volte

---

### Opzione C: Migrazione Manuale Audit Esistente

**Obiettivo**: Convertire audit 1010 (26 risposte) in checklist Conforma (58 domande)

**Procedura**:

1. **Mapping manuale**: Utente crea file Excel con corrispondenze
   - Colonna A: `question_id` vecchia (26 domande)
   - Colonna B: `question_id` nuova Conforma (58 domande)
   - Colonna C: Azione (KEEP, SPLIT, MERGE, DELETE)

2. **Script migrazione**:

```sql
-- Esempio: domanda 4.1 vecchia → 2 nuove domande 4.1 Conforma
INSERT INTO audit_responses (audit_id, question_id, conformity_status, notes, ...)
SELECT 1010, 101, ar.conformity_status, ar.notes, ... -- nuova 4.1a
FROM audit_responses ar WHERE ar.audit_id = 1010 AND ar.question_id = 1
UNION ALL
SELECT 1010, 102, 'C', 'Ereditato da domanda 4.1 originale', ... -- nuova 4.1b
FROM audit_responses ar WHERE ar.audit_id = 1010 AND ar.question_id = 1;
```

**Vantaggi**:

- ✅ **Nessuna perdita dati**: tutte le risposte salvate migrano

**Svantaggi**:

- ❌ **Lavoro manuale**: 4-8 ore mappatura + validazione
- ❌ **Errori umani**: rischio mapping errato

---

## Prossimi Passi (Sessione 5 Gennaio 2026)

### Task 1: Decisione Strategica

**Owner**: User  
**Deadline**: 5 gennaio mattina  
**Output**: Scelta tra Opzione A, B, C

**Domande da rispondere**:

1. **Scopo audit**: certificazione ufficiale ISO 9001 o uso interno?
   - Se certificazione → **Opzione A obbligatoria** (Conforma gold standard)
   - Se uso interno → Opzione B accettabile

2. **Audit esistente (1010)**: conservare o rifare?
   - Se conservare → Opzione C (migrazione manuale)
   - Se rifare → Opzione A (cancella e ricrea con checklist corretta)

3. **Tempo disponibile**: quante ore per implementazione?
   - Opzione A: 6-8 ore (refactoring + migration)
   - Opzione B: 10-12 ore (doppio sistema)
   - Opzione C: 4-8 ore (solo migrazione dati)

### Task 2: Validazione Checklist Conforma (Se Opzione A)

**Owner**: Agent  
**Input**: File `Quaderni/Linea Guida Conforma 9001_2015.txt`  
**Output**: File `database/seeds/seed_checklist_iso9001_conforma_official.sql`

**Step**:

1. Parsing automatico documento Conforma (2510 righe)
2. Estrazione 58 clausole con:
   - section_code preciso (es: 7.1.5.2)
   - section_title da guida
   - question_text da sezione "POSSIBILI EVIDENZE"
3. Generazione SQL INSERT con:
   - display_order sequenziale
   - is_mandatory = 1 (tutti i requisiti ISO sono obbligatori)
   - question_type = 'conformity' (C/NC/OM/NA)

### Task 3: Backup Pre-Migration

**Owner**: User  
**Tool**: SSMS  
**Output**: File `.bak` database completo

```sql
BACKUP DATABASE SGQ_ISO9001
TO DISK = 'C:\Backup\SGQ_ISO9001_pre_migration_005_20260104.bak'
WITH FORMAT, COMPRESSION, STATS = 10;
```

### Task 4: Test E2E Post-Migration

**Owner**: User + Agent  
**Scenario**: Creare nuovo audit da zero con checklist Conforma

**Acceptance Criteria**:

1. ✅ Frontend carica 58 domande da backend (non hardcoded)
2. ✅ Compilazione checklist → 58 risposte salvate in DB
3. ✅ Sync funziona al 100% (58/58 risposte)
4. ✅ Report PDF mostra 58 domande con risposte corrette
5. ✅ View `vw_audit_checklist_comparison` mostra 58/58 salvate

---

## Riferimenti

**Documenti Normativi**:

- ISO 9001:2015 - `Normative/UNI EN ISO 9001_2015 Rev. 0.txt`
- Linea Guida CONFORMA - `Quaderni/Linea Guida Conforma 9001_2015.txt`

**Codice Impattato**:

- Frontend: `app/src/utils/checklistInitializer.js` (da eliminare)
- Frontend: `app/src/contexts/StorageContext.jsx` (update createAudit logic)
- Backend: `database/seed_checklist_iso9001_v3.sql` (da sostituire)
- Backend: `backend/src/routes/standard.routes.js` (nuovo endpoint)
- Backend: `backend/src/controllers/standard.controller.js` (nuovo controller)

**Migration Files**:

- `database/migrations/005_checklist_conforma_alignment.sql` (da creare)
- `database/seeds/seed_checklist_iso9001_conforma_official.sql` (da creare)

**ADR Correlati**:

- [ADR-001: Multi-Agent Workflow](ADR-001-multi-agent-workflow.md)

---

## Risk Assessment

| Rischio                                  | Probabilità | Impatto | Mitigazione                                                    |
| ---------------------------------------- | ----------- | ------- | -------------------------------------------------------------- |
| Perdita dati audit esistente             | Media       | Alto    | Backup completo + migration script testato in staging          |
| Checklist Conforma incompleta            | Bassa       | Alto    | Parsing validato da 2 fonti (Conforma + UNI normativa)         |
| Frontend non carica checklist da backend | Bassa       | Medio   | Test E2E obbligatorio pre-deploy                               |
| Utente confuso da 58 domande vs 26       | Media       | Basso   | UI grouping per clausola principale (collapse/expand)          |
| Certificatore non accetta checklist      | Molto Bassa | Critico | Checklist basata su guida CONFORMA (massima autorità italiana) |

---

## Decisione FINALE

**Opzione Scelta**: ✅ **Opzione D - Checklist Cliente (ChekList9001.txt)** - 35 domande  
**Motivazione**: Requisiti specifici del cliente prevalenti su standard teorico Conforma (58 domande). La checklist a 35 domande bilancia conformità ISO 9001:2015 con praticità operativa per audit su tablet Android. File `Quaderni/ChekList9001.txt` fornito direttamente dal cliente come riferimento ufficiale per le certificazioni.

**Data Decisione**: 17 Gennaio 2026  
**Approvato da**: User + Tech Lead

**Implementazione**:

- ✅ Migration 010 eseguita: `database/migrations/010_update_iso9001_35questions.sql`
- ✅ Frontend refactoring: `app/src/services/checklistService.js` + `StorageContext.jsx`
- ✅ Backend API: `GET /api/v1/standards/:id/questions` (dynamic loading)
- ✅ Test E2E: Audit creato con 35 domande caricati dinamicamente (100% completion)
- ✅ Database: 7 sezioni (clause4-clause10), 35 domande (standard_id=1)

**Struttura Checklist 35 Domande**:

| Clausola | Domande | Tipo Risposta |
| -------- | ------- | ------------- |
| 4        | 5       | conformity    |
| 5        | 5       | conformity    |
| 6        | 3       | conformity    |
| 7        | 7       | conformity    |
| 8        | 9       | conformity    |
| 9        | 4       | conformity    |
| 10       | 2       | conformity    |
| **TOT**  | **35**  | C/NC/OM/NA/NV |

**Vantaggi Opzione Cliente**:

1. **Praticità**: 35 domande vs 58 Conforma = -40% tempo compilazione
2. **Allineamento Certificatore**: Checklist validata da ente certificazione cliente
3. **Tablet-Friendly**: Carico cognitivo ridotto per auditor su dispositivo mobile
4. **Conformità ISO**: Copre tutte le clausole 4-10 con granularità adeguata

**Tracciabilità**:

- File Fonte: `Quaderni/ChekList9001.txt` (client-provided)
- Migration File: `database/migrations/010_update_iso9001_35questions.sql`
- Git Commit: `96e5ae7` (17 Gen 2026)
- Database Schema: Documentato in `docs/DATABASE_SCHEMA.md`

---

## Changelog

| Data       | Modifica                                    | Autore           |
| ---------- | ------------------------------------------- | ---------------- |
| 2026-01-04 | Creazione ADR-002 post-debug sync checklist | System Architect |
| 2026-01-17 | Decisione finale: 35 domande da cliente     | System Architect |

---

**Firma Digitale Session Log**:

- Session ID: 2026-01-04_20:00-22:30
- Commit correlato: (pending migration 005)
- Files created: `docs/adr/ADR-002-checklist-alignment-strategy.md`
