# Phase 5 — Backend API Checklist personalizzate — Completata (15/03/2026)

## Riepilogo

API backend per CRUD checklist custom, sezioni, voci, risposte e upload allegati per custom_item_id.

## API implementate

### Custom checklists (5.1, 5.2)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/v1/custom-checklists` | Lista checklist dell'org |
| POST | `/api/v1/custom-checklists` | Crea checklist (admin/auditor) |
| GET | `/api/v1/custom-checklists/:id` | Dettagli con sezioni e voci |
| PUT | `/api/v1/custom-checklists/:id` | Aggiorna checklist |
| DELETE | `/api/v1/custom-checklists/:id` | Elimina checklist |
| GET | `/api/v1/custom-checklists/:id/sections` | Lista sezioni |
| POST | `/api/v1/custom-checklists/:id/sections` | Crea sezione |
| PUT | `/api/v1/custom-checklists/:id/sections/order` | Aggiorna ordine sezioni |
| DELETE | `/api/v1/custom-checklists/:id/sections/:sectionId` | Elimina sezione |
| GET | `/api/v1/custom-checklists/:id/items` | Lista voci (?sectionId= opzionale) |
| POST | `/api/v1/custom-checklists/:id/items` | Crea voce |
| DELETE | `/api/v1/custom-checklists/:id/items/:itemId` | Elimina voce |

### Risposte custom per audit (5.3)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/v1/audits/:auditId/custom-checklist-responses` | Risposte evidence_blocks |
| PUT | `/api/v1/audits/:auditId/custom-checklist-responses` | Salva risposte (body: `{ responses: [{ custom_item_id, evidence_blocks }] }`) |

### Upload allegati (5.4)

- `POST /api/v1/attachments/upload` accetta `custom_item_id` nel body (invece di `question_id`) quando l'audit ha `custom_checklist_id`
- `GET /api/v1/attachments?custom_item_id=X` filtra per custom item

### Audit (estensione)

- `PUT /api/v1/audits/:id` accetta `custom_checklist_id` nel body per associare una checklist custom all'audit

## File creati/modificati

- `backend/src/services/customChecklist.service.js` — logica CRUD
- `backend/src/controllers/customChecklist.controller.js` — controller
- `backend/src/routes/customChecklist.routes.js` — routes
- `backend/src/routes/audit.routes.js` — aggiunte routes custom-checklist-responses
- `backend/src/controllers/attachment.controller.js` — supporto custom_item_id
- `backend/src/controllers/audit.controller.js` — supporto custom_checklist_id in update
- `backend/src/server.js` — mount customChecklistRoutes
- `backend/scripts/test-custom-checklists-api.js` — script di test

## Test

Con server avviato e JWT valido:

```bash
TOKEN=<jwt> node backend/scripts/test-custom-checklists-api.js
```

Oppure con login:

```bash
EMAIL=admin@sgq.local PASSWORD=xxx node backend/scripts/test-custom-checklists-api.js
```

## Prossimo step

Phase 6 — Frontend: UI checklist personalizzate (creazione, editor sezioni/voci, scelta in creazione audit, compilazione evidence_blocks).
