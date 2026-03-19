# Phase 6 — Frontend UI Checklist personalizzate — Completata (15/03/2026)

## Riepilogo

UI completa per creazione, modifica e compilazione checklist personalizzate.

## Implementato

### 6.1 Pagina Checklist personalizzate
- Nav "Checklist personalizzate" (admin/auditor)
- Elenco checklist con pulsante "Crea checklist"
- Modifica nome, descrizione; eliminazione
- Chiamate API Phase 5

### 6.2 Editor sezioni e voci
- Dentro una checklist: elenco sezioni (1.0, 2.0, …)
- Per ogni sezione: elenco voci (1.1, 2.1, …)
- Aggiungi/rimuovi sezione, aggiungi/rimuovi voce
- Campi code, title; response_type fisso "verbale"

### 6.3 Creazione audit: scelta checklist custom
- Nel modal "Crea audit": dropdown "Checklist personalizzata (opzionale)"
- Se selezionata, `audit.custom_checklist_id` salvato
- Validazione: almeno una norma O una checklist custom
- Supporto audit solo-checklist (senza norme ISO)

### 6.4 Vista checklist in audit
- Sezione "Checklist personalizzata" nella sezione Checklist
- Per ogni voce: titolo; lista evidenze (blocchi)
- Ogni blocco: textarea (hint "usa ** per grassetto") + Aggiungi allegato + Rimuovi evidenza
- Pulsante "Aggiungi evidenza"
- Salvataggio `evidence_blocks` via API Phase 5
- Upload allegati con `custom_item_id`

### 6.5 Doppio check
- Audit senza checklist custom: comportamento invariato
- Audit con checklist custom: mostra sezione custom + eventuali norme ISO
- Badge "Checklist personalizzata" nella barra info audit

## File creati/modificati

**Nuovi:**
- `app/src/components/CustomChecklistsPage.jsx`
- `app/src/components/CustomChecklistsPage.css`
- `app/src/components/CustomChecklistAuditView.jsx`
- `app/src/components/CustomChecklistAuditView.css`

**Modificati:**
- `app/src/App.jsx` — vista custom-checklists, nav
- `app/src/components/AuditSelector.jsx` — dropdown checklist, badge, validazione
- `app/src/components/AuditAccordionLayout.jsx` — sezione CustomChecklistAuditView
- `app/src/services/apiService.js` — API custom checklists, customItemId in upload
- `app/src/contexts/StorageContext.jsx` — custom_checklist_id in sync payload
- `app/src/services/syncService.js` — custom_checklist_id in mappedAudit
- `app/src/data/auditDataModel.js` — customChecklistId in metadata, validazione
- `app/src/utils/auditConverter.js` — customChecklistId da backend
- `backend/src/controllers/audit.controller.js` — custom_checklist_id in create e upsert

## Prossimo step

Phase 7 — Report Word per checklist custom e assegnazione template.
