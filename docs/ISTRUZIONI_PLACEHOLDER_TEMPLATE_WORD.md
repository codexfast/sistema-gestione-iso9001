# Istruzioni: placeholder tipologia audit nei template Word

Per far comparire **Azienda committente**, **Tipologia audit** e **Fornitore auditato** nei report Word generati dall’app, aggiungi i seguenti placeholder nei file `.docx` indicati.

---

## Template da modificare

| File | Percorso |
|------|----------|
| ISO 9001 | `app/public/templates/ISO9001-audit-report.docx` |
| ISO 14001 | `app/public/templates/ISO14001-audit-report.docx` |
| ISO 3834 | `app/public/templates/ISO3834-audit-report.docx` |

---

## Placeholder da inserire (testo da digitare in Word)

L’applicazione sostituirà questi **testi esatti** con i valori dell’audit. Inseriscili dove vuoi in intestazione, copertina o sezione “Dati generali”.

| Placeholder | Valore sostituito |
|-------------|-------------------|
| `{committenteName}` | Nome azienda committente (chi commissiona l’audit) |
| `{clientName}` | Come sopra (alias) |
| `{auditPartyTypeLabel}` | "Prima parte (interno)" oppure "Seconda parte (fornitore)" |
| `{fornitoreName}` | Nome fornitore auditato (se seconda parte), altrimenti "—" |

---

## Procedura in Word (per ogni template)

1. Apri il file `.docx` (es. `app/public/templates/ISO9001-audit-report.docx`) con Microsoft Word.
2. Vai in **intestazione**, **copertina** o sezione **Dati generali**.
3. Aggiungi le righe che ti servono, **digitando i placeholder così come sono** (con le parentesi graffe), ad esempio:
   - **Azienda committente:** `{committenteName}`
   - **Tipologia audit:** `{auditPartyTypeLabel}`
   - **Fornitore auditato:** `{fornitoreName}`
4. Salva il file (formato `.docx`) nella stessa cartella.

Dopo il salvataggio, alla generazione del report dall’app i placeholder verranno sostituiti con i dati dell’audit.

---

## Verifica

- Crea un audit di **seconda parte** con fornitore compilato.
- Genera il report Word dall’app.
- Apri il file generato: in corrispondenza dei placeholder devono comparire committente, tipologia e fornitore corretti.

---

*Riferimento: `docs/FLUSSO_TIPOLOGIA_AUDIT.md`, `app/src/utils/wordExport.js` (funzione `buildTemplateData`).*
