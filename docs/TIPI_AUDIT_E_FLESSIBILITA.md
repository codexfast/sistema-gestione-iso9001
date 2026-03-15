# Tipi di audit e flessibilità — Standard vs Checklist dinamica

> **Data**: 15 marzo 2026  
> **Contesto**: Phase 7 completata — checklist personalizzate con report Word. Necessità di chiarire la logica standard/checklist per evitare errori di validazione e confusione in creazione audit.

---

## Regola fondamentale

**Almeno uno tra** norme ISO **e** checklist personalizzata **deve essere selezionato**.

- Se usi **solo norme ISO** → audit standard (checklist predefinita per norma)
- Se usi **solo checklist personalizzata** → audit dinamico (verbale visita, nessuno standard richiesto)
- Se usi **entrambi** → audit ibrido (norme + checklist custom)

---

## I tre tipi di audit

| Tipo | Norme ISO | Checklist custom | Descrizione |
|------|-----------|------------------|-------------|
| **Standard** | ✅ Una o più | ❌ No | Audit classico ISO 9001, 14001, 45001, 3834. Checklist predefinita per norma. |
| **Dinamico** | ❌ Nessuna | ✅ Sì | Verbale visita, checklist con sezioni/voci definite durante l'audit. Nessuno standard richiesto. |
| **Ibrido** | ✅ Una o più | ✅ Sì | Audit con norme ISO **e** checklist personalizzata aggiuntiva (es. verbale visita + ISO 9001). |

---

## Validazione in creazione audit

```
Valido se: (norms.length > 0) OR (customChecklistId != null)
```

- **Solo norme** → OK
- **Solo checklist custom** → OK (standard NON richiesto)
- **Norme + checklist** → OK (ibrido)
- **Nessuno dei due** → Errore: "Selezionare almeno una norma oppure una checklist personalizzata"

---

## Comportamento per tipo

### Audit standard
- `selectedStandards`: ["ISO_9001", ...]
- `customChecklistId`: null
- Vista checklist: `ChecklistModule` con accordion per norma
- Export Word: un file per ogni norma (template per standard)

### Audit dinamico
- `selectedStandards`: []
- `customChecklistId`: 123
- Vista checklist: `CustomChecklistAuditView` — sezioni e voci aggiunte durante l'audit
- Export Word: un file (template Verbale visita)

### Audit ibrido
- `selectedStandards`: ["ISO_9001"]
- `customChecklistId`: 123
- Vista checklist: `ChecklistModule` (norme) + `CustomChecklistAuditView` (checklist custom)
- Export Word: file per norme + file per checklist custom (o unificato, in base a implementazione)

---

## Default in `createNewAudit`

```javascript
selectedStandards: metadata.selectedStandards || (metadata.customChecklistId ? [] : [ISO_STANDARDS.ISO_9001]),
customChecklistId: metadata.customChecklistId ?? null,
```

- Se `customChecklistId` è valorizzato → `selectedStandards` = [] (nessuno standard)
- Se nessuno dei due → default `selectedStandards` = [ISO_9001] (retrocompatibilità)

---

## Riferimenti nel codice

| File | Ruolo |
|------|-------|
| `AuditSelector.jsx` | Form creazione: validazione `norms OR customChecklistId` |
| `auditDataModel.js` | `validateAuditSchema`: `hasStandards \|\| hasCustomChecklist` |
| `ExportPanel.jsx` | Ramo export: `customChecklistId` senza standard → export Word checklist |
| `AuditAccordionLayout.jsx` | Mostra `CustomChecklistAuditView` se `customChecklistId` |
