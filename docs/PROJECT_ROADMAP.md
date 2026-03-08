# Roadmap — Sistema Gestione ISO 9001 / SaaS Multi-Tenant

> **Data Inizio**: 13 gennaio 2026
> **Ultimo Aggiornamento**: 08 marzo 2026
> **Prossimo Step**: Test end-to-end su ISO 3834-2 e RDP_MSN → Template Word per nuovi standard
> **Riferimenti**: `docs/SESSION_NOTES_20260308.md` (stato aggiornato) | `docs/DATABASE_SCHEMA.md` (schema DB)

---

## Visione Strategica Aggiornata (07/03/2026) — 4 Scenari, 2 Clienti

### I 4 Scenari d'uso emersi

| # | Scenario | Chi lo usa | Standard | Output |
|---|---|---|---|---|
| 1 | **Audit di sistema** | Camellini | ISO 9001 / 14001 / 45001 | Report audit + checklist C/NC/NA |
| 2 | **Audit di terza parte** | Camellini / Mason | Norme del committente | Report audit con ref. normative committente |
| 3 | **Consulenza / SAL** | Camellini | ISO 9001 / 14001 / 45001 | Tabella avanzamento requisiti (Discusso/In corso/Completato) |
| 4 | **Rapporto di Prova** | Mason | ISO 3834 | Report con misure, prove, foto obbligatorie |

### I 2 clienti attuali

**Marco Camellini** — Auditor sistemi di gestione
- Scenario 1: audit ISO 9001 ✅ (in produzione), ISO 14001 e 45001 (da completare)
- Scenario 3: SAL documentale per aziende in fase di implementazione SGQ

**Mason** — Coordinatore di saldatura
- Scenario 4: Rapporti di Prova ISO 3834-2 con evidenze fotografiche
- Template di riferimento: `Check List Audit/RDP_MSN-260127-01_REV_0.docx`

### Risorse normative disponibili (leggibili dal tool)
| File | Norma | Uso previsto |
|---|---|---|
| `Normative/UNI EN ISO 9001_2015 Rev. 0.txt` | ISO 9001:2015 | Checklist ✅ |
| `Normative/...UNI EN ISO 14001_2015 Rev. 0.pdf` | ISO 14001:2015 | Checklist da costruire |
| `Normative/...UNI ISO 45001_2018 Rev. 0.pdf` | ISO 45001:2018 | Checklist da costruire |
| `Normative/...UNI EN ISO 3834-1_2021 Rev. 0.pdf` | ISO 3834-1 | Criteri scelta livello |
| `Normative/...UNI EN ISO 3834-3_2021 Rev. 0.pdf` | ISO 3834-3 | Requisiti livello intermedio |
| `Normative/...UNI EN ISO 3834-5_2021 Rev. 0.pdf` | ISO 3834-5 | Documenti e record |

### Cosa differenzia i 4 scenari tecnicamente

| Elemento | Scenario 1 | Scenario 2 | Scenario 3 | Scenario 4 |
|---|---|---|---|---|
| Tipo risposta | C/NC/NA/OSS/OM | C/NC/NA | Discusso/In corso/Completato | Conforme/NC + misure |
| Riferimento norma | Standard ISO | **Norme committente** | Standard ISO | ISO 3834 + spec. committente |
| Foto/allegati | Opzionale | Opzionale | No | **Obbligatorio** |
| Struttura UI | Accordion sezioni | Accordion sezioni | Tabella tracker | Form + gallery foto |
| Template Word | Report audit | Report audit terza parte | SAL avanzamento | Rapporto di prova |

### Scenario 2 — soluzione per ref. normative committente
Il campo `clauseRef` (già presente nella checklist) serve come ancoraggio normativo.
Per audit di terza parte, l'auditor aggiunge nelle note o in un campo "Riferimento committente"
la procedura specifica richiesta dal cliente — non serve una checklist per ogni committente.

### Campo `norm_excerpt` — feature trasversale (tutti gli scenari)
Nel report ISO 14001 del cliente, sotto ogni punto auditato appare lo stralcio della norma.
**Piano**: aggiungere colonna `norm_excerpt NVARCHAR(MAX)` in `checklist_questions`.
Il testo può essere pre-caricato dalle normative PDF (già disponibili e leggibili).
Impatto: report Word molto più professionali, nessuna modifica alla UI.

---

## Visione Strategica (decisione 03/03/2026)

Il progetto evolve da **MVP mono-tenant** a **piattaforma SaaS multi-tenant** per studi di consulenza ISO.

### Modello utenti
```
QS Studio (superadmin — noi)
  └── Studio/Auditor (nostro cliente — abbonamento per standard)
        └── Azienda auditata (cliente dell'auditor — accesso read-only ai propri audit)
```

### Modello commerciale
- Canone per standard abilitato: ISO 9001 / ISO 14001 / ISO 45001 / Checklist Libera
- Tab standard visibili solo se abbonamento attivo per quell'auditor
- Futura: modulo workflow implementazione SGQ come add-on

### Principio di sviluppo: Dark Launch
Ogni nuovo modulo nasce come **tab nascosta** visibile solo agli admin QS Studio.
Gli auditor lo ricevono solo quando stabile e collaudato — zero interruzioni operative.

---

## Stato Avanzamento al 08/03/2026

| Area | Descrizione | Status |
|---|---|---|
| DB migrations 001-018 | Schema base, checklist, allegati, pending_issues | ✅ Completato |
| Auth / JWT | Cookie httpOnly, CORS, authenticateDownload | ✅ Completato |
| Checklist ISO 9001 | 35 domande, clauseRef esatti da documento originale | ✅ Completato (06/03) |
| Checklist ISO 14001 | 46 domande da DB, sezioni 14001_s4/14001_s5 | ✅ Completato |
| Audit CRUD | Crea, modifica, elimina, lista, statistiche | ✅ Completato |
| Sync offline-first | IndexedDB + server-wins + retry/backoff | ✅ Completato |
| Allegati | Upload, preview blob, replace desktop, delete | ✅ Completato |
| Rilievi pendenti | PendingIssuesCascade + pending_issues table | ✅ Completato |
| Re-audit | checkReaudit endpoint + AuditSelector | ✅ Completato |
| Export Word ISO 9001 | Template + Heading2 per TOC + clauseRef corretti | ✅ Completato (06/03) |
| Export Word ISO 14001 | Intestazioni per standard + numerazione corretta | ✅ Completato |
| Multi-standard UI | Tab ISO 9001 + ISO 14001, fix 4 bug 9894ed5 | ✅ Completato |
| Fix sync multi-standard | standard_ids array, auditConverter, checkbox | ✅ Completato |
| **Fase 1: DB multi-tenant** | companies, auditor_orgs, user_org_roles, subscriptions | ✅ Completato |
| **Server come fonte di verità** | Cache IndexedDB sostituita ad ogni download server | ✅ Completato |
| **Dev locale robusto** | Proxy Vite, SW disabilitato su localhost | ✅ Completato |
| **Logo azienda** | Upload/preview/delete logo in CompaniesPage; logo_url nel DB | ✅ Completato (06/03) |
| **ISO 3834-2** | Standard, sezioni DB, template Word generato | ✅ Completato (06/03) |
| **UX audit** | Pulsante "← Lista Audit" + indicatore salvataggio | ✅ Completato (06/03) |
| **Fix campo Note** | Barra spaziatrice funzionante (rimosso trim live) | ✅ Completato (06/03) |
| **Fix sommario Word** | Stili Titolo1/2, colonne DXA, margini stretti | ✅ Completato (07/03) |
| **Fix VERIFICATORE** | Campo meta.auditorName corretto | ✅ Completato (07/03) |
| **Fix backend paths** | require() corretti in certificationFindings | ✅ Completato (07/03) |
| **Fix colonne Word fisse** | tblLayout fixed + ordine OOXML corretto | ✅ Completato (08/03) |
| **Fix allegati in Word** | auditId numerico, hyperlink fldSimple cliccabili | ✅ Completato (08/03) |
| Export Word ISO 3834 | Da testare su produzione | 🔲 Da testare |
| **Foto embedded in Word** | pic:cNvPr id duplicati → doc corrotto; da reimplementare | 🔲 Backlog tecnico |
| Pagina Admin utenti | UI gestione utenti e abbonamenti | 🔲 Backlog |
| ISO 14001 checklist completa | Da norma PDF disponibile | 🔲 Prossima priorità |
| ISO 45001 checklist | Da norma PDF disponibile | 🔲 Backlog |
| Modulo SAL (Scenario 3) | Nuovo tipo documento per Camellini | 🔲 Backlog |
| Modulo RDP (Scenario 4) | Nuovo tipo documento per Mason — richiede foto embedded | 🔲 Backlog |
| Campo norm_excerpt | Stralcio norma nel report Word | 🔲 Backlog |

**Progress Overall**: ~85% funzionalità core Scenario 1

---

## Roadmap per Fasi

### Fase 0 — Chiusura bug minori e completamento Scenario 1 — PROSSIMA

| # | Task | File | Note |
|---|---|---|---|
| 0.1 | Test export Word ISO 9001 sommario | produzione | Verificare cap. 1→11, colonne, margini |
| 0.2 | ISO 14001 checklist da norma PDF | DB migration + `checklistTemplates.js` | Norma già disponibile e leggibile |
| 0.3 | ISO 45001 checklist da norma PDF | DB migration + `checklistTemplates.js` | Norma già disponibile e leggibile |
| 0.4 | Campo norm_excerpt in checklist_questions | DB + wordExportHelpers.js | Alto impatto, bassa complessità |
| 0.5 | Rilievi pendenti reali in Word | `wordExport.js` | RILIEVI_MARKER → GET /audits/:id/pending-issues |
| 0.6 | Fix Auth Mobile (ADR-004) | `auth.controller.js`, `apiService.js` | localStorage JWT — prerequisito per mobile |

---

### Fase 0.B — Requisiti Trasversali (da integrare nelle fasi successive)

Questi due aspetti impattano su più fasi e vanno considerati in ogni decisione architetturale.

#### Sicurezza link allegati nel Word — download token monouso (Fase 0 / bassa priorità)
**Problema**: i link agli allegati embedded nel report Word contengono il JWT di sessione completo dell'auditor.
Chiunque riceva il file Word può aprire i link e scaricare gli allegati senza fare login.
Il token ha permessi ampi (intera API) e potenzialmente lunga scadenza.

**Soluzione**: sostituire il JWT con **token monouso a scadenza breve** (48h), dedicati al singolo allegato.

```
Tabella DB:
  download_tokens (
    token_hash    VARCHAR(64) PK,   -- SHA-256 del token, mai il token grezzo
    attachment_id INT FK,
    created_by    INT FK users,
    expires_at    DATETIME,         -- ora generazione + 48h
    used_at       DATETIME NULL     -- NULL = non ancora usato
  )

Backend:
  POST /attachments/download-token  → genera token per lista attachment_id
  GET  /attachments/download?dt=TOKEN → valida (esiste? non scaduto?) e serve il file

Frontend (wordExport.js):
  Prima di costruire il Word, chiama l'API per ottenere i token temporanei
  Sostituisce getViewUrl → URL con ?dt=TOKEN invece di ?token=JWT
```

**Stima**: ~4-5 ore (DB 2h + Backend 1h + Frontend 2h)
**Priorità**: bassa — da fare dopo stabilizzazione core (Fase 0 completata)
**Riferimento**: discussione 08/03/2026

#### Audit Locking — accesso concorrente (Fase 1)
**Problema**: se due auditor aprono lo stesso audit contemporaneamente si sovrascrivono le risposte.
**Soluzione**: pessimistic lock con TTL (time-to-live).

```
Flusso proposto:
  - Utente A apre audit → backend registra lock (audit_id, user_id, expires_at = now+15min)
  - Utente B apre stesso audit → backend risponde "locked by Utente A"
  - Frontend mostra banner: "Audit in uso da [nome] — accesso sola lettura"
  - Lock si rinnova automaticamente ogni 10 min se utente è attivo
  - Lock scade se utente chiude tab / va offline / inattivo >15 min

Tabella DB:
  audit_locks (audit_id FK, user_id FK, locked_at, expires_at, session_token)
  INDEX su expires_at per cleanup automatico

Backend:
  POST /audits/:id/lock    → acquisisce lock (o restituisce chi lo ha)
  DELETE /audits/:id/lock  → rilascia lock
  PUT /audits/:id/lock     → rinnova lock (heartbeat ogni 10 min)

Frontend:
  AuditLockBanner.jsx      → banner avviso accesso concorrente
  Heartbeat in useEffect   → rinnova lock finche audit e aperto
```

#### Offline Resilience Android — gestione disconnessione (Fase 0 + Fase 2)
**Problema**: su Android PWA la connessione può cadere durante la compilazione.
Il Service Worker e limitato, la quota IndexedDB e ~50MB, la File API non e supportata.

**Stato attuale**: sync offline-first gia implementato per risposte. Mancano:
- Feedback visivo chiaro quando si e in modalita offline
- Gestione upload allegati offline (store blob in IndexedDB → upload al reconnect)
- Warning quando IndexedDB si avvicina al limite quota
- Fallback export Word su Android (gia parzialmente gestito con file-saver)

**Piano**:
```
Fase 0.3 (Auth Mobile ADR-004) — prerequisito
Fase 2 — SyncService v3: store attachments_offline in IndexedDB v3
          StorageQuotaService: monitor spazio ogni 5 min, warning a 60%, cleanup a 80%
          ConnectionStatusBanner: indicatore permanente online/offline
```

---

### Fase 0.B — Nuovi Moduli Documento (Scenario 3 e 4)

Questi moduli hanno struttura dati e UI completamente diversi dall'audit checklist.
Vanno costruiti come **tipi documento separati** identificati da `document_type` in `audits`.

#### Modulo SAL — Stato Avanzamento Lavori (Scenario 3 — Camellini)
**Riferimento**: `Check List Audit/CLIENTE - SAL documentale iso 14001 - 9001 - 45001.docx`
**Struttura**: tabella requisiti × stati (Discusso / In corso / Da validare / Completato)
**Colori**: ogni standard ha un colore (nero=tutti, rosso=45001, verde=14001, blu=9001)

```
DB: aggiungere document_type IN ('audit', 'sal', 'rdp') in tabella audits
UI: nuovo componente SALModule.jsx con tabella tracker
Word: template SAL separato con legenda colori
```

#### Modulo RDP — Rapporto di Prova (Scenario 4 — Mason)
**Riferimento**: `Check List Audit/RDP_MSN-260127-01_REV_0.docx`
**Struttura**: sezioni con prove tecniche, misure, fotografie obbligatorie, valutazione risultato
**Differenza chiave**: foto NON opzionali, struttura per prova (non per clausola ISO)

```
DB: tabella rdp_sections, rdp_tests (test_name, expected_value, measured_value, result)
UI: nuovo componente RDPModule.jsx con form prove + EvidenceManager obbligatorio
Word: template RDP con tabelle prove e galleria foto embedded
```

> ⚠️ **Prerequisito bloccante**: Il modulo RDP richiede foto embedded nel Word.
> Il codice di embedding (xmlImageOoxml) è stato disabilitato il 08/03/2026 per bug OOXML
> (pic:cNvPr id duplicati → documento corrotto in Word).
> **Da risolvere prima di sviluppare RDP**:
> - Fix `xmlImageOoxml`: id univoci per ogni immagine (imgId su pic:cNvPr, non 0)
> - Test end-to-end con allegati immagine reali su produzione
> - Poi riabilitare `usePreview` in `wordExportHelpers.js` e `preloadImagesIntoAudit` in `wordExport.js`
> - Stima fix: 2-3 ore (codice già scritto, solo bug da correggere + test)

#### Struttura `document_type` in `audits`
```sql
ALTER TABLE audits ADD document_type NVARCHAR(20) NOT NULL DEFAULT 'audit'
  CONSTRAINT CK_audits_doc_type CHECK (document_type IN ('audit', 'sal', 'rdp'));
-- Migration graduale: tutti gli audit esistenti rimangono 'audit'
```

---

### Fase 1 — Fondamenta Multi-Tenant e RBAC (6-8 settimane)

**Obiettivo**: struttura dati e autorizzazioni per supportare auditor multipli con i loro clienti.

#### Nuove tabelle DB
```sql
-- Organizzazioni gerarchiche
auditor_orgs (id, name, email, subscription_plan, is_active, created_at)
  FK: organizations.organization_id (parent = QS Studio)

-- Aziende auditate (clienti degli auditor)
companies (id, auditor_org_id FK, name, vat_number, sector, address, is_active)
  Sostituisce: audits.client_name (stringa libera → FK companies.id)

-- Ruoli per utente per organizzazione
user_org_roles (user_id FK, org_id FK, role: superadmin|admin|auditor|viewer)

-- Abbonamenti per standard
subscriptions (auditor_org_id FK, standard_id FK, plan, valid_from, valid_to, is_active)
```

#### Modifiche tabelle esistenti
```sql
ALTER TABLE audits ADD company_id INT FK companies(id);
  -- client_name rimane per retrocompatibilita, company_id nullable inizialmente
ALTER TABLE users ADD auditor_org_id INT FK auditor_orgs(id);
```

#### Backend
- Middleware RBAC: ogni route verifica ruolo + appartenenza org
- Tenant isolation: ogni query filtra su `auditor_org_id` (non solo `organization_id`)
- Endpoint nuovi: CRUD `companies`, CRUD `auditor_orgs`, gestione `subscriptions`

#### Frontend
- Pagina Anagrafica Aziende (crea / cerca / seleziona)
- Pagina Admin QS Studio: gestione auditor e abbonamenti
- Collegamento audit → azienda al posto del campo testo libero

---

### Fase 2 — UI a Tab per Standard + Feature Flags (6-8 settimane)

**Obiettivo**: layout a tab scalabile, ogni standard come modulo indipendente.

#### Struttura UI proposta
```
[Anagrafica Azienda] [ISO 9001] [ISO 14001] [ISO 45001] [Checklist Libera*]
                         |           |            |
                    re-audit    re-audit      (disabilitata
                    + stampa    + stampa      se no abbonamento)

* visibile solo se abbonamento "Checklist Libera" attivo
```

#### Feature flag
```javascript
// Ogni tab controlla:
const canAccessISO14001 = subscription.includes('ISO_14001') || user.role === 'superadmin';
const canAccessFreeChecklist = subscription.includes('FREE_CHECKLIST') || user.role === 'superadmin';
```

#### Principio Dark Launch
- Durante sviluppo: tab visibile solo a `role === 'superadmin'`
- Dopo collaudo: abilitata per gli auditor con abbonamento
- Mai breaking change per gli auditor attivi

---

### Fase 3 — Sistema Licenze e Abbonamenti (3-4 settimane)

**Obiettivo**: pannello admin QS Studio per gestire chi ha accesso a cosa.

- Dashboard admin: lista auditor, stato abbonamenti, scadenze
- Attivazione/disattivazione standard per auditor
- Notifica automatica scadenza abbonamento
- Log accessi per fatturazione

---

### Fase 4 — Checklist Libera e Gap Analysis (6-8 settimane)

**Obiettivo**: domande personalizzate + motore di conformita query-based.

#### Checklist Libera
```sql
custom_checklists (id, auditor_org_id FK, name, description, is_active)
custom_questions  (id, checklist_id FK, question_text, expected_answer, weight, order)
```
- Builder UI: aggiungi domande una per volta, riordina, assegna peso
- Stesse logiche di risposta (C/NC/OSS/OM/NA/NV)
- Export Word parametrizzato anche per checklist libere

#### Gap Analysis
- Query SQL: confronto risposte vs requisiti attesi per clausola
- Report: clausole non conformi con percentuale gap, trend temporale
- Piano d'azione generato automaticamente da NC e OSS aperti
- Nota: SQL Server con colonne JSON e full-text search e sufficiente — no cambio DB

---

### Fase 5 — Workflow Implementazione SGQ (8-12 settimane)

**Obiettivo**: supportare un'azienda che vuole implementare (non solo auditare) un SGQ.

- Piano d'azione post-audit: task assegnabili con scadenza e responsabile
- Tracciamento avanzamento per clausola
- Dashboard progresso implementazione
- Notifiche milestone e scadenze

---

## Note Architetturali Permanenti

| Decisione | Motivazione |
|---|---|
| `fetchAttachmentBlob()` non img src | Browser non invia Authorization header cross-origin su :8443 |
| conformity_status trigger: NC/OSS/NV | OM escluso: e osservazione minore, non rilievo persistente |
| section_code non clause_number | Colonna reale in checklist_questions |
| Backend su systemd | Restart: `systemctl restart sgq-backend` — NON fuser da solo |
| Dark launch per nuove feature | Auditor ricevono feature solo quando collaudate — zero interruzioni |
| client_name → company_id FK (Fase 1) | Retrocompatibilita: campo nullable, migrazione graduale |
| SQL Server sufficiente per gap analysis | JSON columns + full-text search — no cambio tecnologia DB |
| **Stili Word in italiano** | Template usa Titolo1/Titolo2 — NON Heading1/Heading2 (Word italiano) |
| **Margini Word via JS** | Regex su sectPr in injectOoxmlMarkers — evita manipolazione binaria .docx |
| **document_type in audits** | Campo per distinguere audit/SAL/RDP — retrocompatibile (default='audit') |
| **Audit Scenario 2 (terza parte)** | Gestito con clauseRef + campo note — no checklist per ogni committente |
| **norm_excerpt in checklist_questions** | Stralcio norma per ogni clausola — appare nel report Word sotto la valutazione |

---

**Ultimo Aggiornamento**: 08 marzo 2026
**Prossimo Step**: ISO 14001 checklist completa da norma PDF (task 0.2)
