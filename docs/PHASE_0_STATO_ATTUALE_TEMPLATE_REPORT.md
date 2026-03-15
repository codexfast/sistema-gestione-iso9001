# Phase 0 — Stato attuale: template report e wordExport

**Data**: 15/03/2026  
**Branch**: `feature/report-templates-and-custom-checklists`  
**Scopo**: Documentare come funziona oggi la scelta e il caricamento dei template report, per permettere rollback logico e confronto post-modifica (Phase 1–7).

---

## 1. Dove sono i file template (.docx)

| Percorso | File presenti |
|----------|---------------|
| `app/public/templates/` | `ISO9001-audit-report.docx`, `ISO14001-audit-report.docx`, `ISO3834-audit-report.docx` |

**Nota**: `ISO45001-audit-report.docx` non esiste; la mappa punta comunque a quel path; in caso di fetch fallito l’utente riceve errore. Per ISO 45001 si usa di fatto il fallback (vedi sotto).

---

## 2. TEMPLATE_MAP in wordExport.js

**File**: `app/src/utils/wordExport.js` (righe 43–49)

```javascript
const TEMPLATE_MAP = {
    'ISO_9001':   '/templates/ISO9001-audit-report.docx',
    'ISO_14001':  '/templates/ISO14001-audit-report.docx',
    'ISO_45001':  '/templates/ISO45001-audit-report.docx',
    'ISO_3834_2': '/templates/ISO3834-audit-report.docx',
    'default':    '/templates/ISO9001-audit-report.docx',
};
```

---

## 3. Logica di scelta template

1. **Funzione** `normalizeStdKey(standardKey)`:
   - Converte `standardKey` in chiave compatibile con `TEMPLATE_MAP` (es. `ISO_9001_2015` → `ISO_9001`).
   - Rimuove suffisso anno (`_2015`, `_2021`).
   - Per varianti ISO 3834 → `ISO_3834_2`.
   - Se nessuna chiave corrisponde → `'default'`.

2. **Funzione** `getTemplateUrl(standardKey)`:
   - Restituisce `TEMPLATE_MAP[normalizeStdKey(standardKey)] || TEMPLATE_MAP['default']`.
   - Usata in `generateDocxBlob()` per ottenere URL del template.

3. **Flusso in** `generateDocxBlob()`:
   - `normKey` = chiave normalizzata da `options.standardKey` o dalla prima chiave della checklist.
   - `templateUrl = getTemplateUrl(normKey || Object.keys(checklistFiltered)[0])`.
   - `fetch(templateUrl, { cache: 'no-store' })` carica il file da `app/public/` (percorso root).

---

## 4. Standard con template fisicamente presenti

| Standard | Chiave TEMPLATE_MAP | File .docx | Stato |
|----------|---------------------|------------|-------|
| ISO 9001 | `ISO_9001` | `ISO9001-audit-report.docx` | ✅ Presente |
| ISO 14001 | `ISO_14001` | `ISO14001-audit-report.docx` | ✅ Presente |
| ISO 45001 | `ISO_45001` | `ISO45001-audit-report.docx` | ❌ Non presente (fallback) |
| ISO 3834-2 | `ISO_3834_2` | `ISO3834-audit-report.docx` | ✅ Presente |
| Default | `default` | `ISO9001-audit-report.docx` | ✅ Presente |

---

## 5. Nessuna assegnazione per organization

- **Oggi**: non esiste concetto di “template assegnato per organization”.
- Tutte le organizzazioni usano gli stessi template di sistema (mappa statica).
- Nessuna tabella DB `report_templates` o `report_template_assignments`.

---

## 6. Rollback

- **Per tornare a questo stato**: `git checkout main`; eventuale `git branch -D feature/report-templates-and-custom-checklists`.
- **Per confronto logico**: questo documento descrive come funziona la scelta template prima delle Phase 1–7.

---

*Riferimento: ROADMAP_TEMPLATE_E_CHECKLIST_PERSONALIZZATE.md, Phase 0.3*
