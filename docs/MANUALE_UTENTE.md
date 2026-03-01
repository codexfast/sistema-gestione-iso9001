# Manuale Utente – Sistema SGQ ISO 9001
**QS Studio** | PWA Gestione Audit ISO 9001 / 14001 / 45001  
Versione documento: `1.1` — aggiornato al 01/03/2026 (commit `9894ed5`)

---

## Indice

1. [Accesso alla piattaforma](#1-accesso-alla-piattaforma)
2. [Dashboard principale](#2-dashboard-principale)
3. [Creare un nuovo Audit](#3-creare-un-nuovo-audit)
4. [Re-Audit (stessa azienda)](#4-re-audit-stessa-azienda)
5. [Navigazione Audit – Accordion](#5-navigazione-audit--accordion)
6. [1 – Dati Generali](#6-1--dati-generali)
   - [1.1 Informazioni di base](#61-informazioni-di-base)
   - [1.2 Obiettivo dell'Audit](#62-obiettivo-dellaudit)
   - [1.3 Rilievi Pendenti](#63-rilievi-pendenti)
7. [Checklist – Compilazione](#7-checklist--compilazione)
   - [ISO 9001:2015](#71-iso-90012015)
   - [ISO 14001:2015](#72-iso-140012015)
8. [Esito Audit](#8-esito-audit)
9. [Export Report Word](#9-export-report-word)
10. [Funzionamento Offline](#10-funzionamento-offline)
11. [Limitazioni note e backlog](#11-limitazioni-note-e-backlog)
12. [Changelog funzionalità](#12-changelog-funzionalità)

---

## 1. Accesso alla piattaforma

**URL**: `https://sgq-qsstudio.netlify.app` (o URL Netlify assegnato)

- Inserire **email** e **password** aziendali
- Il sistema utilizza un cookie JWT `httpOnly`; la sessione dura fino al logout esplicito
- In caso di sessione scaduta, viene reindirizzato automaticamente al login

---

## 2. Dashboard principale

Dopo il login viene mostrata la **Dashboard**, composta da:

| Elemento | Funzione |
|---|---|
| Dropdown *Audit Corrente* | Seleziona l'audit attivo tra quelli salvati |
| Pulsante **➕ Nuovo** | Apre il modal per creare un audit (disabilitato se un audit è già aperto) |
| Pulsante **🔄 Re-Audit** | Apre il modal re-audit per la stessa azienda dell'audit corrente (disabilitato se nessun audit è aperto) |
| Barra info audit | Mostra norme selezionate (badge colorati), % completamento |
| Indicatore 💾 | Apparisce durante il salvataggio automatico |

> **Nota tecnica**: gli audit sono caricati da IndexedDB locale; se online, vengono sincronizzati con il server in background.

---

## 3. Creare un nuovo Audit

1. Cliccare **➕ Nuovo** nella barra selettore
2. Compilare il form:

| Campo | Obbligatorio | Note |
|---|---|---|
| Numero Audit | — | Generato automaticamente (`YYYY-NNN`) |
| Nome Cliente | ✅ | Min 3 caratteri → verifica rilievi pendenti automatica |
| Data Audit | ✅ | Default: oggi |
| Nome Auditor | ✅ | — |
| Norme ISO | ✅ | Almeno una. Pre-selezionate: ISO 9001 |

3. **Selezione norme**: checkbox multiplo — selezionare tutte le norme applicabili all'audit:
   - ☑ **ISO 9001:2015** – Sistema Gestione Qualità (default selezionato)
   - ☐ **ISO 14001:2015** – Sistema Gestione Ambientale
   - ☐ **ISO 45001:2018** – Sistema Gestione Salute e Sicurezza

4. Se il cliente ha **rilievi pendenti** da audit precedenti, appare un riquadro arancione con l'elenco dei NC/OSS non risolti. Questi vengono automaticamente trasferiti nella sezione "1.3 Rilievi Pendenti" del nuovo audit.

5. Cliccare **Crea Audit** → l'audit viene creato in IndexedDB e sincronizzato con il server se online.

> **Verifica codice** (`AuditSelector.jsx`): `formData.norms` viene mappato a `selectedStandards` prima della creazione, garantendo che le norme scelte vengano salvate correttamente.

---

## 4. Re-Audit (stessa azienda)

1. Selezionare l'audit precedente dell'azienda dal dropdown
2. Cliccare **🔄 Re-Audit**
3. Il modal si apre con il nome cliente pre-compilato e mostra automaticamente i **rilievi pendenti** (NC, OSS, OM aperti) dall'ultimo audit completato
4. Compilare Data Audit e Auditor, confermare le norme, cliccare **Crea Audit**
5. Il nuovo audit eredita i rilievi pendenti nella sezione **1.3 Rilievi Pendenti**

---

## 5. Navigazione Audit – Accordion

L'audit è organizzato in 4 sezioni principali collassabili:

```
📋 1 – DATI GENERALI
  ▶ 1.1 Informazioni di base
  ▶ 1.2 Obiettivo dell'Audit
  ▶ 1.3 Rilievi Pendenti
✅ Checklist
  ▶ [ISO 9001:2015 - Qualità]     (se norma selezionata)
  ▶ [ISO 14001:2015 - Ambiente]   (se norma selezionata)
  ▶ [ISO 45001:2018 - Sicurezza]  (se norma selezionata)
📊 Esito Audit
📤 Export Report
```

- Cliccare l'intestazione di una sezione per espanderla/collassarla
- Le sotto-sezioni Checklist mostrano **solo le norme selezionate** per quell'audit
- Se nessuna norma è selezionata, appare un messaggio guida verso *Dati Generali → 1.1*

> **Verifica codice** (`AuditAccordionLayout.jsx`): le condizioni di visibilità accettano sia il codice corto (`"ISO_14001"`) sia il codice con anno (`"ISO_14001_2015"`), garantendo compatibilità tra audit creati via modal e audit modificati in Dati Generali.

---

## 6. 1 – Dati Generali

### 6.1 Informazioni di base

Espandere **Dati Generali → 1.1 Informazioni di base** per:

**Standard Applicabili** (modifica post-creazione):
- I checkbox mostrano gli standard disponibili dal database
- Aggiungere/rimuovere una norma **aggiorna immediatamente** la visibilità dei tab Checklist corrispondenti
- Aggiungere una norma già assente **inizializza automaticamente** la checklist per quella norma

**Altri campi**:

| Campo | Descrizione |
|---|---|
| Oggetto | Es. "Audit di Verifica ispettiva interna" |
| Campo di Applicazione | Perimetro dell'audit |
| Documenti di Riferimento | Lista dinamica (+ Aggiungi / Rimuovi) |
| Data Audit | Modificabile |
| Processi | Testo libero |
| Data comunicazione programma | — |
| Auditors | Lista dinamica |

> Ogni modifica viene salvata automaticamente (debounce + sync).

### 6.2 Obiettivo dell'Audit

- **Descrizione**: testo libero dell'obiettivo
- **Partecipanti**: lista nomi
- **Agenda**: descrizione ordine del giorno

### 6.3 Rilievi Pendenti

Mostra i **rilievi ereditati** dall'audit precedente (NC, OSS, OM non risolti).  
Per ogni rilievo:
- Badge colorato con stato (`NC`, `OSS`, `OM`)
- Riferimento clausola ISO
- Testo del rilievo
- Campo **Note di Risoluzione** (modificabile)
- Stato risoluzione: `Aperto` / `Risolto` / `Persiste`

---

## 7. Checklist – Compilazione

### 7.1 ISO 9001:2015

- **35 domande** organizzate in 7 clausole (§4 Contesto → §10 Miglioramento)
- Aprire **Checklist → ISO 9001:2015 - Qualità** e aprire il sotto-tab
- Per ogni domanda selezionare lo **stato di conformità**:

| Codice | Significato |
|---|---|
| **C** | Conforme |
| **NC** | Non Conforme |
| **OSS** | Osservazione |
| **OM** | Opportunità di Miglioramento |
| **NA** | Non Applicabile |
| **NV** | Non Verificato (default) |

- Campo **Note** libero per evidenze o commenti
- Barra di **progresso** in alto mostra % di completamento per la norma

### 7.2 ISO 14001:2015

- **46 domande** in 2 sezioni legislative:
  - *4 – AMBIENTE E SICUREZZA* (13 domande)
  - *5. AMBIENTE* (33 domande)
- Ogni domanda ha gli stessi codici di stato (C / NC / OSS / OM / NA / NV)
- Aprire **Checklist → ISO 14001:2015 - Ambiente** e aprire il sotto-tab
- Se la checklist non è ancora inizializzata, cliccare **✨ Inizializza Checklist ISO 14001**

> **Salvataggio automatico**: le risposte vengono salvate in IndexedDB ad ogni modifica e sincronizzate con il server (via `POST /api/v1/audit-responses/bulk`) in background. Riaprendo l'audit, le risposte vengono ripristinate sia da IndexedDB che dal server.

---

## 8. Esito Audit

Espandere **📊 Esito Audit** per:

| Campo | Descrizione |
|---|---|
| Conclusioni | Testo libero riepilogativo |
| NC totali / OSS totali / OM totali | Calcolati automaticamente dalla checklist |
| Allegati | Upload documenti/foto (gestiti dalla sezione Allegati) |
| Distribuzione | Lista destinatari del rapporto |

---

## 9. Export Report Word

1. Espandere **📤 Export Report**
2. Cliccare **Esporta Report Word (.docx)**
3. Il file viene generato e scaricato automaticamente con il nome `Audit_<numero>_<cliente>.docx`

**Il report include**:
- Sezione 1 – Dati Generali (oggetto, campo applicazione, documenti)
- Sezione 2 – Obiettivo Audit
- Sezione 3 – Rilievi Pendenti (NC/OSS/OM ereditati)
- Sezione 4 – Checklist ISO 9001 (risposte NC/OSS/OM, riepilogo statistiche)
- Sezione 5 – Esito Audit

> ⚠️ **Limitazione attuale**: il report Word include solo la checklist **ISO 9001**. La sezione ISO 14001 non è ancora inclusa (backlog – vedi §11).

---

## 10. Funzionamento Offline

L'app è una **PWA offline-first**:

| Scenario | Comportamento |
|---|---|
| Online | Ogni modifica viene salvata in IndexedDB e sincronizzata con il server in background |
| Offline | Tutte le operazioni (scrittura risposte, navigazione) funzionano normalmente |
| Riconnessione | Le modifiche locali vengono sincronizzate automaticamente (batch con retry e backoff) |
| Conflitto | **Server wins** su campi critici (stato, firme, esiti); **merge** su note/evidenze |

**Installazione PWA** (Chrome/Edge):
- Cliccare l'icona ⊕ nella barra degli indirizzi → *Installa app*
- L'app rimane accessibile anche senza connessione

---

## 11. Limitazioni note e backlog

| # | Limitazione | Stato |
|---|---|---|
| L1 | Export Word non include sezione ISO 14001 | Backlog – prossima release |
| L2 | ISO 45001: checklist non ancora popolata (placeholder) | Backlog futuro |
| L3 | Multi-standard: il DB salva un solo `standard_id` per audit; multi-standard è gestito solo a livello frontend/IndexedDB | Da valutare architettura |
| L4 | Allegati offline: upload file funziona solo online | Backlog |

---

## 12. Changelog funzionalità

| Data | Versione | Descrizione |
|---|---|---|
| 01/03/2026 | 1.1 | Fix: norme selezionate nel modal ora salvate correttamente; accordion ISO 14001/45001 ora visibile dopo selezione; `standard_id` inviato correttamente al server in sync; `auditConverter` supporta multi-standard da backend |
| 01/03/2026 | 1.0 | Fix: risposte checklist ripristinate dal server per tutti gli standard (non solo ISO 9001) |
| 28/02/2026 | 0.9 | Feat: ISO 14001 checklist completa (46 domande, 2 sezioni legislative, questionId 122–167 su DB) |
| 21/02/2026 | 0.8 | Feat: Rilievi pendenti funzionanti (modal creazione + tab 1.3 + export Word sezione 3) |
| 14/02/2026 | 0.7 | Feat: allegati (upload, preview, download) con token inline per img/PDF |

---

*Documento da aggiornare ad ogni nuova funzionalità implementata — mantenere la tabella §12 e le sezioni §11 allineate con il backlog effettivo del progetto.*
