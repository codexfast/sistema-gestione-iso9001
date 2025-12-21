# Analisi Flusso Sincronizzazione Audits

**Data**: 21 dicembre 2025  
**Problema**: Modifiche checklist NON sincronizzate in SQL Server (tabella `audits` ha 1 sola riga)

---

## Flusso Teorico (Design ADR-002)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION (ChecklistModule.jsx)                          │
│    Utente modifica risposta checklist → handleQuestionUpdate()     │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. STATE UPDATE (StorageContext.jsx)                               │
│    updateCurrentAudit() → modifica state locale + enqueue sync     │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. INDEXEDDB WRITE (syncService.js)                                │
│    enqueue('update_audit', payload) → scrive in sync_queue store   │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. AUTO-SYNC POLLING (syncService.js)                              │
│    startAutoSync() → setInterval 30s → processQueue()              │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. HTTP REQUEST (apiService.js)                                    │
│    POST /api/v1/audits/sync con audit data                         │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. BACKEND ROUTE (audit.routes.js)                                 │
│    router.post('/audits/sync', auditController.upsertAudit)        │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. DATABASE UPSERT (audit.controller.js)                           │
│    SELECT audit_uuid → UPDATE (if exists) OR INSERT (if new)       │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. SQL SERVER WRITE (dbo.audits table)                             │
│    Riga inserita/aggiornata con completion_percentage, status, etc │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Test Verifiche Step-by-Step

### ✅ Step 1: Salvataggio in IndexedDB

**Test**: Modificare risposta checklist → DevTools → Application → IndexedDB → `sgq_iso_audits` → store `audits`
**Verifica**:

- Audit aggiornato con nuovo `completion_percentage`?
- Campo `updated_at` (o `metadata.lastModified`) aggiornato?
- Risposte salvate in oggetto `responses`?

**Codice Responsabile**: [StorageContext.jsx](../app/src/contexts/StorageContext.jsx#L277)

```jsx
const updateCurrentAudit = useCallback(
  (updater) => {
    setAudits((prevAudits) => {
      return prevAudits.map((audit) => {
        if (auditId === currentAuditId) {
          const updated =
            typeof updater === "function" ? updater(audit) : updater;
          // ...
          if (navigator.onLine) {
            syncService.enqueue("update_audit", {
              id: updated.metadata?.id,
              ...updated,
            });
          }
          return updated;
        }
        return audit;
      });
    });
  },
  [currentAuditId]
);
```

---

### ✅ Step 2: Enqueue in sync_queue

**Test**: Dopo modifica → DevTools → IndexedDB → `sgq_iso_audits` → store `sync_queue`
**Verifica**:

- Nuovo item con `type: 'update_audit'`?
- `payload` contiene `audit_uuid`, `completion_percentage`, `answered_questions`, etc?
- `timestamp` recente?
- `retryCount: 0`?

**Codice Responsabile**: [syncService.js](../app/src/services/syncService.js#L78-L106)

```javascript
async enqueue(type, payload) {
  const db = await getDatabase();
  const queueItem = {
    id: uuidv4(),
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    lastError: null
  };

  const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);
  await new Promise((resolve, reject) => {
    const request = store.add(queueItem);
    request.onsuccess = () => {
      console.log(`📤 [SYNC QUEUE] Aggiunto: ${type}`, queueItem.id);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });

  // Tenta sync immediata se online
  if (this.isOnline) {
    this.processQueue(); // ⚠️ CRITICO: Viene chiamato?
  }
}
```

**⚠️ SOSPETTO**: `this.isOnline` potrebbe essere `false` anche se browser online → sync non parte

---

### ✅ Step 3: processQueue() chiamato

**Test**: Console log dovrebbe mostrare `🔄 [SYNC] Processando queue...` ogni 30s
**Verifica**:

- Log appare ogni 30 secondi?
- Log `📤 [SYNC QUEUE] Aggiunto: update_audit` seguito da `🔄 [SYNC] Processando queue...`?
- Se NO → auto-sync non parte

**Codice Responsabile**: [syncService.js](../app/src/services/syncService.js#L423-L435)

```javascript
startAutoSync() {
  if (this.syncInterval) return; // Già attivo

  console.log('🔄 [AUTO-SYNC] Avviato (intervallo: 30s)');
  this.syncInterval = setInterval(async () => {
    if (!navigator.onLine) {
      console.log('⚠️ [AUTO-SYNC] Offline, skip');
      return;
    }

    await this.processQueue(); // ⚠️ Controlla se processQueue esegue davvero
  }, this.SYNC_INTERVAL_MS); // 30000ms
}
```

**Chiamata in**: [StorageContext.jsx](../app/src/contexts/StorageContext.jsx#L163)

```jsx
useEffect(() => {
  const initSyncAndPolling = async () => {
    // ...
    syncService.startAutoSync(); // ✅ Dovrebbe partire al mount
  };
  initSyncAndPolling();
  return () => {
    syncService.stopAutoSync(); // Cleanup
  };
}, []);
```

---

### ✅ Step 4: HTTP POST /audits/sync

**Test**: DevTools → Network tab → Filtro `sync` → Cercare `POST http://localhost:10443/api/v1/audits/sync`
**Verifica**:

- Request presente?
- Status Code: 200 OK o 201 Created?
- Payload contiene `audit_uuid`, `client_name`, `completion_percentage`?
- Response contiene `action: 'updated'` o `action: 'created'`?

**Codice Responsabile**: [syncService.js](../app/src/services/syncService.js#L231-L246)

```javascript
async syncUpsertAudit(auditData) {
  try {
    const result = await apiService.upsertAudit(auditData); // ⚠️ Payload corretto?

    if (result.data.action === 'created') {
      await this.updateSyncMetadataLocal('audit', auditData.id || auditData.metadata?.id, result.data.audit_id);
    }

    return result;
  } catch (error) {
    if (error.response?.status === 409 && error.response?.data?.code === 'AUDIT_CONFLICT') {
      console.warn('⚠️ [SYNC] Conflict rilevato:', auditData.audit_uuid || auditData.id);
      return await this.resolveConflict(auditData);
    }
    throw error;
  }
}
```

**API Call**: [apiService.js](../app/src/services/apiService.js#L319-L324)

```javascript
async upsertAudit(auditData) {
  return this.post('/audits/sync', auditData); // ✅ Route corretta
}
```

---

### ✅ Step 5: Backend Route Match

**Test**: Backend console log dovrebbe mostrare `POST /api/v1/audits/sync`
**Verifica**:

- Log appare quando frontend invia request?
- Backend risponde 200/201 o 404/500?
- Se 404 → route non registrata o in posizione sbagliata

**Codice Responsabile**: [audit.routes.js](../backend/src/routes/audit.routes.js#L23-L26)

```javascript
// POST /api/v1/audits/sync - Upsert audit (INSERT or UPDATE)
// Usato da sync service offline-first (DEVE STARE PRIMA DI /audits/:id)
router.post("/audits/sync", auditController.upsertAudit); // ✅ Posizione corretta
```

**⚠️ IMPORTANTE**: Route DEVE stare PRIMA di `router.put('/audits/:id', ...)` altrimenti Express interpreta `/audits/sync` come `/audits/:id` con `id='sync'`

---

### ✅ Step 6: Backend Upsert Execution

**Test**: Backend log dovrebbe mostrare query SQL
**Verifica**:

- Log `SELECT audit_uuid FROM audits WHERE audit_uuid = ...`?
- Log `UPDATE audits SET ...` o `INSERT INTO audits ...`?
- Errori SQL (chiavi mancanti, constraint violation)?

**Codice Responsabile**: [audit.controller.js](../backend/src/controllers/audit.controller.js#L590-L789)

```javascript
async function upsertAudit(req, res) {
  try {
    const { audit_uuid, organization_id, audit_number, client_name, ... } = req.body;

    // Validazioni
    if (!audit_uuid || !audit_number || !client_name) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti', ... });
    }

    // Check esistenza
    const existing = await query(
      `SELECT audit_id, updated_at FROM audits
       WHERE audit_uuid = @audit_uuid AND organization_id = @organization_id`,
      { audit_uuid: { type: sql.UniqueIdentifier, value: audit_uuid }, ... }
    );

    if (existing.recordset.length > 0) {
      // UPDATE path
      const audit_id = existing.recordset[0].audit_id;
      await query(`UPDATE audits SET ... WHERE audit_id = @audit_id`, {...});
      return res.json({ audit_id, audit_uuid, action: 'updated', ... });
    } else {
      // INSERT path
      const result = await query(
        `INSERT INTO audits (...) OUTPUT INSERTED.audit_id, INSERTED.audit_uuid VALUES (...)`,
        {...}
      );
      return res.status(201).json({ audit_id: result.recordset[0].audit_id, ... });
    }
  } catch (error) {
    logger.error('Errore upsertAudit:', error);
    return res.status(500).json({ error: 'Errore server', code: 'SERVER_ERROR', ... });
  }
}
```

**⚠️ POTENZIALI PROBLEMI**:

1. **organization_id mancante** nel payload frontend → WHERE clause fallisce
2. **audit_uuid non UUID valido** → SQL type mismatch
3. **Campi obbligatori mancanti** (audit_number, client_name) → 400 Bad Request
4. **standard_id=1 non esiste** in `standards` table → foreign key constraint violation

---

### ✅ Step 7: SQL Server Write

**Test**: Eseguire query in SSMS durante test

```sql
-- Monitor in real-time (eseguire ogni 5s)
SELECT TOP 10
  audit_id,
  audit_uuid,
  client_name,
  completion_percentage,
  answered_questions,
  updated_at
FROM dbo.audits
ORDER BY updated_at DESC;
```

**Verifica**:

- Nuove righe appaiono dopo sync?
- `completion_percentage` cambia dopo modifica checklist?
- `updated_at` si aggiorna?
- Se NO → backend riceve request ma non scrive in DB

---

## Checklist Diagnostica Prioritaria

### 🔴 PRIORITY 1: Verificare sync_queue accumulo

**Azione**:

```javascript
// Console browser (dopo modifica checklist):
const db = await indexedDB.open("sgq_iso_audits", 1);
const tx = db.transaction(["sync_queue"], "readonly");
const store = tx.objectStore("sync_queue");
const request = store.getAll();
request.onsuccess = () => console.table(request.result);
```

**Atteso**:

- Array con item `type: 'update_audit'`
- `payload.audit_uuid` presente
- `payload.completion_percentage` aggiornato

**Se queue vuoto** → problema Step 1-2 (enqueue non funziona)  
**Se queue pieno** → problema Step 3-4 (processQueue non consuma)

---

### 🔴 PRIORITY 2: Verificare auto-sync attivo

**Azione**: Console browser deve mostrare log ogni 30s:

```
🔄 [AUTO-SYNC] Avviato (intervallo: 30s)
🔄 [SYNC] Processando queue...
```

**Se NO log**:

- `startAutoSync()` mai chiamato → verificare StorageContext mount
- `setInterval` non esegue → verificare `this.syncInterval` già impostato

---

### 🔴 PRIORITY 3: Verificare payload HTTP

**Azione**: DevTools Network → POST /audits/sync → Payload tab
**Required Fields**:

```json
{
  "audit_uuid": "89f3b8f9-218c-414e-8eea-0c953c2f6bfd",
  "audit_number": "2025-01",
  "client_name": "Raccorderia Piacentina",
  "organization_id": 1,
  "completion_percentage": 25.6,
  "answered_questions": 20,
  "total_questions": 78,
  "conformities_count": 18,
  "non_conformities_count": 2,
  "status": "in_progress",
  "updated_at": "2025-12-21T14:30:00.000Z"
}
```

**Missing Fields** → backend 400 Bad Request  
**Wrong Types** → backend 500 SQL error

---

## Strategia Test Incrementale

### Test 1: IndexedDB Write (5 min)

```javascript
// Console browser:
const testWrite = async () => {
  const db = await indexedDB.open("sgq_iso_audits", 1);
  const tx = db.transaction(["audits"], "readonly");
  const store = tx.objectStore("audits");
  const audits = await new Promise((r) => {
    const req = store.getAll();
    req.onsuccess = () => r(req.result);
  });
  console.table(
    audits.map((a) => ({
      id: a.metadata?.id,
      client: a.client_name,
      completion: a.completion_percentage,
      updated: new Date(
        a.metadata?.lastModified || a.updated_at
      ).toLocaleString(),
    }))
  );
};
testWrite();
```

**Success**: Audit presente con `completion_percentage` aggiornato  
**Failure**: Audit mancante o non aggiornato → **FIX Step 1**

---

### Test 2: Sync Queue (5 min)

```javascript
// Console browser (dopo modifica checklist):
const testQueue = async () => {
  const db = await indexedDB.open("sgq_iso_audits", 1);
  const tx = db.transaction(["sync_queue"], "readonly");
  const store = tx.objectStore("sync_queue");
  const queue = await new Promise((r) => {
    const req = store.getAll();
    req.onsuccess = () => r(req.result);
  });
  console.log(`📊 Queue size: ${queue.length}`);
  console.table(
    queue.map((q) => ({
      type: q.type,
      audit_uuid: q.payload?.audit_uuid?.substring(0, 8),
      timestamp: new Date(q.timestamp).toLocaleTimeString(),
      retries: q.retryCount,
    }))
  );
};
testQueue();
```

**Success**: Item con `type: 'update_audit'` e timestamp recente  
**Failure**: Queue vuoto → **FIX Step 2 (enqueue)**

---

### Test 3: Auto-Sync Active (2 min)

```javascript
// Console browser:
// Attendere 35 secondi e verificare log:
// Atteso ogni 30s: "🔄 [SYNC] Processando queue..."
```

**Success**: Log compare ogni 30s  
**Failure**: No log → **FIX Step 3 (startAutoSync)**

---

### Test 4: HTTP Request (5 min)

**Azione**:

1. DevTools → Network → Clear
2. Attendere 30s (auto-sync)
3. Verificare POST `/audits/sync`

**Success**: Status 200/201, response `{ action: 'updated', audit_id: 123 }`  
**Failure**:

- **404 Not Found** → Route non registrata (FIX audit.routes.js)
- **400 Bad Request** → Payload mancante/errato (FIX payload construction)
- **500 Server Error** → SQL error (FIX audit.controller.js)

---

### Test 5: Backend SQL Write (5 min)

**SSMS Query** (eseguire DURANTE test 4):

```sql
-- Prima del test: contare righe
SELECT COUNT(*) AS before_count FROM dbo.audits;

-- Attendere sync (30s)

-- Dopo sync: verificare nuovo count
SELECT COUNT(*) AS after_count FROM dbo.audits;

-- Se count invariato → upsert fallito
-- Controllare backend logs per errori SQL
```

**Success**: `after_count > before_count` OR riga esistente aggiornata (`updated_at` cambiato)  
**Failure**: Count invariato → **FIX SQL query / constraints**

---

## File Critici da Verificare

### ✅ Frontend

- [x] `app/src/contexts/StorageContext.jsx` - updateCurrentAudit enqueue
- [x] `app/src/services/syncService.js` - enqueue, processQueue, syncUpsertAudit
- [x] `app/src/services/apiService.js` - upsertAudit method
- [ ] `app/src/components/ChecklistModule.jsx` - handleQuestionUpdate payload

### ✅ Backend

- [x] `backend/src/routes/audit.routes.js` - POST /audits/sync position
- [x] `backend/src/controllers/audit.controller.js` - upsertAudit logic
- [ ] `backend/src/middleware/auth.middleware.js` - authenticate non blocca

### ⚠️ Database

- [ ] `database/schema/audits_table.sql` - constraints corretti
- [ ] Foreign keys: `standard_id`, `organization_id` esistono?

---

## Output Atteso per Ogni Test

| Test         | Output Console                               | Output Network | Output DB         |
| ------------ | -------------------------------------------- | -------------- | ----------------- |
| 1. IndexedDB | ✅ Audit aggiornato                          | -              | -                 |
| 2. Queue     | ✅ `📤 [SYNC QUEUE] Aggiunto: update_audit`  | -              | -                 |
| 3. Auto-sync | ✅ `🔄 [SYNC] Processando queue...` ogni 30s | -              | -                 |
| 4. HTTP      | ✅ `🌐 [API] POST /audits/sync`              | ✅ 200 OK      | -                 |
| 5. SQL       | -                                            | -              | ✅ `COUNT(*) + 1` |

---

## Prossimi Step

1. **Eseguire Test 1-2** (IndexedDB + Queue) → identificare se problema è enqueue
2. **Eseguire Test 3** (Auto-sync) → verificare polling attivo
3. **Eseguire Test 4** (HTTP) → payload corretto + route match
4. **Eseguire Test 5** (SQL) → backend scrive in DB
5. **Applicare fix** basati su test falliti
6. **Commit finale** con summary fix applicati

**Nota ISO 9001:2015 Compliance**:

- Test tracciati per punto **8.5.1** (Controllo produzione)
- Log persistenti per punto **7.5** (Informazioni documentate)
- Root cause analysis per punto **10.2** (Non conformità e azioni correttive)
