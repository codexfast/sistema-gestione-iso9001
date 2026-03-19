# Roadmap implementazione: template report per utente + checklist personalizzate

**Obiettivo**: ogni utente/org può avere i propri template report (per ISO e per checklist custom); checklist personalizzate con report collegato (template standard di default, personalizzato a pagamento); flusso operativo end-to-end con doppio check e chunk sicuri.

**Regole operative**:
- Eseguire **un chunk alla volta**; **doppio check** (verifica funzionamento / test) prima di passare al successivo.
- In caso di errore: **rollback al checkpoint precedente** (branch o restore DB).
- **Nessuna modifica al codice** fino a OK esplicito sulla roadmap.

---

## Phase 0 — Preparazione e sicurezza

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 0.1 | Branch | Creare branch `feature/report-templates-and-custom-checklists` da `main`. Tutte le modifiche su questo branch. | `git branch`; rollback = tornare su `main`. |
| 0.2 | Backup DB | Export schema + dati critici (opzionale ma consigliato prima di migration). | Script backup; rollback = restore. |
| 0.3 | Documentazione stato attuale | Breve doc (o sezione in SESSION_NOTES): come funziona oggi scelta template (TEMPLATE_MAP in wordExport.js), dove sono i .docx (app/public/templates/), quali standard hanno template. | Permette rollback “logico” e confronto post-modifica. |

**Checkpoint 0**: Branch creato, stato attuale documentato. Procedere a Phase 1 solo dopo OK.

---

## Phase 1 — DB: catalogo template e assegnazioni

**Obiettivo**: introdurre tabelle per (1) catalogo template report e (2) assegnazione template a standard / a checklist custom, per organizzazione.

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 1.1 | Migration: `report_templates` | Tabella: `id`, `organization_id` (NULL = template di sistema), `name`, `scope` ('audit' \| 'self_assessment'), `standard_key` (nullable, es. 'ISO_9001' per template “di default” per quello standard), `file_path` (percorso relativo o URL al .docx), `is_system` (BIT, 1 = non eliminabile, template built-in), `created_at`, `updated_at`. Indice su (organization_id, scope, standard_key). | Eseguire migration in locale; verificare che la tabella esista; rollback = script DOWN che fa DROP. |
| 1.2 | Seed template di sistema | Inserire una riga per ogni template attuale (ISO9001, ISO14001, ISO3834, default) con `organization_id = NULL`, `is_system = 1`, `file_path` come oggi (es. `/templates/ISO9001-audit-report.docx`). | SELECT da `report_templates`: devono esistere 4 righe (o N come i file in public/templates). |
| 1.3 | Migration: `report_template_assignments` | Tabella: `id`, `organization_id`, `standard_id` (nullable), `custom_checklist_id` (nullable), `report_template_id` (FK), `created_at`. CHECK: almeno uno tra standard_id e custom_checklist_id valorizzato. Unique su (organization_id, standard_id, custom_checklist_id) dove i nullable sono gestiti (una org può avere un override per standard_id=1 e uno per custom_checklist_id=5). | Migration + verifica; rollback = DROP tabella. |
| 1.4 | Doppio check Phase 1 | Nessuna modifica a backend/frontend ancora. Solo DB: report_templates popolata, report_template_assignments vuota. Script di rollback Phase 1 pronti (DROP + eventuale ripristino seed). | Eseguire rollback di prova in ambiente locale e ricreare; confermare che non ci sono dipendenze da altre tabelle ancora inesistenti (custom_checklists arriva in Phase 4). |

**Checkpoint 1**: DB pronto; report esistenti continuano a usare solo frontend (TEMPLATE_MAP) come oggi. OK esplicito prima di Phase 2.

---

## Phase 2 — Backend: API template e risoluzione template per report

**Obiettivo**: API per elenco/upload template (per org), assegnazione template a standard; risoluzione “quale template usare” per standard_id + organization_id (override org o template di sistema).

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 2.1 | API GET report-templates | `GET /api/v1/report-templates?scope=audit` → lista template disponibili per l’org (template di sistema + template dell’org). Filtro per organization_id da req.user. | Chiamata da Postman/frontend: risposta con template di sistema. |
| 2.2 | API POST report-templates (upload) | `POST /api/v1/report-templates`: upload file .docx, salvataggio su disco o storage (path salvato in report_templates con organization_id dell’utente). Validazione: solo admin/auditor, estensione .docx. | Upload un .docx di test; GET deve restituirlo. Rollback = rimuovere file e riga DB. |
| 2.3 | API assegnazione template per standard | `PUT /api/v1/report-template-assignments/standard/:standardId` body `{ report_template_id }`. Inserisce/aggiorna in report_template_assignments per (organization_id, standard_id). | Assegnare un template custom a standard_id=1; verificare che la riga esista. |
| 2.4 | Helper risoluzione template | Funzione `getReportTemplateId(organizationId, standardId, customChecklistId)` (o due funzioni separate): cerca in report_template_assignments; se trovato usa quel template_id; altrimenti per standard_id cerca template di sistema con quel standard_key (o default). Restituisce report_template_id (o file_path). | Test unitario o script: per org senza assegnazioni deve restituire template di sistema; con assegnazione deve restituire template assegnato. |
| 2.5 | Doppio check Phase 2 | Le API non devono ancora essere usate dal frontend per la generazione report (il frontend continua a usare TEMPLATE_MAP). Verificare che le API rispondano e che i dati in DB siano coerenti. | Chiamate manuali; rollback = rimuovere route/controller se necessario. |

**Checkpoint 2**: Backend espone template e assegnazioni; generazione report lato app **invariata**. OK prima di Phase 3.

---

## Phase 3 — Frontend: uso template assegnato in generazione report

**Obiettivo**: in fase di export Word, il frontend deve usare il template “risolto” (assegnato all’org per quello standard, oppure default di sistema) invece del solo TEMPLATE_MAP statico.

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 3.1 | API client: getReportTemplateForAudit | Aggiungere in apiService: `getReportTemplateForAudit(audit)` o `getReportTemplate(standardId, organizationId)`. Chiamata a backend che usa getReportTemplateId e restituisce URL/path del template (o blob se il backend serve il file). | Da browser: chiamata restituisce path o file; log senza errori. |
| 3.2 | wordExport.js: risoluzione template | Prima di caricare il .docx, chiamare getReportTemplate(standardId, organizationId). Se la risposta contiene un URL/path (es. template custom), usare quello; altrimenti fallback a TEMPLATE_MAP come oggi. Mantenere TEMPLATE_MAP come default se API non disponibile (offline/errore). | Generare report per audit ISO 9001: senza assegnazione deve usare ISO9001 come oggi; con assegnazione custom deve usare il template custom (verifica visiva o log). |
| 3.3 | UI (opzionale minima) | Piccola sezione in Impostazioni o in pagina Admin: “Template report per standard”. Elenco standard; per ciascuno, dropdown per scegliere template (elenco da GET report-templates). Salvataggio con PUT report-template-assignments/standard/:id. | Salvare un’assegnazione e rigenerare report: deve usare il template scelto. Rollback = rimuovere chiamata API da wordExport e tornare a solo TEMPLATE_MAP. |
| 3.4 | Doppio check Phase 3 | Generazione report esistente (ISO 9001, 14001, 3834) deve continuare a funzionare; con assegnazione org deve usare template org. Nessuna regressione su export. | E2E: crea audit, compila, genera Word; confronta con comportamento pre-Phase 3. |

**Checkpoint 3**: Report Word collegato al template assegnato per standard; rollback = revert commit Phase 3. OK prima di Phase 4.

---

## Phase 4 — DB: checklist personalizzate e risposte “verbale”

**Obiettivo**: tabelle per checklist custom (sezioni, voci), collegamento audit → checklist custom, risposte con evidence_blocks (testo + allegato per blocco).

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 4.1 | Migration: `custom_checklists` | `id`, `organization_id`, `name`, `description` (nullable), `is_active`, `default_report_template_id` (FK nullable → report_templates), `custom_report_template_id` (nullable, override a pagamento), `created_at`, `updated_at`. | Migration OK; rollback = DROP. |
| 4.2 | Migration: `custom_checklist_sections` | `id`, `custom_checklist_id`, `code` (es. '1.0'), `title`, `display_order`. | Migration OK; rollback = DROP. |
| 4.3 | Migration: `custom_checklist_items` | `id`, `custom_checklist_id`, `section_id`, `code` (es. '1.1'), `title`, `response_type` ('verbale'), `display_order`. | Migration OK; rollback = DROP. |
| 4.4 | Migration: `audits.custom_checklist_id` | Aggiungere colonna `custom_checklist_id` (FK nullable) a `audits`. | Migration OK; audit esistenti invariati. |
| 4.5 | Migration: `audit_custom_checklist_responses` | `id`, `audit_id`, `custom_item_id`, `evidence_blocks` (NVARCHAR(MAX) JSON: array di { text, attachment_id }), `updated_at`. Unique (audit_id, custom_item_id). | Migration OK; rollback = DROP. |
| 4.6 | Migration: `attachments` estensione | Aggiungere `custom_item_id` (nullable) a `attachments`; per allegati “custom” non usare question_id. (Verificare schema attuale: se già presente campo generico “entity” saltare o adattare.) | Migration OK; allegati esistenti invariati. |
| 4.7 | Doppio check Phase 4 | Nessun backend/frontend ancora usa le nuove tabelle. Solo DB; script di rollback Phase 4 pronti (DROP in ordine inverso, rimuovere colonna audits.custom_checklist_id). | Eseguire rollback di prova; riapplicare migration; verificare integrità FK. |

**Checkpoint 4**: DB pronto per checklist custom; nessun cambio al flusso audit attuale. OK prima di Phase 5.

---

## Phase 5 — Backend: API checklist custom e risposte

**Obiettivo**: CRUD checklist custom (sezioni, voci); lettura/scrittura risposte audit con evidence_blocks; upload allegati per custom_item_id.

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 5.1 | API CRUD custom checklists | GET/POST /api/v1/custom-checklists; GET/PUT/DELETE /api/v1/custom-checklists/:id. Filtro organization_id. | Creare una checklist “Test”; GET restituisce la lista. |
| 5.2 | API sezioni e voci | GET/POST /api/v1/custom-checklists/:id/sections; GET/POST /api/v1/custom-checklists/:id/items (o nested sotto sections). Aggiornamento ordine. | Aggiungere sezione 1.0 e voce 1.1; GET restituisce struttura. |
| 5.3 | API risposte custom per audit | GET /api/v1/audits/:auditId/custom-checklist-responses; PUT/POST per salvare evidence_blocks (array di { text, attachment_id }) per (audit_id, custom_item_id). | Salvare un blocco di prova; GET restituisce i dati. |
| 5.4 | Upload allegati per custom | Estendere API upload allegati: accettare `custom_item_id` invece di `question_id` quando l’audit ha custom_checklist_id. Salvare in attachments con custom_item_id. | Upload file per custom item; verificare che attachment sia collegato e che l’id possa essere messo in evidence_blocks. |
| 5.5 | Doppio check Phase 5 | Audit esistenti (solo standard) non devono essere toccati. Solo audit con custom_checklist_id usano le nuove API. | Chiamate manuali; rollback = disattivare route o revert commit. |

**Checkpoint 5**: Backend pronto per checklist custom; flusso audit “solo ISO” invariato. OK prima di Phase 6.

---

## Phase 6 — Frontend: UI checklist personalizzate (creazione e compilazione)

**Obiettivo**: creare/modificare checklist custom (sezioni, voci); in creazione audit poter scegliere una checklist custom; in compilazione audit mostrare le voci “verbale” con blocchi evidenza (textarea + allegato, Aggiungi/Rimuovi evidenza).

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 6.1 | Pagina / sezione “Checklist personalizzate” | Solo per ruoli consentiti. Elenco checklist custom dell’org; pulsante “Crea checklist”; modifica nome, descrizione; eliminazione. Chiamate a API Phase 5. | Creare una checklist “Fincantieri test”; vedere in elenco. |
| 6.2 | Editor sezioni e voci | Dentro una checklist: elenco sezioni (1.0, 2.0, …); per ogni sezione, elenco voci (1.1, 2.1, …). Aggiungi/rimuovi sezione, aggiungi/rimuovi voce; campi code, title. response_type fisso “verbale” per ora. | Aggiungere 2 sezioni e 2 voci; salvare; ricaricare e verificare. |
| 6.3 | Creazione audit: scelta checklist custom | In modal “Crea audit”, oltre agli standard, dropdown o checkbox “Checklist personalizzata” (elenco da GET custom-checklists). Se selezionata, impostare audit.custom_checklist_id. | Creare audit con checklist custom; verificare che custom_checklist_id sia salvato (API/DB). |
| 6.4 | Vista checklist in audit: voci “verbale” | Nella sezione Checklist dell’audit, se è presente custom_checklist_id, mostrare sezioni/voci della checklist custom. Per ogni voce: titolo; lista “evidenze” (blocchi). Ogni blocco: textarea (con hint “usa ** per grassetto”) + “Aggiungi allegato” + “Rimuovi evidenza”. Pulsante “Aggiungi evidenza”. Salvataggio in evidence_blocks via API Phase 5. | Compilare un’evidenza (testo + allegato); salvare; ricaricare pagina e verificare persistenza. |
| 6.5 | Doppio check Phase 6 | Audit senza checklist custom devono comportarsi come prima. Audit con checklist custom devono mostrare solo le voci custom (o standard + custom se si supporta entrambi). Nessuna regressione su checklist ISO. | E2E: audit solo ISO; audit con custom; rollback = revert commit frontend. |

**Checkpoint 6**: Flusso completo creazione + compilazione checklist custom; report Word per custom non ancora obbligatorio (si può usare template generico). OK prima di Phase 7.

---

## Phase 7 — Report Word per checklist custom e assegnazione template

**Obiettivo**: generazione report Word per audit con checklist custom (contenuto: sezioni/voci + evidence_blocks con testo e immagini); assegnazione template a checklist custom (default + override custom).

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 7.1 | Risoluzione template per checklist custom | Backend: getReportTemplateId(organizationId, null, customChecklistId). Cercare in report_template_assignments per custom_checklist_id; se presente usare quel template; altrimenti usare custom_checklist.default_report_template_id o un template “Verbale visita” di sistema. | Assegnare un template a una checklist custom; risoluzione deve restituire quel template. |
| 7.2 | Template Word “Verbale visita” generico | Aggiungere in report_templates (sistema) un template generico per checklist custom (es. VerbaleVisita-generic.docx). Placeholder per sezioni, voci, blocchi testo e immagini. | File in public/templates o servito da backend; mappatura in risoluzione. |
| 7.3 | wordExport: supporto audit con custom checklist | Se audit ha custom_checklist_id: usare template risolto per custom (Phase 7.1); costruire dati documento da evidence_blocks (iterare sezioni/voci, per ogni voce iterare blocchi: testo con **→grassetto, poi immagine). Iniettare nel .docx (stesso meccanismo docxtemplater/ooxml che per ISO). | Generare Word da audit con checklist custom compilata; aprire file e verificare sezioni, testi, immagini. |
| 7.4 | UI: assegnazione template a checklist custom | In editor checklist custom: campo “Template report” (default) e “Template report personalizzato” (opzionale, per consulenza). Dropdown da GET report-templates. Salvataggio su custom_checklist e/o report_template_assignments. | Assegnare template; rigenerare report; verificare che usi il template scelto. |
| 7.5 | Doppio check Phase 7 | Report ISO invariati. Report per audit con checklist custom devono essere generabili e leggibili. | E2E: audit ISO report; audit custom report; rollback = revert commit. |

**Checkpoint 7**: Flusso end-to-end: checklist custom → compilazione → report Word collegato al template (standard o personalizzato). OK prima di Phase 8.

---

## Phase 8 — Self-assessment (fase 2, opzionale)

**Obiettivo**: contesto “Self-assessment” (autovalutazione azienda su requisiti 14001/9001/45001) con griglia stato (discusso / in corso / da validare / completato) + note + doc; export tipo SAL.

| # | Task | Dettaglio | Verifica / Rollback |
|---|------|-----------|----------------------|
| 8.1 | DB: self_assessments e risposte | `self_assessments`: id, company_id, name, checklist_scope (standard_ids o template_id), status, date, created_at. `self_assessment_responses`: self_assessment_id, item_id (riferimento a checklist_template_items o question_id), status (discusso/in_corso/da_validare/completato/na), notes, doc_reference. | Migration; rollback = DROP. |
| 8.2 | Backend: API self-assessment | CRUD self_assessments; GET/PUT responses per self_assessment_id. | Chiamate API. |
| 8.3 | Frontend: tab “Self-assessment” | Lista self-assessment per company; creazione; compilazione griglia (requisito, colonne stato, note, doc). | Compilare e salvare. |
| 8.4 | Export Word/PDF tipo SAL | Template SAL: tabella requisiti con colonne implementazione e note. Generazione da self_assessment_responses. | File generato coerente con SAL. |
| 8.5 | Doppio check Phase 8 | Audit e checklist custom invariati. Self-assessment isolato. | E2E; rollback = revert Phase 8. |

**Checkpoint 8**: Self-assessment operativo; report SAL generabile. OK finale.

---

## Riepilogo checkpoint e rollback

| Phase | Cosa verifica | Rollback |
|-------|----------------|----------|
| 0 | Branch e doc stato attuale | Tornare a main |
| 1 | Tabelle DB + seed template | Script DROP + rimuovere seed |
| 2 | API template e assegnazioni | Revert commit backend |
| 3 | Report Word usa template assegnato | Revert commit frontend; wordExport solo TEMPLATE_MAP |
| 4 | Tabelle checklist custom | Script DROP migration Phase 4 |
| 5 | API checklist custom | Revert commit backend |
| 6 | UI checklist custom | Revert commit frontend |
| 7 | Report Word per custom | Revert commit frontend/backend |
| 8 | Self-assessment | Revert commit Phase 8 |

---

## Ordine di esecuzione e doppio check

- Eseguire **una phase alla volta**.
- Alla fine di ogni phase: **doppio check** (verifica tabella, API, UI o E2E come indicato).
- Solo dopo **OK esplicito** (o tuo messaggio “procedi”) passare alla phase successiva.
- In caso di problema: **stop**, rollback al checkpoint precedente, correggere e riprovare.

**Nessuna modifica al codice sarà eseguita prima del tuo OK su questa roadmap.**
