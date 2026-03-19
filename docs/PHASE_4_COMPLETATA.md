# Phase 4 — DB Checklist personalizzate — Completata (15/03/2026)

## Riepilogo

Migration 025 eseguita con successo. Tabelle e colonne per checklist personalizzate pronte.

## Tabelle create

| Tabella | Descrizione |
|---------|-------------|
| `custom_checklists` | Checklist personalizzate per organizzazione |
| `custom_checklist_sections` | Sezioni (es. 1.0, 2.0) |
| `custom_checklist_items` | Voci (es. 1.1, 1.2) con `response_type` |
| `audit_custom_checklist_responses` | Risposte verbale per audit + custom_item |

## Colonne aggiunte

- `audits.custom_checklist_id` (FK nullable → custom_checklists)
- `attachments.custom_item_id` (FK nullable → custom_checklist_items)
- `report_template_assignments.custom_checklist_id` — FK aggiunta (colonna già presente da migration 024)

## Nota tecnica: FK custom_checklist_items

Per evitare l'errore SQL Server "multiple cascade paths" (percorsi multipli di CASCADE da `custom_checklists` a `custom_checklist_items`), la colonna `custom_checklist_id` in `custom_checklist_items` **non** ha FK verso `custom_checklists`. L'integrità è garantita tramite `section_id` → `custom_checklist_sections` → `custom_checklists`. L'applicazione deve mantenere `custom_checklist_id` coerente con la sezione.

## Script

- **Esecuzione**: `node backend/scripts/run-migration-025.js`
- **Rollback**: `node backend/scripts/revert-migration-025.js`

## Prossimo step

Phase 5 — Backend: API CRUD checklist custom, sezioni, voci, risposte.
