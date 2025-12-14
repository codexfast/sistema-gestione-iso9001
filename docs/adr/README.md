# Architecture Decision Records (ADR)

## Cos'è un ADR?

Un **Architecture Decision Record** documenta decisioni architetturali significative prese durante lo sviluppo del progetto, seguendo il principio di tracciabilità richiesto dalla **ISO 9001:2015 punto 7.5** (Informazioni documentate).

## Struttura ADR

Ogni ADR segue il template standard:

- **Stato**: Proposto | Accettato | Superato | Deprecato
- **Contesto**: Problema o opportunità
- **Decisione**: Scelta architetturale
- **Conseguenze**: Impatti (positivi e negativi)
- **Rischi & Mitigazioni**: Analisi rischi (ISO 9001:2015 punto 6.1)

## Processo Approvazione

1. **Planner Agent** redige ADR in `/docs/adr/`
2. **Reviewer Agent** valuta coerenza con style.instructions.md
3. **Commit ADR** → diventa vincolante per Implementer Agent

## Indice ADR

| ID                                           | Titolo                                 | Stato     | Data       |
| -------------------------------------------- | -------------------------------------- | --------- | ---------- |
| [ADR-001](./ADR-001-multi-agent-workflow.md) | Multi-Agent Workflow con Tool Approval | Accettato | 2025-12-14 |

## Convenzioni

- **Naming**: `ADR-NNN-titolo-kebab-case.md`
- **Numerazione**: Sequenziale, mai riutilizzare numeri
- **Lingua**: Italiano (terminologia ISO 9001:2015 conforme UNI)
- **Formato**: Markdown con frontmatter YAML

## Riferimenti

- **ISO 9001:2015 punto 7.5**: Informazioni documentate
- **ISO 9001:2015 punto 6.1**: Azioni per affrontare rischi e opportunità
