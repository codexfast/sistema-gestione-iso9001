# Session Notes – 21 marzo 2026

**Branch**: `main` | **Focus**: export Word checklist custom (Verbale), stabilità DOCX, impaginazione tabelle, tool di verifica.

---

## Esperienza utile per le prossime sessioni

### 1. Report Word checklist custom — fix consolidati (codice)

| Problema | Dove / cosa |
|----------|-------------|
| `**` letterali invece di grassetto | `wordExportHelpers.js` → `buildCustomChecklistSectionOoxml`: `lineToRichRuns` + `textToRichParagraphs` (anche riga che inizia con `**` senza chiusura). |
| Solo link “Allegato”, no foto | `ExportPanel.jsx`: `photoMode: 'preview'` per export solo-custom; `preloadImagesIntoAudit` + `embedImagesInZip`. |
| Word “contenuto illeggibile” con JPEG | `[Content_Types].xml` senza `Default` per `.jpg` → `ensureImageContentTypesInZip` in `wordExport.js` dentro `embedImagesInZip`. |
| XML corrotto dopo render / inject | `repairWordDocumentXmlMalformedAttrs` **dopo** `doc.render` e **dopo** sostituzione marker in `injectOoxmlMarkers`. |
| Più tabelle invece di una | `buildCustomChecklistSectionOoxml`: un solo `xmlTable` con tutte le righe. |
| Righe `1.1.2`, `1.1.3` | Una riga per voce: tutti gli `evidence_blocks` concatenati nella stessa cella, codice sempre `itemCode`. |
| `rId` immagini duplicati | Indice sequenziale `30000 + imageRegistry.length` per embedding custom. |
| Template ISO usato per errore su custom senza resolver | `generateDocxBlob`: blocco `isCustomChecklist` imposta sempre fallback `TEMPLATE_MAP.custom_checklist`. |
| Tabelle intestazione/corpo fuori margini | `w:tblInd` **negativo** (es. `-714` dxa) in `header*.xml` / `document.xml` → `normalizeNegativeTableIndentsInZip` in `wordExport.js` al caricamento template; script `app/scripts/fix-verbale-table-margins.js` sul `.docx` in repo. |

### 2. Quale template viene usato

- **Fallback locale**: `app/public/templates/Verbale_di_riunione_QTAFI_VIS001.docx` (`/templates/...` sul sito).
- **Dall’app**: se `getReportTemplate` restituisce un URL (anche `/uploads/...` sul backend), **quello** ha priorità sul file in `public/templates`.
- **Script repro** (`backend/scripts/repro-custom-export.mjs`): **non** passa il resolver → usa sempre il Verbale in `public/templates` (e `fetch` mock solo per `/templates/`).

### 3. Database e script repro

- `docs/DATABASE.md` + `backend/config/database.json`: **`development`** = host di lavoro (es. `www.fr-busato.it:11043`); **`test`** = `localhost:1433` (spesso assente).
- Cursor/IDE possono impostare `NODE_ENV=test` → il repro falliva con `ESOCKET`.
- **Fix**: lo script repro, se `NODE_ENV=test`, forza `development` prima di `require('../src/config/database')` (vedi commento in cima allo script).

### 4. Comandi di verifica (da `app/` salvo indicato)

```powershell
cd "...\Sistema Gestione ISO 9001\app"
$env:NODE_ENV = "test"
npm run test:run
```

```powershell
node scripts/verify-template-repair.js
```

```powershell
npm run build
```

Repro (da `backend/`, DB raggiungibile):

```powershell
cd "...\Sistema Gestione ISO 9001\backend"
node scripts/repro-custom-export.mjs
```

### 5. Commit di riferimento (serie marzo 2026)

Ordine indicativo: grassetto evidenze → immagini custom → tabella unica → righe voce → repair XML → Content_Types → tblInd → doc repro/DB docs → template push utente → margini tabelle.

Ultimo commit nota sessione impaginazione: `1589e26` (msg: tblInd + script Verbale).

---

## Punto di ripresa — domani / prossima sessione

- **Stato**: export Verbale custom funzionante in produzione (dopo deploy); impaginazione tabelle header/corpo corretta con fix `tblInd` + runtime.
- **Opzionale**: micro-aggiustamenti impaginazione ancora manuali in Word sul template; rieseguire `node scripts/fix-verbale-table-margins.js` se Word reintroduce `tblInd` negativi.
- **ADR-006** / auto-reconcile cache (da `STATO_20260319_...`) resta backlog se non ancora in corso.
- **Sicurezza doc**: `DATABASE.md` e `database.json` contengono credenziali — non duplicarle in chat; ruotare se esposte.

---

## File toccati spesso in questo filone

- `app/src/utils/wordExport.js`
- `app/src/utils/wordExportHelpers.js`
- `app/src/components/ExportPanel.jsx`
- `app/public/templates/Verbale_di_riunione_QTAFI_VIS001.docx`
- `app/scripts/fix-verbale-template-xml.js`, `fix-verbale-table-margins.js`, `verify-template-repair.js`
- `backend/scripts/repro-custom-export.mjs`
- `.cursor/rules/sgq-operating-memory.mdc`

---

*Memoria operativa sintetica anche in `.cursor/rules/sgq-operating-memory.mdc`.*
