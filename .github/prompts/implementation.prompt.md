---
agent: "agent"
model: "Grok Code Fast 1"
tools: ["readFile", "fileSearch", "editFiles", "runInTerminal", "test"]
description: "Handoff implementazione dal Planner"
---

## CONTEXT

- Stack: React (web), backend Node/Express, SQL Server, offline IndexedDB.
- API base: dev `http://localhost:10443/api/v1`, prod `https://www.fr-busato.it:10443/api/v1`.
- Multi-tenant: isolamento su `organization_id`; master data checklist read-only.
- Istruzioni: vedi `.github/instructions/style.instructions.md`.

## PLAN (dal Planner)

- [Incolla qui i passi 1..N con file/aree impattate e criteri di accettazione]

## CONSTRAINTS

- No nuove dipendenze senza consenso.
- Preserva offline-first e sync policy (timestamp-based).
- Mantieni compatibilità con metriche (NC/OSS/OM) e export (JSON/Word).

## PROCEDURE

1. Genera piano di editing (file+modifiche).
2. Applica edit minimal, esegui `test`/lint.
3. Itera sui fallimenti con fix mirati.
4. Consegna: **diff completo**, **test summary**, **rollback note**.
