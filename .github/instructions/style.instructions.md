---
description: "Standard SGQ ISO – Stile, architettura, librerie e Qualità"
applyTo: "**/*"
---

# Runtime & Toolchain

- Node.js **20.x** obbligatorio; package manager: **npm@^10** (unico, lockfile commit).
- CI: usa la stessa versione Node del runtime (matrix bloccata).

# Stile & Linguaggi

- Frontend: React (ES2020+ / TS `strict` — vietati `any` impliciti).
- ESLint + Prettier obbligatori; vietati `console.log` e var non usate.
- Naming: `PascalCase` per componenti, `camelCase` per funzioni/variabili.

# Librerie (vincoli)

- HTTP: **Axios@^1.7** con interceptor (vietato `fetch` diretto salvo polyfill motivato).
- Stato: preferire hook/local state; no global state non necessario.
- Export/report: **docx** esistente; mappe etichette IT consolidate.
- DB: **SQL Server** solo via backend API; no accesso diretto dal FE.

# Architettura (layering)

- `api` → `services` → `domain` → `ui`.
- Multi-tenant: isolamento su `organization_id`; **master data** (standards/sections/questions) **read‑only**.
- OpenAPI: ogni controller deve rispettare `backend/openapi.yaml` (con test di schema).
- Offline-first: **server-wins** su campi critici (stato audit/firme/esiti), **merge** su note/evidenze.
  - Overwrite: **notifica utente** + **log** persistente (tracciabilità 7.5/9.2/10.2 ISO 9001).

# Sicurezza

- Nessuna credenziale in repo; `.env` + secrets CI/CD.
- JWT via **cookie httpOnly**; su PWA:
  - Cookie `SameSite=None; Secure`, CORS `Access-Control-Allow-Credentials: true`, client `withCredentials`.
  - Se non praticabile, documentare mitigazioni XSS/CSRF e motivazione.
- Rate limit & validation server-side (Zod/JOI) su tutte le route mutate.

# Performance

- Evitare re-render superflui (`useMemo`/`useCallback` mirati).
- SyncService: batch + retry con backoff.

# Qualità & CI

- Coverage target **≥80%** su unit/integration.
- CI gates obbligatori: `lint`, `unit`, `integration`, `openapi-validate`.
- Output agent: **diff** minimale + rollback note.
- **ADR obbligatori** per: nuove dipendenze, cambi architetturali, breaking changes.
  - Path: `/docs/adr/` — template: `docs/adr/template.md`
  - Vedere: [ADR-001 Multi-Agent Workflow](../../docs/adr/ADR-001-multi-agent-workflow.md)
