# Roadmap — Sistema Gestione ISO 9001 / SaaS Multi-Tenant

> **Data Inizio**: 13 gennaio 2026
> **Ultimo Aggiornamento**: 03 marzo 2026
> **Prossimo Step**: Chiusura bug minori (Fase 0) → Progettazione DB Fase 1
> **Riferimenti**: `CURSOR_HANDOFF.md` (stato sessione) | `docs/DATABASE_SCHEMA.md` (schema DB)

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

## Stato Avanzamento al 03/03/2026

| Area | Descrizione | Status |
|---|---|---|
| DB migrations 001-018 | Schema base, checklist, allegati, pending_issues | Completato |
| Auth / JWT | Cookie httpOnly, CORS, authenticateDownload | Completato |
| Checklist ISO 9001 | 35 domande da DB, 6 stati C/NC/OSS/OM/NA/NV | Completato |
| Checklist ISO 14001 | 46 domande da DB, sezioni 14001_s4/14001_s5 | Completato |
| Audit CRUD | Crea, modifica, elimina, lista, statistiche | Completato |
| Sync offline-first | IndexedDB + server-wins + retry/backoff | Completato |
| Allegati | Upload, preview blob, replace desktop, delete | Completato |
| Rilievi pendenti | PendingIssuesCascade + pending_issues table | Completato |
| Re-audit | checkReaudit endpoint + AuditSelector | Completato |
| Export Word ISO 9001 | Template-based con docxtemplater + pizzip | Completato |
| Multi-standard UI | Tab ISO 9001 + ISO 14001, fix 4 bug 9894ed5 | Completato |
| Fix sync multi-standard | standard_ids array, auditConverter, checkbox | Completato (6317215) |
| **Export Word ISO 14001** | Sezione 46 domande nel report | In backlog |
| **Rilievi pendenti in Word** | RILIEVI_MARKER con dati reali | In backlog |
| **Fix Auth Mobile ADR-004** | localStorage JWT per Android PWA | In backlog |
| **Bug: rilievi caricamento** | PendingIssuesCascade timing/auth issue | Da verificare |
| **Bug: checklist vuota reload** | fetchAndApplyServerResponses post-fix | Da verificare |

**Progress Overall**: ~68% funzionalita core

---

## Roadmap per Fasi

### Fase 0 — Chiusura bug minori (1-2 settimane) — PROSSIMA

| # | Task | File | Note |
|---|---|---|---|
| 0.1 | Bug rilievi pendenti errore caricamento | `PendingIssuesCascade.jsx` | Timing o auth token non disponibile al mount |
| 0.2 | Bug checklist vuota dopo reload | `StorageContext.jsx`, `fetchAndApplyServerResponses` | Verificare dopo primo sync con nuovo backend |
| 0.3 | Fix Auth Mobile (ADR-004) | `auth.controller.js`, `apiService.js`, `AuthContext.jsx` | localStorage JWT — prerequisito per mobile |
| 0.4 | Export Word ISO 14001 | `wordExport.js`, `wordExportHelpers.js` | 46 domande sezione ISO 14001 |
| 0.5 | Rilievi pendenti reali in Word | `wordExport.js` | RILIEVI_MARKER → GET /audits/:id/pending-issues |

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

---

**Ultimo Aggiornamento**: 03 marzo 2026
**Prossimo Review**: dopo chiusura Fase 0 (bug minori)
