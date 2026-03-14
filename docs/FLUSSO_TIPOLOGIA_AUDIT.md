# Flusso tipologia audit (prima parte / seconda parte)

> **Scopo**: definire **quando** e **dove** l’utente stabilisce se l’audit è di prima parte (interno) o di seconda parte (fornitore), e come si riflette in UI e nei template Word.

---

## 1. Momento del flusso in cui si stabilisce la tipologia

La tipologia si imposta **in fase di creazione dell’audit**, nel **modal “Crea Nuovo Audit”** (o “Re-Audit Azienda”).

- **Dove**: stesso passo in cui si scelgono **Azienda committente**, numero audit, data, auditor, norme.
- **Come**: scelta obbligatoria tra:
  - **Prima parte (interno)** — l’audit è sull’azienda committente stessa (default).
  - **Seconda parte (fornitore)** — l’audit è su un fornitore; in questo caso si compila anche il campo **Fornitore**.

Quindi: **non** in un secondo momento (es. tab “Dati generali” dopo la creazione), ma **subito nel modal di creazione**, così l’audit nasce già con tipologia e, se serve, fornitore definiti. Opzionalmente la tipologia (e il fornitore) possono essere **modificabili anche dopo** nella sezione Dati generali.

---

## 2. Posizione nell’interfaccia UI

### 2.1 Modal “Crea Nuovo Audit” (AuditSelector → CreateAuditModal)

Ordine logico dei campi (da alto in basso):

1. **Numero Audit** (solo lettura, generato)
2. **Azienda committente**
   - Dropdown “Azienda (da anagrafica)” → rinominato in **“Azienda committente (da anagrafica)”** (se presente).
   - Campo testo **“Azienda committente”** (ex “Nome Cliente”) — nome di chi commissiona l’audit.
3. **Tipologia audit** (nuovo)
   - Due opzioni in radio (o pulsanti):
     - **Prima parte (interno)** — audit sul committente stesso (default).
     - **Seconda parte (fornitore)** — audit su un fornitore del committente.
4. **Fornitore** (nuovo, condizionale)
   - Visibile **solo** se è selezionata “Seconda parte (fornitore)”.
   - Campo testo (es. “Ragione sociale o denominazione fornitore auditato”).
   - Opzionale in UI; si può rendere obbligatorio quando tipologia = seconda parte.
5. Data Audit, Auditor, Norme applicabili (invariati).

Il **flag** “audit di seconda parte” è quindi:
- **Cosa**: la scelta **“Seconda parte (fornitore)”** nel gruppo **“Tipologia audit”**.
- **Dove**: nel modal di creazione audit, **sotto** “Azienda committente” e **sopra** Data / Auditor / Norme.

### 2.2 Eventuale modifica successiva (Dati generali)

Nella **Tab “Dati generali”** (GeneralDataSection) si può aggiungere, in coda al form:
- stesso gruppo **Tipologia audit** (Prima parte / Seconda parte);
- campo **Fornitore** (visibile solo se Seconda parte).

Così l’utente può correggere tipologia e fornitore anche dopo la creazione.

---

## 3. Template Word

### 3.1 Dati da esporre nell’export

- **Azienda committente**: già presente come `{clientName}`; in etichetta si può usare “Azienda committente” invece di “Cliente”.
- **Tipologia audit**: nuovo placeholder es. `{auditPartyTypeLabel}` (valori: “Prima parte (interno)” / “Seconda parte (fornitore)”).
- **Fornitore**: nuovo placeholder `{fornitoreName}`; valorizzato solo in audit di seconda parte, altrimenti vuoto o “—”.

### 3.2 Dove metterli nel .docx

- **Intestazione / copertina**:  
  - una riga tipo: **Azienda committente:** `{clientName}` (o `{committenteName}` se si aggiunge alias);  
  - **Tipologia audit:** `{auditPartyTypeLabel}`;  
  - **Fornitore auditato:** `{fornitoreName}` (solo significativo in seconda parte; altrimenti “—” o lasciato vuoto).
- **Sezione “Dati generali”** (se esiste nel template): stessi tre campi per coerenza con la UI.

Nei template (ISO 9001, 14001, 3834, ecc.) basta aggiungere questi placeholder dove serve; `buildTemplateData` in `wordExport.js` fornirà i valori.

---

## 4. Riepilogo

| Aspetto | Scelta |
|--------|--------|
| **Quando** si stabilisce che è di seconda parte | Alla **creazione** dell’audit (modal “Crea Nuovo Audit”). |
| **Dove** in UI | Nel **modal di creazione**, sotto “Azienda committente”, con il gruppo **“Tipologia audit”** e il campo **“Fornitore”** (visibile solo se Seconda parte). |
| **Template Word** | Placeholder `{clientName}`/“Azienda committente”, `{auditPartyTypeLabel}`, `{fornitoreName}` in intestazione/copertina (e eventualmente in Dati generali). |

Implementazione tecnica: modal creazione + eventuale GeneralDataSection + `buildTemplateData` e placeholder nei .docx.
