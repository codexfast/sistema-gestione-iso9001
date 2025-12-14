# ADR-NNN: [Titolo Decisione]

---

**Stato**: Proposto | Accettato | Superato | Deprecato  
**Data**: AAAA-MM-GG  
**Autore**: [Nome Agent o Team]  
**Revisore**: [Reviewer Agent]  
**Tag**: architettura | sicurezza | performance | qualità

---

## Contesto e Problema

Descrivere il problema o l'opportunità che richiede una decisione architetturale.

**Domande da rispondere**:

- Qual è il requisito funzionale o non-funzionale?
- Quali vincoli esistono (tecnici, normativi ISO 9001, budget)?
- Perché l'architettura attuale non è sufficiente?

**Riferimenti ISO 9001:2015**:

- Punto 4.1: Contesto dell'organizzazione
- Punto 6.1: Azioni per affrontare rischi e opportunità

---

## Decisione

**[Breve sintesi della scelta architetturale]**

### Dettaglio Tecnico

Descrivere la soluzione adottata con dettagli implementativi:

- Tecnologie/librerie coinvolte
- Pattern architetturali applicati
- Configurazioni richieste
- Esempio codice (se applicabile)

```javascript
// Esempio implementativo
```

### Alternative Valutate

| Alternativa | Pro | Contro | Motivo Scarto |
| ----------- | --- | ------ | ------------- |
| Opzione A   | ... | ...    | ...           |
| Opzione B   | ... | ...    | ...           |

---

## Conseguenze

### Impatti Positivi ✅

- **Performance**: Miglioramento stimato X%
- **Manutenibilità**: Riduzione complessità modulo Y
- **Sicurezza**: Conformità a [standard security]

### Impatti Negativi ⚠️

- **Costo Migrazione**: N ore sviluppo
- **Breaking Changes**: Moduli da aggiornare
- **Learning Curve**: Formazione team su [tecnologia]

### Conformità ISO 9001:2015

- **Punto 7.1.6 (Conoscenza organizzativa)**: Documentare know-how tecnico acquisito
- **Punto 8.1 (Pianificazione operativa)**: Impatti su processi esistenti
- **Punto 10.3 (Miglioramento continuo)**: Allineamento con obiettivi qualità

---

## Rischi e Mitigazioni

| Rischio               | Probabilità | Impatto | Mitigazione                    | Responsabile      |
| --------------------- | ----------- | ------- | ------------------------------ | ----------------- |
| Incompatibilità con X | Media       | Alto    | Test regression suite          | Implementer Agent |
| Vendor lock-in        | Bassa       | Medio   | Astrazione con adapter pattern | Planner Agent     |

**Risk-Based Thinking (ISO 9001:2015 punto 6.1)**:

- Azioni preventive pianificate: [...]
- Monitoring indicatori: [...]

---

## Implementazione

### Checklist Attuazione

- [ ] Creare branch `feat/adr-NNN-[titolo]`
- [ ] Implementare modifiche core
- [ ] Aggiornare test (coverage ≥80%)
- [ ] Verificare conformità OpenAPI (`backend/openapi.yaml`)
- [ ] Eseguire `npm run lint` e `npm test`
- [ ] Code review da Reviewer Agent
- [ ] Merge su `main` + tag release

### File Impattati

```
src/
├── services/
│   └── [modulo-modificato].js
├── controllers/
│   └── [controller-aggiornato].js
tests/
└── [nuovi-test].spec.js
```

### Acceptance Criteria

1. **Funzionale**: [Criterio misurabile]
2. **Performance**: [Benchmark target]
3. **Sicurezza**: [Requisito conformità]
4. **Qualità**: Test coverage ≥80%, zero warning ESLint

---

## Note Aggiuntive

- **Documentazione Esterna**: [Link ISO docs, librerie, RFC]
- **Discussioni**: [Link issue/PR GitHub]
- **Dipendenze**: Prerequisiti ADR-XXX

---

## Changelog

| Data       | Modifica      | Autore |
| ---------- | ------------- | ------ |
| AAAA-MM-GG | Creazione ADR | [Nome] |

---

**Approvazione**:

- ✅ Planner Agent: [Data]
- ✅ Reviewer Agent: [Data]
- ✅ Tech Lead: [Data]
