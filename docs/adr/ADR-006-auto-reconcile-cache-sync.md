# ADR-006: Auto-reconcile cache locale e sync multi-device (self-healing)

**Data**: 2026-03-19  
**Stato**: PROPOSTA APPROVATA (implementazione da avviare)  
**Autori**: Team SGQ, sessione 19/03/2026  
**Dipendenze**: ADR-002 (offline-first), ADR-003 (sync bidirezionale), ADR-004 (auth mobile)

---

## Contesto

Nel flusso offline-first, l'app mantiene:
- cache audit in IndexedDB (`SGQ_ISO9001_Storage`)
- sync queue e metadata in IndexedDB (`SGQ_ISO9001_DB`)
- stato sessione in localStorage

Durante test reali su checklist personalizzate e uso multi-device sono emersi casi di disallineamento:
- audit visualizzato in UI con standard errato dopo reload
- differenza tra stato server e stato locale
- necessità manuale di pulizia cache browser per ripristinare coerenza

Problema chiave: il sistema oggi non ha ancora una **procedura automatica unica e robusta** di autoriparazione locale quando rileva drift tra server e cache.

---

## Decisione

Implementare una strategia **self-healing automatica** all'avvio sessione e al login, senza chiedere intervento all'utente nella maggior parte dei casi.

### Regole

1. **Server come fonte di verità**
   - quando online e autenticato, il server governa lo snapshot finale.

2. **Riconciliazione automatica a startup**
   - processa sync queue
   - scarica snapshot server
   - esegue merge deterministico con eventuali modifiche locali non sincronizzate
   - sostituisce cache locale con stato riconciliato

3. **Invalidazione locale selettiva**
   - se rilevato mismatch strutturale (fingerprint differente), pulizia automatica store locali pertinenti:
     - audit cache
     - queue stantia per audit non più validi
   - mantenere solo bozza locale recente e tracciabile quando non ancora inviata al server.

4. **Niente prompt utente per casi normali**
   - no richiesta "svuota cache?" all'utente.
   - notifiche informative solo se necessario.

5. **Fallback guidato per casi estremi**
   - se queue corrotta/non recuperabile: quarantena item + refresh snapshot server.

---

## Casi limite da coprire

- perdita rete durante sync (retry + backoff + idempotenza)
- token scaduto durante flush queue (refresh e retry)
- stesso audit editato offline su due device (conflict deterministico)
- audit eliminato su server mentre esistono modifiche locali
- cambio schema/versione app con cache preesistente
- upload allegati interrotto con record incompleto
- clock skew client-server (preferire timestamp server)
- service worker obsoleto che serve bundle vecchio

---

## Implicazioni

### Positive
- riduce disallineamenti menu/lista audit tra device
- elimina quasi totalmente operazioni manuali DevTools lato utente
- aumenta affidabilità percepita in mobilità/offline
- riduce rischio regressioni "audit custom -> fallback ISO 9001"

### Trade-off
- maggiore complessità nel bootstrap di sessione
- logica di merge più articolata da testare
- necessità di metriche/log per debug produzione

---

## Piano implementativo (MVP robusto)

### Step 1 — Auto-reconcile startup (priorità alta)
- nuova routine `autoReconcileOnStartup()` in `StorageContext`
- ordine: `processQueue -> download server -> merge -> replace cache`
- purge queue stantia mirata per UUID presenti su server

### Step 2 — Fingerprint drift detection
- salvare fingerprint snapshot server (`count + max(updated_at) + hash uuid`)
- se mismatch forte: invalidazione automatica cache audit + reload snapshot

### Step 3 — Hardening conflitti custom checklist
- test E2E su audit custom-only:
  - create -> save -> reload -> multi-device reopen
- verifica invarianti:
  - `custom_checklist_id` preservato
  - `audit_standards` coerente
  - nessun fallback ISO inatteso

---

## Criteri di accettazione

- utente non deve più eseguire "Clear site data" per riallineare menu audit in casi ordinari
- dopo modifica offline e successivo reconnect, stessa vista audit su due device
- audit custom-only resta custom dopo save/reload/relogin
- nessuna perdita dati in presenza di rete instabile (entro politica conflict definita)

