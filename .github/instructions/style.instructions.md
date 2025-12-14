---
description: "Standard SGQ ISO – Stile, architettura, librerie e Qualità "
applyTo: "**/*"
---

# Stile & Linguaggi

- JavaScript/React (ES2020+). Se usi TypeScript, abilita `strict` e vieta `any` impliciti.
- ESLint + Prettier obbligatori; vietate variabili non usate e `console.log` residui.
- Nomenclatura: `PascalCase` per componenti React, `camelCase` per funzioni/variabili.

# Librerie (vincoli)

- HTTP: **Axios@^1.7** con interceptor per auth e gestione errori (vietato `fetch` diretto salvo polyfill: **razionale** – per garantire gestione centralizzata degli errori e standardizzazione delle chiamate API).
- Stato: preferisci React hooks/local state; evita global state non necessario.
- Export/report: usa **docx** già presente; mantieni mappature etichette IT.
- DB: **SQL Server** solo via API backend; accesso diretto dal frontend **vietato**.

# Architettura (layering)

- Strati: `api` → `services` → `domain` → `ui`.
- Multi-tenant: isolamento su `organization_id` per audit/risposte; **master data** (standards/sections/questions) condivisi e **read-only**.
  - Ogni API/controller deve validare lato server che l’utente possa accedere solo ai dati della propria organizzazione (`organization_id`), per prevenire accessi non autorizzati (requisito obbligatorio ISO 9001:2015 sicurezza delle informazioni documentate).
  - Campi critici (stato audit, risposte definitive): **server-wins**.
    - In caso di sovrascrittura delle modifiche locali da parte del server, è obbligatorio:
      - Notificare l'utente che le modifiche locali sono state scartate (es. banner, dialog, toast).
      - Conservare informazioni documentate (log) dei dati sovrascritti per tracciabilità e audit, in conformità ai punti 7.5, 9.2 e 10.2 della UNI EN ISO 9001:2015.
  - Campi non critici (note/evidenze): **merge**.

# Testing & Qualità 

- Test unit/integration su utilities/metriche/servizi; copertura **≥80%**.
- Ogni modifica agent deve eseguire lint+test; in output fornire **diff** e **rationale**.
- PR gate: build CI obbligatoria (lint, test) prima del merge.

# Sicurezza

- Vietate credenziali hardcodate: usare `.env` + secrets del sistema CI/CD.
- JWT gestiti in `apiService` con refresh token; **memorizzati lato client solo via cookie httpOnly** (mai in `localStorage`/`sessionStorage`). Se i cookie httpOnly non fossero possibili, documentare mitigazioni XSS/CSRF e la motivazione. **JWT non persistenti in repo**.
- Validazione input server-side (controllers) + rate limit dove necessario.

# Performance

- Evita re-render inutili; usa `useMemo`/`useCallback` dove serve.
- Batch delle risposte; retry con backoff nel SyncService.


