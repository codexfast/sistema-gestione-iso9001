# ADR-003: Bidirectional Sync Architecture

**Status:** ✅ Accepted  
**Date:** 2026-02-08  
**Authors:** AI Agent  
**Supersedes:** ADR-002 (partial - extends offline-first)

---

## Context

L'architettura offline-first implementata in ADR-002 prevedeva sync **unidirezionale**:
- ✅ Upload: IndexedDB → Server (POST /audits/sync)
- ❌ Download: Server → IndexedDB (MANCANTE)

**Problema riscontrato (08/02/2026):**
1. Frontend carica audit da IndexedDB con UUID stringhe (`audit-002-acme-2025`)
2. Sync upload crea audit su server con nuovi IDs numerici (`audit_id = 3901`)
3. Dropdown mostra audit **locali obsoleti** (cache non aggiornata)
4. Server contiene audit **duplicati** (stessi dati, IDs diversi)
5. DELETE manuale da database non riflessa in frontend (cache persistente)

**Root Cause:**
- Mancanza di **download** dal server
- Mismatch formato: Backend (snake_case, flat) ↔ Frontend (camelCase, nested)
- IndexedDB usato come "Single Source of Truth" invece di cache sincronizzata

---

## Decision

Implementiamo **sync bidirezionale** con strategia **server-wins**:

### 1. Download dal Server all'Avvio
```javascript
// StorageContext.jsx - loadAuditsFromIndexedDB()
const localAudits = await fsProvider.loadAllAudits();  // Cache

if (navigator.onLine) {
  const response = await apiService.getAudits();  // Server
  const backendAudits = response.data;
  
  // Converti formato backend → frontend
  const serverAudits = convertAuditsFromBackend(backendAudits);
  
  // Aggiorna cache IndexedDB con dati server
  for (const audit of serverAudits) {
    await fsProvider.saveAudit(audit);
  }
  
  setAudits(serverAudits);  // Server-wins
}
```

### 2. Converter Backend ↔ Frontend
**File nuovo:** `app/src/utils/auditConverter.js`

**Mapping:**
| Backend (SQL Server)    | Frontend (React State) |
|------------------------|------------------------|
| `audit_id` (INTEGER)   | `metadata.auditId` (number) |
| `audit_uuid` (VARCHAR) | `id` (string) |
| `client_name`          | `metadata.clientName` |
| `audit_date`           | `metadata.auditDate` |
| Flat structure         | Nested: `metadata`, `checklist`, `metrics` |

**Funzioni:**
- `backendToFrontend(audit)` - Server → IndexedDB
- `frontendToBackend(audit)` - IndexedDB → Server
- `convertAuditsFromBackend(audits[])` - Bulk conversion

### 3. Merge Strategy: Server-Wins
```javascript
// Priority order:
1. serverAudits.length > 0 → usa server (fonte primaria)
2. localAudits.length > 0 → usa cache (fallback offline)
3. MOCK_AUDITS → solo prima inizializzazione
```

**Rationale:** Il server è l'unica fonte autorevole (multi-tenant, auth, integrity).

### 4. Upload Mantenuto (POST /audits/sync)
```javascript
// Rimane invariato da ADR-002
syncService.enqueue("create_audit", frontendToBackend(audit));
```

---

## Consequences

### ✅ Positive

1. **Sync completo:**
   - Download: Server → IndexedDB (all'avvio)
   - Upload: IndexedDB → Server (background queue)

2. **Data consistency:**
   - DELETE su server → riflessa in frontend (al prossimo reload)
   - UPSERT su server → aggiorna cache locale
   - Audit IDs sincronizzati (backend `audit_id` mantenuto in `metadata.auditId`)

3. **Offline-first preservato:**
   - Se offline → usa cache IndexedDB
   - Se online → download + merge → cache aggiornata
   - Queue upload attiva in background

4. **Format agnostic:**
   - Backend può cambiare schema (snake_case, nuove colonne)
   - Frontend stabile (converter astrae differenze)

### ⚠️ Negative

1. **Latency maggiore all'avvio:**
   - Prima: ~100ms (load IndexedDB)
   - Ora: ~300ms (load IndexedDB + GET /audits + convert + save)
   - **Mitigazione:** Show skeleton UI durante download

2. **Bandwidth:**
   - Download completo audit list ad ogni reload
   - **Mitigazione futura:** Incremental sync (GET /audits?since=timestamp)

3. **Merge conflicts:**
   - Server-wins può sovrascrivere modifiche locali non ancora sincronizzate
   - **Mitigazione:** Upload queue processata PRIMA del download (TODO)

4. **Complexity:**
   - Converter aggiunge layer (potenziali bug mapping)
   - **Mitigazione:** Test coverage converter (TODO)

---

## Implementation Details

### File Modificati

**1. `app/src/contexts/StorageContext.jsx`** (linee 268-310)
```diff
- const allAudits = await fsProvider.loadAllAudits();
- setAudits(allAudits);
+ const localAudits = await fsProvider.loadAllAudits();
+ 
+ let serverAudits = [];
+ if (navigator.onLine) {
+   const apiService = (await import('../services/apiService')).default;
+   const converter = await import('../utils/auditConverter');
+   const response = await apiService.getAudits();
+   serverAudits = converter.convertAuditsFromBackend(response.data);
+   
+   for (const audit of serverAudits) {
+     await fsProvider.saveAudit(audit);
+   }
+ }
+ 
+ const mergedAudits = serverAudits.length > 0 ? serverAudits : localAudits;
+ setAudits(mergedAudits);
```

**2. `app/src/utils/auditConverter.js`** (nuovo file, 120 righe)
- Funzione `backendToFrontend()`: 60 righe
- Funzione `frontendToBackend()`: 50 righe
- Helper bulk conversion: 10 righe

### Testing

**Scenario 1: Clean State**
```javascript
// IndexedDB vuoto
// GET /audits → 4 audits
// Expected: 4 audit in dropdown
```
✅ PASS (8/02/2026)

**Scenario 2: Stale Cache**
```javascript
// IndexedDB: 3 audit (UUID vecchi)
// Server: 4 audit (IDs nuovi)
// Expected: 4 audit sincronizzati (server-wins)
```
✅ PASS (8/02/2026)

**Scenario 3: Offline**
```javascript
// navigator.onLine = false
// IndexedDB: 3 audit
// Expected: 3 audit da cache (no download)
```
⏳ TODO

**Scenario 4: Server Error**
```javascript
// GET /audits → 500 Error
// IndexedDB: 3 audit
// Expected: 3 audit da cache (fallback)
```
⏳ TODO

---

## Migration Plan

### Phase 1: Backend Cleanup (IN PROGRESS)
```sql
-- Elimina audit duplicati creati da sync unidirezionale
DELETE FROM audits WHERE audit_id IN (3901, 3902);
```

### Phase 2: Frontend Cache Invalidation
```javascript
// Forza re-download da server (browser console)
indexedDB.deleteDatabase('SGQ_ISO9001');
localStorage.clear();
location.reload();
```

### Phase 3: Monitoring (TODO)
```javascript
// Aggiungi metriche sync
console.log('[SYNC METRICS]', {
  downloadTime: performance.now() - startTime,
  serverAudits: serverAudits.length,
  cacheAudits: localAudits.length,
  mergeStrategy: serverAudits.length > 0 ? 'server-wins' : 'cache-fallback'
});
```

---

## Future Enhancements

### 1. Incremental Sync (Low Priority)
```javascript
// GET /audits?since=2026-02-08T17:00:00Z
// Response: solo audit modificati dopo timestamp
// Merge selettivo invece di replace completo
```

### 2. Conflict Resolution UI (Medium Priority)
```javascript
// Se modifiche locali non sincronizzate + download server
// Mostra modal: "Server ha versione diversa, sovrascrivere?"
// Options: [Server Wins] [Local Wins] [Merge Manually]
```

### 3. Push Notifications (Low Priority)
```javascript
// WebSocket: server notifica modifiche real-time
// Trigger download senza reload
```

### 4. Tombstone Pattern (High Priority)
```sql
-- Soft delete invece di DELETE
ALTER TABLE audits ADD deleted_at DATETIME2 NULL;

-- Download include deleted (per rimuovere da cache)
GET /audits → include audit con deleted_at NOT NULL
Frontend filtra + rimuove da IndexedDB
```

---

## Alternatives Considered

### Alternative A: Client-Wins Strategy
**Rationale:** Modifiche locali hanno priorità su server

**Rejected:** Multi-tenant richiede server come fonte autorevole (authorization, audit trail)

### Alternative B: CRDTs (Conflict-free Replicated Data Types)
**Rationale:** Merge automatico senza conflitti

**Rejected:** Overkill per audit (non collaborative editing real-time)

### Alternative C: Sync solo su User Action
**Rationale:** Download solo quando utente clicca "Sync" button

**Rejected:** UX peggiorata, utente dimentica sync manuale

---

## Related Documents

- **ADR-001:** Multi-Agent Workflow
- **ADR-002:** Offline-First Architecture (integrato)
- **DATABASE_SCHEMA.md:** v1.11 (audit table structure)
- **CLEANUP_ROADMAP.md:** Piano pulizia post-implementazione

---

## Changelog

**v1.0.0 - 2026-02-08:**
- Initial ADR
- Implementazione sync bidirezionale
- Converter backend↔frontend
- Testing scenario 1-2

**v1.1.0 - TBD:**
- Incremental sync
- Conflict resolution UI
- Tombstone pattern

---

**Sign-off:**
- ✅ Implementato: 8 febbraio 2026
- ✅ Testato: Scenario 1-2 PASS
- ⏳ Deploy production: TBD
- ⏳ Monitoring: TBD
