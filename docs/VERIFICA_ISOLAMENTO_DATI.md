# Verifica isolamento dati (compartimenti stagni)

Ogni utente accede **solo** ai dati della propria organizzazione; gli auditor (con `auditor_org_id`) vedono in più solo gli audit delle aziende del proprio studio o i propri audit senza azienda assegnata.

---

## 1. Audit

| Endpoint | Isolamento |
|----------|------------|
| **GET /audits** | `WHERE organization_id = @organization_id`. Se auditor: solo audit con `company_id` nelle aziende del proprio `auditor_org_id` **oppure** `company_id IS NULL` e `created_by = user_id`. |
| **GET /audits/:id** | Stesso filtro: audit deve appartenere all’org e (se auditor) a una company dello studio o essere proprio audit senza company. |
| **POST /audits** | `organization_id` e `created_by` da `req.user`. |
| **PUT /audits/:id** | `WHERE audit_id = @id AND organization_id = @organization_id`. |
| **DELETE /audits/:id** | Idem. |
| **POST /audits/sync** | Upsert solo se `audit_uuid` + `organization_id` corrispondono; INSERT con `organization_id` e `user_id` da `req.user`. |
| **GET /audits/:id/statistics** | Verifica audit con `organization_id`. |
| **GET /audits/:id/pending-issues** | Query su audit con `organization_id`. |
| **POST /audits/check-reaudit** | Filtro per `organization_id`. |
| **POST /audits/:id/bulk-responses** | In `audit.controller`: verifica audit con `organization_id` (e ownership) prima di salvare. |

---

## 2. Risposte checklist (audit_responses)

| Endpoint | Isolamento |
|----------|------------|
| **GET /audits/:auditId/responses** | Verifica che l’audit sia `audit_id` + `organization_id` dell’utente prima di restituire le risposte. |
| **POST /audits/:auditId/responses** | Idem. |
| **POST /audits/:auditId/responses/bulk** | Lookup audit per UUID o ID sempre con `organization_id`; nessuna scrittura senza ownership. |
| **DELETE /audits/:auditId/responses/:responseId** | Verifica ownership audit. |

---

## 3. Allegati

| Endpoint | Isolamento |
|----------|------------|
| **GET /attachments** | Filtro per audit (o NC) con `organization_id`. |
| **GET /attachments/:id** | Join con `audits`: accesso solo se `a.organization_id = @organization_id` (o NC collegato ad audit dell’org). |
| **POST /attachments/upload** | Audit (o NC) deve esistere e appartenere a `organization_id`. |
| **GET …/download**, **view**, **DELETE**, **PUT** | Stesso controllo su audit/NC tramite `organization_id`. |

---

## 4. Non conformità (NC)

| Endpoint | Isolamento |
|----------|------------|
| **GET /nc** | Join con `audits`: `a.organization_id = @organization_id`. |
| **GET /nc/:id**, **POST /nc**, **PUT /nc/:id**, **DELETE /nc/:id** | Tutti tramite audit: `WHERE … AND a.organization_id = @organization_id`. |

---

## 5. Admin (utenti e standard)

| Endpoint | Isolamento |
|----------|------------|
| **GET /admin/users** | `WHERE u.organization_id = @organization_id`: solo utenti della stessa organizzazione. |
| **PUT /admin/users/:id/standards** | Verifica che l’utente target abbia `organization_id = @organization_id` prima di aggiornare `user_standards`. |

---

## 6. Altri contesti

- **Companies**: filtrate per `auditor_org_id` (auditor vede solo le aziende del proprio studio; superadmin può scegliere org).
- **Auditor-orgs**: lista per `organization_id`; dettaglio per id solo se è il proprio `auditor_org_id` o superadmin.
- **Certification findings**: sempre con `company_id` + `organization_id`.
- **Sync (POST /sync/audits)**: creazione/aggiornamento audit con `organization_id` e `user_id` da `req.user`.
- **Checklist (domande/sezioni)**: dati master globali (stesse domande per tutte le org); modifica stralci solo con ruolo admin/superadmin.

---

## 7. Ruoli

- **Admin senza auditor_org_id (superadmin)**: vede tutti gli audit dell’organizzazione (nessun filtro su company).
- **Admin con auditor_org_id / Auditor**: vedono solo audit con company del proprio studio **o** audit senza company creati da loro (`created_by = user_id`).
- **Viewer**: stessi filtri degli auditor (se applicabili), in sola lettura.

---

*Verifica effettuata sui controller backend; correzione applicata per audit con `company_id` NULL visibili solo al creatore (auditor).*
