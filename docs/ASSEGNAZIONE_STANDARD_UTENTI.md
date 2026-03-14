# Assegnazione standard per utente (user_standards)

Permette di limitare quali standard ISO ogni auditor può usare. Gli **admin** assegnano gli standard consentiti; gli utenti senza assegnazioni vedono tutti gli standard (retrocompatibilità).

---

## Comportamento

- **Nessuna riga in `user_standards`** per un utente → può usare **tutti** gli standard (comportamento attuale).
- **Una o più righe in `user_standards`** → l’utente può **solo** creare/auditare gli standard assegnati (es. Marco: 9001, 14001, 45001; Andrea: 3834-2).

---

## 1. Database

### Migration 022 (tabella)

Eseguire sul database `SGQ_ISO9001`:

```text
database/migrations/022_user_standards.sql
```

Crea la tabella `user_standards (user_id, standard_id)`.

### Seed Marco e Andrea (opzionale)

Dopo la migration, per impostare subito le assegnazioni:

- **Marco Camellini** (`marcocamellini@gmail.com`): standard_id **1, 2, 3** (ISO 9001, 14001, 45001)
- **Andrea Mason** (`andrea.mason@mason-cs.com`): standard_id **6** (ISO 3834-2)

```text
database/scripts/seed_user_standards_marco_andrea.sql
```

Eseguire in SSMS (o `sqlcmd`) sul DB. Se gli utenti non esistono, lo script segnala un warning e si può eseguire di nuovo dopo aver creato gli utenti.

---

## 2. Backend

- **GET /auth/me** e risposta **login**: includono `allowed_standard_ids` (array di `standard_id` o `null` se “tutti”).
- **POST /audits**, **POST /audits/sync**: se l’utente ha restrizioni, gli `standard_ids` nella richiesta devono essere tutti in `allowed_standard_ids`, altrimenti risposta **403** (`STANDARDS_NOT_ALLOWED`).
- **GET /admin/users** (solo admin): elenco utenti con `allowed_standard_ids` per ciascuno.
- **PUT /admin/users/:id/standards** (solo admin): body `{ "standard_ids": [1, 2, 3] }` aggiorna le assegnazioni per quell’utente.

---

## 3. Frontend

- **Modal “Crea audit”**: le norme mostrate sono filtrate in base a `user.allowed_standard_ids`. Se l’utente non ha assegnazioni, vede tutte; se ne ha, vede solo quelle consentite.
- **Pagina admin “Utenti e standard”**: da menu (solo admin) **👥 Utenti e standard** si apre l’elenco utenti; per ogni utente si scelgono gli standard consentiti con le checkbox e si salva. Così puoi assegnare a **Marco Camellini** 9001, 14001, 45001 e a **Mason Andrea** solo 3834.

---

## 4. Riepilogo passi per te (admin)

1. Eseguire **migration 022** sul DB.
2. (Opzionale) Eseguire **seed_user_standards_marco_andrea.sql** se gli utenti Marco e Andrea esistono già.
3. Fare **deploy backend** (e frontend se necessario).
4. Accedere come **admin** → menu **👥 Utenti e standard** → verificare/aggiustare le checkbox per Marco e Andrea e salvare.

Dopo il salvataggio, al prossimo login (o refresh di `/auth/me`) Marco vedrà solo 9001/14001/45001 e Andrea solo 3834-2 in creazione audit.
