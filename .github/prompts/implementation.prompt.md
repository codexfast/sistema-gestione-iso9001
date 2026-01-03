---
agent: "agent"
model: "Grok Code Fast 1"
tools: ["readFile", "fileSearch", "editFiles", "runInTerminal", "test"]
description: "Handoff implementazione dal Planner"
---

## CONTEXT

- Stack: React (web), backend Node/Express, SQL Server, offline IndexedDB.
- API base:
  - dev: `${API_BASE_DEV}` # es. http://localhost:10443/api/v1
  - prod: `${API_BASE_PROD}` # es. https://<host>:10443/api/v1
- Multi-tenant: isolamento su `organization_id`; master data checklist read-only.
- Istruzioni: `.github/instructions/style.instructions.md`.

## PLAN (dal Planner)

- [Incolla qui i passi 1..N con file/aree impattate e criteri di accettazione]

## CONSTRAINTS

- No nuove dipendenze senza ADR del Planner.
- Preserva offline-first & sync policy (timestamp-based).
- Conformità OpenAPI (`backend/openapi.yaml`); compatibilità metriche (NC/OSS/OM) ed export (JSON/Word).

## PROCEDURE

1. Genera piano di editing (file+modifiche).
2. Applica edit minimi; esegui lint/test.
3. Itera sui fallimenti con fix mirati.
4. Consegna: **diff completo**, **test summary**, **rollback note**.
