# Indice e convenzioni documentazione

> Punto di ingresso per capire dove si trova cosa. Aggiornato: 2026-03-15.

---

## Dove trovare cosa

| Scopo | File | Note |
|-------|------|------|
| **Contesto progetto (AI / onboarding)** | [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) (root) | Stack, infra, workflow deploy, regole operative |
| **Roadmap e stato** | [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) | Fasi, backlog, stato avanzamento |
| **Sessione corrente** | [sessions/SESSION_NOTES_20260308.md](sessions/SESSION_NOTES_20260308.md) | Ultimo checkpoint; usare il più recente in `sessions/SESSION_NOTES_*.md` |
| **Schema DB** | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Leggere prima di modificare il DB |
| **Quick-ref DB e API** | [DATABASE.md](DATABASE.md), [BACKEND_API.md](BACKEND_API.md) | Riferimento rapido (spostati da root) |
| **Deploy Netlify** | [NETLIFY_DEPLOYMENT.md](NETLIFY_DEPLOYMENT.md) | Build, deploy, convenzioni Git |
| **Checklist deploy release** | [DEPLOY_CHECKLIST_RELEASE.md](DEPLOY_CHECKLIST_RELEASE.md) | Passi per release (build, backend VPS, push, smoke test) |
| **Perdita connessione (offline/mobile)** | [GESTIONE_PERDITA_CONNESSIONE.md](GESTIONE_PERDITA_CONNESSIONE.md) | Comportamento offline, sync, health check, mobile |
| **Utenti, checklist, sistemi, report** | [SCHEMA_UTENTI_CHECKLIST_SISTEMI_REPORT.md](SCHEMA_UTENTI_CHECKLIST_SISTEMI_REPORT.md) | Organization/user, ruoli, checklist ISO e custom, template report, self-assessment |
| **Decisioni architetturali** | [adr/README.md](adr/README.md) | Indice ADR; dettaglio in `adr/ADR-*.md` |
| **Manuali** | [MANUALE_UTENTE.md](MANUALE_UTENTE.md), [MANUALE_OPERATIVO_FASE1.md](MANUALE_OPERATIVO_FASE1.md) | Uso applicazione e procedure |
| **Riferimenti tecnici** | [REFERENCE.md](REFERENCE.md), [DATABASE_MAPPING.md](DATABASE_MAPPING.md) | Mapping, sync, dettagli |
| **Storico / archive** | [archive/](archive/) | CLEANUP_ROADMAP, ROADMAP_RESET_COMPLETO (doc storici) |

---

## Convenzione: istruzioni e workflow

Le **regole operative** e il **workflow deploy** (incluso “commit + push per Netlify”) stanno in **PROJECT_CONTEXT.md**, sezione *Workflow deploy* e *Regole operative critiche*.  
Non creare file dedicati solo a una regola: aggiungere a PROJECT_CONTEXT o a un .md di ambito già esistente (es. NETLIFY_DEPLOYMENT per il deploy).

---

## Proposta riorganizzazione (opzionale)

Se in futuro si vuole riordinare la documentazione, una struttura possibile è:

### 1. Root: solo ingressi essenziali
- **PROJECT_CONTEXT.md** — contesto progetto, stack, workflow, regole (resta il principale per AI/sviluppatori)
- **README.md** — descrizione repo, come avviare app/backend (se presente)
- Eventuali **COMMIT_MESSAGES.md** / **CURSOR_HANDOFF.md** come riferimenti operativi

### 2. docs/: tutto il resto
- **PROJECT_ROADMAP.md**, **DATABASE_SCHEMA.md**, **NETLIFY_DEPLOYMENT.md** — già in docs/
- **SESSION_NOTES_*.md** — in `docs/sessions/` (riorganizzazione applicata)
- **adr/** — già ordinata; da aggiornare solo l’indice in `adr/README.md` (vedi sotto)
- **Normative/** — documenti normativi (resta com’è)

### 3. ADR: numerazione univoca
- Oggi ci sono **due ADR-002** (offline-first-sync, checklist-alignment-strategy) e **tre ADR-003** (bidirectional-sync, database-architecture, pwa-mobile-android).
- Proposta: rinumerare in sequenza univoca (ADR-002, ADR-003, …) e aggiornare **solo** `docs/adr/README.md` con la tabella aggiornata e i link ai file (i nomi file possono restare per storia, oppure rinominare in `ADR-NNN-titolo-kebab-case.md`).
- Non è obbligatorio farlo subito: si può fare in un unico passaggio quando si tocca la documentazione ADR.

### 4. Riduzione duplicati
- **CLEANUP_ROADMAP.md**, **ROADMAP_RESET_COMPLETO.md**: valutare se unificarli con **PROJECT_ROADMAP.md** (o marcare come “storico” e tenere un solo roadmap attivo).
- **COMMIT_MESSAGES.md**: è di sessione; si può spostare in `docs/sessions/` o rinominare con data (es. `COMMIT_MESSAGES_20260208.md`) e citare da SESSION_NOTES.

---

**Riorganizzazione applicata**: session notes e COMMIT_MESSAGES in `docs/sessions/`; CLEANUP e ROADMAP_RESET in `docs/archive/`; DATABASE e BACKEND_API in `docs/`; indice ADR completo in `adr/README.md`.

Riepilogo: **sì, ha senso riorganizzare in modo organico** (meno file in root, indice chiaro, ADR con numeri univoci). Si può fare in modo incrementale; questo file serve da indice e da traccia per la riorganizzazione futura.
