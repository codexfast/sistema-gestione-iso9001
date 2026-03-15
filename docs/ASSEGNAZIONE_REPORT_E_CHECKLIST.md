# Assegnazione report e checklist personalizzate

## Come funziona l’assegnazione del template report

Quando generi un **Report Word** (Genera Report Word / Salva in Workspace), il sistema deve decidere **quale template .docx usare**. La scelta dipende dal tipo di audit.

### Audit con norme ISO

- Per ogni **norma ISO** selezionata (es. ISO 9001, ISO 14001) il sistema risolve il template così:
  1. Cerca un’**assegnazione** in `report_template_assignments` (organizzazione + standard_id).
  2. Se non c’è, usa il **template di sistema** per quella norma (es. ISO 9001 → template default).
  3. Se non esiste nemmeno quello, usa il template **default** generico.
- Puoi assegnare un template diverso per norma dalla sezione **Template report** (se prevista dall’interfaccia per gli standard).

### Audit con checklist personalizzata

- Se l’audit usa una **checklist personalizzata** (sola o insieme alle norme), il template si risolve così:
  1. Cerca un’**assegnazione** in `report_template_assignments` per quella checklist (organizzazione + custom_checklist_id).
  2. Se non c’è, usa il **template predefinito della checklist** (`custom_checklists.default_report_template_id`).
  3. Se non c’è, usa il template di sistema **“Verbale visita (checklist custom)”**.
  4. Ultimo fallback: template **default** (es. ISO 9001).

Quindi: **non devi per forza assegnare** un template; se non lo fai, viene usato il “Verbale visita” o il default. Se vuoi un template specifico, lo assegni dalla schermata della checklist (vedi sotto).

---

## Cosa fare per un’associazione corretta

### Checklist personalizzate

1. Vai in **Checklist personalizzate** (menu).
2. Apri la checklist che ti interessa (modifica).
3. Nella sezione **“Template report”** scegli dal menu a tendina il template Word da usare per gli audit che usano quella checklist.
4. Salva: l’associazione viene registrata (tabella `report_template_assignments` o campo default sulla checklist).

Da quel momento, tutti gli audit che usano quella checklist useranno quel template in fase di export Word.

### Norme ISO

- Se nella tua installazione esiste una pagina **Template report** per standard, da lì puoi associare un template a ogni norma (es. ISO 9001, ISO 14001).
- In assenza di assegnazione, il sistema usa i template di sistema per ogni norma.

---

## Cosa succede quando crei nuove checklist

- **Nuova checklist** = nuovo record in `custom_checklists`. All’inizio **non** ha alcuna assegnazione esplicita in `report_template_assignments` e spesso neanche `default_report_template_id`.
- **Elenco delle associazioni**:
  - Non esiste un “elenco globale” separato: ogni checklist ha **al massimo un template assegnato** (o nessuno).
  - L’**elenco** che vedi è semplicemente l’elenco delle **checklist** (Checklist personalizzate). Per ognuna, in modifica, vedi la sezione “Template report” con un **menu a tendina**.
- **Popolamento del menu a tendina**:
  - Il menu “Template report” in modifica checklist viene popolato con **tutti i template disponibili** per gli audit (chiamata `getReportTemplates("audit")`: template di sistema + eventuali template dell’organizzazione).
  - La **voce selezionata** è quella risolta con `getReportTemplate(null, checklist.id)`: se non c’è assegnazione, vedi il template di fallback (es. “Verbale visita (checklist custom)”) finché non ne scegli uno e salvi.
- In sintesi: **crei la checklist** → appare in “Checklist personalizzate” → **apri la checklist** → in “Template report” scegli dal menu il template che vuoi → **salvi**. Da allora quella checklist userà il template scelto in fase di generazione report. Non c’è un passo aggiuntivo per “popolare” un elenco di associazioni: l’associazione è proprio la scelta che fai in quella schermata e il successivo salvataggio.

---

## Riepilogo

| Dove agire | Cosa fa |
|------------|--------|
| **Checklist personalizzate** → modifica checklist → **Template report** | Assegni il template Word per tutti gli audit che usano quella checklist. Nuove checklist: apri, scegli template, salva. |
| **Template report** (se presente per standard) | Assegni il template per audit che usano quella norma ISO. |
| Nessuna assegnazione | Il sistema usa i fallback (Verbale visita per checklist custom, template di sistema per norma). |
