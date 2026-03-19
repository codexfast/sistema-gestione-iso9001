# Session Notes – 19 marzo 2026

**Branch**: `main` | **Frontend**: Netlify `https://systemgest.netlify.app` | **Backend**: VPS `https://www.fr-busato.it:8443/api/v1`

---

## Stato sessione (chiusura giornata)

- Completato fix export Word checklist custom con layout tabellare dinamico (4 colonne) e marker robusti su template QTAFI.
- Completato fix strutturale sync/frontend+backend per prevenire regressione `custom_checklist_id` -> fallback ISO 9001.
- Eseguito hard cleanup audit test `2026-06` in DB (eliminazione completa audit + relazioni).
- Eseguita diagnosi dati: per audit `2026-06` precedente i contenuti custom risultavano persi lato server.

---

## Commit principali della sessione

- `0ce98bb` — layout tabellare dinamico export custom + template QTAFI fallback
- `ac5d981` — fix sync robusto: preserva `custom_checklist_id`, evita fallback ISO 9001 negli update

---

## Diagnosi tecnica consolidata

### Root cause regressione custom -> ISO
- in alcuni `update_audit` il payload non includeva sempre `custom_checklist_id`
- il backend upsert, senza protezione, poteva azzerare il campo e rientrare su standard legacy

### Correzione applicata
- frontend (`StorageContext`) invia sempre `custom_checklist_id` negli update
- frontend (`syncService`) non forza `standard_id=1` per audit custom-only
- backend (`audit.controller upsert`) usa update non distruttivo:
  - preserva `custom_checklist_id` esistente se non esplicitamente inviato
  - preserva standard esistente quando non esplicitamente inviato

---

## Hard cleanup eseguito su audit test

Target: `audit_number = 2026-06`

Eliminati definitivamente:
- `audits`
- `attachments`
- `audit_custom_checklist_responses`
- `audit_responses`
- `pending_issues` (target/source)
- `audit_standards`
- `non_conformities`

Verifica finale: residui = `0` su tutte le tabelle correlate.

---

## Mini ADR approvata in sessione

Creato documento:
- `docs/adr/ADR-006-auto-reconcile-cache-sync.md`

Decisione: introdurre strategia **self-healing automatica** per reconcile cache locale/snapshot server, senza demandare all’utente la pulizia manuale del browser nei casi normali.

---

## Punto di ripresa — prossima sessione

1. Ricreare audit `2026-06` da zero come custom checklist e verificare:
   - save
   - reload
   - relogin
   - export Word
2. Implementare Step 1 ADR-006:
   - routine `autoReconcileOnStartup()` in `StorageContext`
   - purge queue stantia mirata
3. Preparare test checklist multi-device (stessa utenza su due browser/device) e validare assenza disallineamenti menu/lista audit.

