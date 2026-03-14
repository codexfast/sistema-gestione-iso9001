# Test guidato — Tipologia audit (Prima parte / Seconda parte)

> Guida passo-passo per verificare la funzionalità **Tipologia audit** e **Fornitore auditato**, come da manuale utente.

---

## Prerequisiti

- Applicazione avviata (locale o Netlify).
- Utente autenticato.
- Connessione al backend (per salvataggio e sync).

---

## 1. Creazione audit — Prima parte (interno)

1. Dalla schermata principale, clicca **"Nuovo audit"** (o **"Crea Nuovo Audit"**).
2. Compila:
   - **Azienda committente**: nome dell’azienda che commissiona l’audit (es. "Acme SpA").
   - **Tipologia audit**: seleziona **"Prima parte (interno)"**.
   - Campo **"Fornitore auditato"** non deve essere visibile.
3. Inserisci Data, Auditor, Norme applicabili e conferma la creazione.
4. **Verifica**: apri l’audit creato → sezione **"1. Dati generali"** → sottosezione **"1.1 Informazioni di base..."**.  
   Deve comparire **"Tipologia audit"** con **"Prima parte (interno)"** selezionato e nessun campo Fornitore.

---

## 2. Creazione audit — Seconda parte (fornitore)

1. Clicca di nuovo **"Nuovo audit"**.
2. Compila:
   - **Azienda committente**: es. "Acme SpA" (chi commissiona).
   - **Tipologia audit**: seleziona **"Seconda parte (fornitore)"**.
   - Deve apparire il campo **"Fornitore auditato"**: inserisci la ragione sociale del fornitore (es. "Fornitori XYZ Srl").
3. Completa Data, Auditor, Norme e conferma.
4. **Verifica**: nell’audit creato, in **"1.1 Informazioni di base..."** devono comparire **"Seconda parte (fornitore)"** e il nome del fornitore nel campo **"Fornitore auditato"**.

---

## 3. Modifica tipologia e fornitore dopo la creazione

1. Apri un audit già creato (qualsiasi tipologia).
2. Vai in **"1. Dati generali"** → **"1.1 Informazioni di base sull'audit..."**.
3. In cima alla sezione trovi **"Tipologia audit"** con le due opzioni.
4. Cambia da **"Prima parte (interno)"** a **"Seconda parte (fornitore)"**: deve apparire il campo **"Fornitore auditato"**. Inserisci un nome (es. "Beta Fornitori").
5. Salva l’audit (salvataggio locale e/o sync con il server).
6. **Verifica**: ricarica la pagina o riapri l’audit. Tipologia e fornitore devono essere quelli impostati.

---

## 4. Export Word (se template aggiornati)

Se nei template Word (es. `ISO9001-audit-report.docx`) sono stati inseriti i placeholder:

- `{committenteName}` o `{clientName}` — Azienda committente  
- `{auditPartyTypeLabel}` — "Prima parte (interno)" o "Seconda parte (fornitore)"  
- `{fornitoreName}` — Nome fornitore (o "—" se prima parte)

1. Apri un audit di **seconda parte** con fornitore compilato.
2. Vai in **Export** / **Report Word** e genera il report.
3. Apri il file .docx generato: in intestazione/copertina devono comparire **Azienda committente**, **Tipologia audit** e **Fornitore auditato** con i valori corretti.

> **Nota**: se i placeholder non sono ancora stati inseriti nei file .docx, questa verifica va fatta dopo l’aggiornamento manuale dei template (vedi `docs/FLUSSO_TIPOLOGIA_AUDIT.md`).

---

## 5. Sync e persistenza (backend)

1. Crea un audit di **seconda parte** con fornitore compilato e attendi la sincronizzazione (o forzala se l’app lo consente).
2. In un’altra sessione o dispositivo, effettua il login e apri l’elenco audit.
3. **Verifica**: l’audit deve comparire con tipologia **Seconda parte** e fornitore corretti (dati letti da server/`audit_extra_data`).

---

## Riepilogo checklist

| Passo | Azione | Verifica |
|-------|--------|----------|
| 1 | Crea audit Prima parte | Nessun campo Fornitore; in Dati generali compare "Prima parte (interno)" |
| 2 | Crea audit Seconda parte con fornitore | Campo Fornitore visibile e valorizzato; in Dati generali "Seconda parte" + nome fornitore |
| 3 | Modifica tipologia/fornitore in Dati generali | Modifica salvata e visibile al rientro |
| 4 | Export Word (se template pronti) | Placeholder sostituiti con committente, tipologia, fornitore |
| 5 | Sync | Dati tipologia/fornitore persistiti e visibili dopo sync |

---

*Documento per test guidato post-deploy — funzionalità Tipologia audit (prima/seconda parte) e Fornitore auditato.*
