# ADR-002: Offline-First Sync Strategy con Auto-Polling

---

**Stato**: Accettato  
**Data**: 2025-12-21  
**Autore**: System Architect  
**Revisore**: GitHub Copilot  
**Tag**: architettura, sync, offline-first, data-integrity  
**Relates to**: ADR-001 (Multi-Agent Workflow)

---

## Contesto e Problema

Il sistema **Sistema Gestione ISO 9001** attualmente:

- ✅ Salva risposte audit su **IndexedDB locale** (funzionante)
- ❌ **NON sincronizza mai con SQL Server** (tabella `audits` vuota)
- ❌ Nessuna gestione offline→online transition
- ❌ Nessun auto-sync dopo modifiche

**Problema critico identificato** (21 dicembre 2025):

```javascript
// app/src/contexts/StorageContext.jsx:266-273
if (navigator.onLine) {
  syncService.enqueue("update_audit", {...}).catch(...);
}
// ❌ Queue mai processata → sync mai eseguita
```

**Impatto:**

- Audit creati solo in IndexedDB → **perdita dati su clear browser cache**
- Impossibile multi-device (dati non condivisi)
- Non conforme ISO 9001:2015 punto 7.5.3 (controllo informazioni documentate)

**Riferimenti normativi:**

- **ISO 9001:2015 punto 7.5**: Informazioni documentate - disponibilità e protezione
- **ISO 9001:2015 punto 10.2**: Non conformità e azioni correttive (tracciabilità modifiche)

---

## Decisione

**Implementare architettura offline-first con sync automatico bidirezionale:**

### 1. Auto-Sync Polling (30s interval)

**File**: `app/src/services/syncService.js`

```javascript
class SyncService {
  constructor() {
    this.syncInterval = null;
    this.SYNC_INTERVAL_MS = 30000; // 30s
    this.retryCount = 0;
    this.MAX_RETRIES = 5;
  }

  startAutoSync() {
    if (this.syncInterval) return; // Già attivo

    this.syncInterval = setInterval(async () => {
      if (!navigator.onLine) return;

      try {
        await this.processQueue();
        this.retryCount = 0; // Reset su successo
      } catch (error) {
        this.retryCount++;
        const backoffMs = Math.min(1000 * Math.pow(2, this.retryCount), 60000);
        console.warn(
          `⚠️ [SYNC] Retry ${this.retryCount}/${this.MAX_RETRIES} in ${backoffMs}ms`
        );

        if (this.retryCount >= this.MAX_RETRIES) {
          this.stopAutoSync(); // Stop dopo 5 fallimenti consecutivi
          // UI notification: "Sincronizzazione offline. Riproverà al prossimo salvataggio."
        }
      }
    }, this.SYNC_INTERVAL_MS);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
```

**Trigger:** Avvio automatico in `StorageContext` dopo mount.

### 2. Sync Iniziale all'Avvio

**File**: `app/src/contexts/StorageContext.jsx`

```javascript
useEffect(() => {
  async function initSync() {
    if (!navigator.onLine) {
      console.log("📴 [SYNC] Offline - carico solo IndexedDB locale");
      return;
    }

    try {
      // Fetch audit da SQL Server
      const serverAudits = await apiService.getAudits();

      // Merge con IndexedDB locale (server-wins su conflitti)
      const mergedAudits = await mergeAudits(serverAudits, localAudits);
      setAudits(mergedAudits);

      // Avvia auto-sync polling
      syncService.startAutoSync();

      console.log("✅ [SYNC] Sincronizzazione iniziale completata");
    } catch (error) {
      console.warn("⚠️ [SYNC] Fallback a IndexedDB locale:", error.message);
      // Continua con dati locali
    }
  }

  initSync();
}, []); // Solo al mount
```

**Conflict Resolution**: **Server-wins** su campi critici (`status`, `answered_questions`, `conformities_count`), merge su `notes`.

### 3. Upsert Logic Backend

**File**: `backend/src/controllers/audit.controller.js`

```javascript
async function upsertAudit(req, res) {
  const { audit_uuid, ...auditData } = req.body;
  const { organization_id } = req.user;

  // Check esistenza per audit_uuid
  const existing = await query(`
    SELECT audit_id, updated_at FROM audits
    WHERE audit_uuid = @audit_uuid AND organization_id = @organization_id
  `, { audit_uuid, organization_id });

  if (existing.recordset.length > 0) {
    // UPDATE esistente
    const audit_id = existing.recordset[0].audit_id;

    // Conflict detection (updated_at server > client)
    if (existing.recordset[0].updated_at > new Date(auditData.updated_at)) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Versione server più recente',
        serverData: existing.recordset[0]
      });
    }

    await query(`UPDATE audits SET ... WHERE audit_id = @audit_id`, {...});
    return res.json({ audit_id, action: 'updated' });
  } else {
    // INSERT nuovo
    const result = await query(`INSERT INTO audits (...) VALUES (...)`, {...});
    return res.status(201).json({ audit_id: result.recordset[0].audit_id, action: 'created' });
  }
}
```

**Route**: `POST /api/v1/audits/sync` (distinta da `POST /api/v1/audits` per backward compatibility).

### 4. Health Check Connectivity

**File**: `app/src/services/syncService.js`

```javascript
async isServerReachable() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'HEAD',
      timeout: 3000
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

**Uso:** Verificare connectivity prima di `processQueue()` per evitare timeout lunghi.

### 5. UI Feedback Sync Status

**Componente**: `AutoSaveIndicator` esteso con stato sync:

```jsx
// Stati possibili:
// - 🟢 "Salvato e sincronizzato" (IndexedDB + SQL Server OK)
// - 🟡 "Salvato localmente" (solo IndexedDB, sync in coda)
// - 🔴 "Errore sincronizzazione" (retry falliti, serve intervento)
```

---

## Conseguenze

### Impatti Positivi ✅

1. **Data Persistence**: Audit salvati su SQL Server → **resistente a clear cache**
2. **Multi-Device**: Stesso utente può continuare audit da dispositivi diversi
3. **Conformità ISO 9001**: Tracciabilità completa modifiche (punto 7.5.3)
4. **User Experience**: Sync trasparente, UI indica stato connessione
5. **Resilienza**: Offline-first garantisce funzionamento senza rete

### Impatti Negativi ⚠️

1. **Complessità**: Conflict resolution server-wins può sovrascrivere modifiche locali non sincronizzate
2. **Latenza**: Sync ogni 30s può ritardare visibilità modifiche cross-device
3. **Bandwidth**: Polling 30s incrementa traffico di rete (mitigato con HEAD health check)

### Conformità ISO 9001:2015

- **Punto 7.5.2**: Creazione e aggiornamento → timestamp `created_at`/`updated_at` tracciati
- **Punto 7.5.3**: Controllo informazioni → backup automatico su SQL Server
- **Punto 10.2.1**: Non conformità → log errori sync per analisi retroattiva

---

## Rischi e Mitigazioni

| Rischio                                   | Probabilità | Impatto | Mitigazione                                       | Responsabile |
| ----------------------------------------- | ----------- | ------- | ------------------------------------------------- | ------------ |
| Conflict resolution sovrascrive modifiche | Media       | Alto    | Log conflicts, UI notifica utente sovrascrittura  | Frontend Dev |
| Sync loop infinito per errori backend     | Bassa       | Medio   | MAX_RETRIES + exponential backoff                 | Backend Dev  |
| SQL Server down blocca UI                 | Bassa       | Basso   | Fallback IndexedDB, auto-sync riprende online     | DevOps       |
| IndexedDB quota exceeded (storage pieno)  | Media       | Alto    | Cleanup vecchi audit archiviati (retention 2y)    | Backend Dev  |
| Utente chiude browser durante sync        | Alta        | Basso   | Queue persistita in IndexedDB, riprende al reload | Frontend Dev |

**Risk-Based Thinking (ISO 9001:2015 punto 6.1)**:

- **Azione preventiva**: Health check pre-sync riduce timeout lunghi
- **Monitoring**: Contatore `sync_failed_count` in localStorage per audit problematici
- **Riesame**: Monthly review logs errori sync per identificare pattern

---

## Implementazione

### Checklist Attuazione

- [x] ADR-002 documentato e approvato
- [ ] Implementare `startAutoSync()` in `syncService.js`
- [ ] Aggiungere sync iniziale in `StorageContext.jsx`
- [ ] Creare route `POST /api/v1/audits/sync` con upsert logic
- [ ] Estendere `AutoSaveIndicator` con stato sync
- [ ] Test E2E offline→online transition
- [ ] Test conflict resolution (modifiche concorrenti)
- [ ] Documentare troubleshooting guide per utenti

### File Impattati

```
app/src/
├── services/
│   └── syncService.js              ← startAutoSync(), processQueue(), exponential backoff
├── contexts/
│   └── StorageContext.jsx          ← useEffect sync iniziale, merge audits
└── components/
    └── SharedComponents.jsx        ← AutoSaveIndicator esteso (sync status)

backend/src/
├── controllers/
│   └── audit.controller.js         ← upsertAudit() con conflict detection
└── routes/
    └── audit.routes.js             ← POST /api/v1/audits/sync

database/
└── verify_sync_status.sql          ← Query diagnostica sync_queue + last_synced
```

### Acceptance Criteria

1. **Funzionale**:

   - ✅ Auto-sync processa queue ogni 30s quando online
   - ✅ Sync iniziale all'avvio fetch da SQL Server e merge con IndexedDB
   - ✅ Upsert backend inserisce nuovi audit o aggiorna esistenti senza errori

2. **Offline-First**:

   - ✅ App funziona completamente offline (salvataggio solo IndexedDB)
   - ✅ Riconnessione rete → auto-sync riprende automaticamente
   - ✅ UI mostra stato sync (verde/giallo/rosso)

3. **Data Integrity**:

   - ✅ Nessuna perdita dati dopo clear cache (dati su SQL Server)
   - ✅ Conflict resolution server-wins notifica utente se modifiche locali sovrascritte
   - ✅ Timestamp `updated_at` sempre coerente (server authoritative)

4. **Performance**:
   - ✅ Health check < 3s timeout
   - ✅ Sync queue processing < 10s per 100 items
   - ✅ No UI blocking durante sync (async background)

---

## Metriche di Successo

**KPI (monitorati in logs):**

- **Sync Success Rate**: ≥95% queue items sincronizzati entro 5 minuti
- **Conflict Rate**: ≤5% modifiche generano conflitti server-wins
- **Offline Resilience**: 100% funzionalità disponibili senza connessione
- **Data Loss**: 0 audit persi dopo clear cache (tutti su SQL Server)

**Tracciamento:**

```javascript
// localStorage metrics
{
  "sync_metrics": {
    "total_syncs": 1234,
    "successful_syncs": 1198,
    "failed_syncs": 36,
    "last_sync_at": "2025-12-21T10:30:00Z",
    "conflicts_resolved": 12
  }
}
```

---

## Alternative Considerate

### ❌ Opzione 1: Sync solo manuale (pulsante "Sincronizza")

**Pro**: Controllo utente esplicito, no polling overhead  
**Contro**: Utente dimentica sync → perdita dati, poor UX

**Motivo rigetto**: Non conforme offline-first, richiede azione utente consapevole.

### ❌ Opzione 2: WebSocket real-time sync

**Pro**: Latenza minima (<1s), bidirectional push  
**Contro**: Complessità server (Socket.IO), gestione reconnect, overhead batteria mobile

**Motivo rigetto**: Over-engineering per audit process (non serve real-time sub-secondo).

### ✅ Opzione 3: Polling 30s + exponential backoff (SCELTA)

**Pro**: Semplice, resiliente, retry automatico  
**Contro**: Latency fino a 30s, bandwidth incrementale

**Motivo scelta**: Bilanciamento complessità/robustezza, pattern industry-standard (Dropbox, Notion).

---

## Note Aggiuntive

**Best Practices Offline-First (riferimenti):**

- [Offline First Design Principles](https://offlinefirst.org/)
- [Google Workbox Strategies](https://developer.chrome.com/docs/workbox/modules/workbox-strategies/)
- [PouchDB Sync Protocol](https://pouchdb.com/guides/replication.html)

**Differenze con ADR-001:**

- ADR-001: Workflow sviluppo (Planner→Implementer→Reviewer)
- ADR-002: Architettura runtime sync (offline-first pattern)

**Dependency:** Richiede backend già funzionante (ADR-001 test E2E superati).

---

## Changelog

| Data       | Modifica          | Autore           |
| ---------- | ----------------- | ---------------- |
| 2025-12-21 | Creazione ADR-002 | System Architect |

---

**Approvazione**:

- ✅ Planner Agent: 2025-12-21
- ⏳ Reviewer Agent: Pending implementazione
- ⏳ Tech Lead: Pending test E2E

---

**Status:** Implementazione in corso (Todo #2-6 in progress)
