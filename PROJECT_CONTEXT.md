# PROJECT CONTEXT — SGQ ISO 9001

> Documento di orientamento rapido per l'AI agent. Da leggere all'inizio di ogni sessione.  
> Dettagli tecnici: → [DATABASE.md](DATABASE.md) | [BACKEND_API.md](BACKEND_API.md) | `docs/`

---

## Cos'è il progetto

**Sistema Gestione Qualità ISO 9001** — PWA offline-first per la gestione degli audit interni ISO 9001:2015.  
Sostituisce fogli Excel/Word con un sistema centralizzato, tracciabile e conforme ISO 9001:2015 (§7.5, §9.2, §10.2).

- **Target**: PMI italiane con SGQ certificato
- **Modello**: Multi-tenant SaaS — isolamento su `organization_id`
- **Standard**: ISO 9001:2015 (attivo) → ISO 14001:2015 e ISO 45001:2018 (backlog)

---

## Stack

| Layer | Tecnologia | Note |
|---|---|---|
| **Frontend** | React 18, Vite 5.4.21, PWA | Deploy Netlify automatico da `main` |
| **Offline** | IndexedDB | Audit e risposte cachati localmente |
| **Backend** | Node.js 20, Express 4 | VPS Ubuntu, porta 3000 → HTTPS 8443 via Nginx |
| **Database** | SQL Server (`mssql`) | `www.fr-busato.it,11043` / `SGQ_ISO9001` |
| **Auth** | JWT in cookie httpOnly | `SameSite=None; Secure`, Axios `withCredentials` |
| **Export** | `docxtemplater` + `pizzip` + OOXML injection | Template `.docx` editabile in Word |
| **HTTP client** | Axios v1.7 con interceptor | Vietato `fetch` diretto |

---

## Infrastruttura produzione

| Risorsa | Dettaglio |
|---|---|
| **API** | `https://www.fr-busato.it:8443/api/v1` |
| **Frontend** | Netlify (auto-deploy da `main`) |
| **VPS** | `www.fr-busato.it` — Ubuntu |
| **SSH** | `ssh spascarella@www.fr-busato.it -p 1122` / `Sistemi@2026` |
| **Backend path** | `/var/www/sgq-backend/` |
| **App log** | `/var/www/sgq-backend/app.log` |
| **GitHub** | `qsstudio241/sistema-gestione-iso9001` |
| **Credenziali test** | `admin@sgq.local` / `Admin123!` |

### Restart server (comandi separati — NON concatenare con `;` il tail)

```bash
fuser -k 3000/tcp
sleep 2 && cd /var/www/sgq-backend && nohup node src/server.js > /var/www/sgq-backend/app.log 2>&1 &
sleep 4 && cat /var/www/sgq-backend/app.log
```

---

## Architettura offline-first

- **Sync strategy**: `server-wins` su campi critici (stato audit, firme, esiti); **merge** su note/evidenze
- **Conflict**: notifica utente + log persistente (tracciabilità ISO 9001:2015 §7.5/9.2/10.2)
- **SyncService**: batch con retry + backoff esponenziale
- **IndexedDB**: tutti gli audit/risposte cachati; sincronizzati in background al recupero connessione

---

## Architettura Word Export (`app/src/utils/wordExport.js`)

### Flusso

```
1. Carica template .docx   →  app/public/templates/ISO9001-audit-report.docx
2. docxtemplater            →  sostituisce {segnaposto} con dati audit
3. OOXML injection          →  replaceMarker() inserisce tabelle colorate
4. Salva blob               →  file-saver → download .docx
```

### Segnaposto template

`{clientName}` `{auditDate}` `{auditNumber}` `{procedureCode}` `{auditObject}` `{scope}`  
`{referenceDocuments}` `{processes}` `{programCommunicatedDate}` `{auditor}`  
`{objectiveDescription}` `{#participants}{role}{name}{/participants}` `{conclusions}`  
`{ncCount}` `{ossCount}` `{omCount}` `{nvCount}` `{summaryText}`

### Marker OOXML

| Marker | Contenuto generato |
|---|---|
| `CHECKLIST_MARKER` | Tabella checklist colorata per clausola (NC=rosso, C=verde, OSS=giallo, OM=blu, NA=grigio, NV=viola) |
| `RILIEVI_MARKER` | Tabella sintesi CONF\|NC\|OSS\|OM\|N.A. |

### File chiave export

| File | Ruolo |
|---|---|
| `app/src/utils/wordExport.js` | Entry point: carica template, chiama docxtemplater, injection OOXML |
| `app/src/utils/wordExportHelpers.js` | Genera stringhe OOXML raw (tabelle, colori) |
| `app/public/templates/ISO9001-audit-report.docx` | Template con logo e header/footer — **modificabile in Word** |
| `app/scripts/generateTemplate.js` | Rigenera template da zero (⚠️ sovrascrive personalizzazioni manuali) |

> **Regola**: ogni modifica al template `.docx` in Word va committata e pushata per apparire su Netlify.

### `replaceMarker()` — nota importante

La funzione cerca `<w:p ` o `<w:p>` (con spazio o `>`) camminando a ritroso dal marker.  
Esclude `<w:pPr>` — errore storico che corrompeva il file (commit `975ed3e`).

---

## Stato funzionalità (2026-03-01)

### ✅ Completate

| Funzionalità | Commit | Note |
|---|---|---|
| Auth JWT cookie (login/register/refresh) | — | httpOnly, SameSite=None |
| Gestione audit CRUD multi-tenant | — | |
| Checklist ISO 9001:2015 (35 domande) | — | |
| Risposte conformità (C/NC/OSS/OM/NA/NV) | — | |
| Non conformità CRUD | — | |
| Allegati upload/download/preview | `0520182` | `?token=` per `<img src>` |
| Export Word (template-based) | `975ed3e` | Template editabile in Word |
| Logo nel report Word | `57aabcf` | File template committato |
| Rilievi pendenti tra audit | — | tabella `pending_issues` (migration 018) |
| `check-reaudit` API | — | Verifica re-audit per cliente |
| Sync offline-first (IndexedDB → server) | — | |
| Fix AUTH_TOKEN_MISSING su allegati | `1bc59f3`, `0520182` | `attachmentRoutes` prima degli altri |

### 🔲 Backlog (Fase 2)

| Priorità | Funzionalità |
|---|---|
| Alta | **Componente `<AttachmentPreview>`** — preview inline allegati nella checklist |
| Alta | **Sezione "Rilievi Pendenti" in `CreateAuditModal`** — dati reali da `checkReaudit` |
| Media | **SyncService offline allegati** — file da IndexedDB → server al sync |
| Media | **Report Word rilievi pendenti reali** — sezione "3 - RILIEVI PENDENTI" da DB |
| Bassa | **Multi-standard** — seed domande ISO 14001 / ISO 45001 |
| Bassa | **Logo in codice** per template ISO 14001 / ISO 45001 |
| Bassa | **Refresh token** automatico (interceptor Axios) |

---

## Struttura repository (cartelle chiave)

```
/
├── app/                        # Frontend React + Vite
│   ├── src/
│   │   ├── components/         # Componenti React
│   │   ├── services/           # apiService.js, syncService.js
│   │   ├── utils/              # wordExport.js, wordExportHelpers.js
│   │   └── hooks/              # Custom hooks
│   ├── public/
│   │   └── templates/          # ISO9001-audit-report.docx ← editare in Word
│   └── scripts/
│       └── generateTemplate.js # Rigenera template (⚠️ sovrascrive)
│
├── backend/
│   └── src/
│       ├── controllers/        # Logica business
│       ├── routes/             # Express router
│       ├── middleware/         # auth.middleware.js (authenticate, authenticateDownload)
│       ├── config/
│       │   └── database.js     # Pool mssql, healthCheck(), closePool()
│       └── utils/
│           └── logger.js       # Winston logger
│
├── docs/                       # Documentazione dettagliata
│   ├── DATABASE_SCHEMA.md      # Schema completo DB — LEGGERE PRIMA DI TOCCARE IL DB
│   ├── DATABASE_MAPPING.md     # Mapping frontend ↔ backend ↔ DB
│   ├── PROJECT_ROADMAP.md      # Roadmap versioni
│   └── adr/                    # Architecture Decision Records
│
├── DATABASE.md                 # ← Quick-ref DB (questo progetto)
├── BACKEND_API.md              # ← Tutti gli endpoint API
└── PROJECT_CONTEXT.md          # ← Questo file
```

---

## Regole operative critiche

1. **Prima di modificare backend**: leggere il controller/route esistente
2. **`tail -N file`** NON funziona dopo `fuser` su questa shell → usare `cat`
3. **NON concatenare** restart server con `;` dopo `fuser -k` → comandi separati
4. **`conformity_status`** valori: `'C', 'NC', 'OSS', 'OM', 'NA', 'NV', NULL`
5. **`question_type`** valori DB: `'TEXT'`, `'YES_NO'`, `'MULTIPLE_CHOICE'` (MAIUSCOLO)
6. **`audit.status`** valori DB: `'draft'`, `'in_progress'`, `'completed'`, `'approved'` (minuscolo)
7. **Credenziali mai in repo** — `.env` + secrets CI/CD
8. **HTTP client**: solo Axios v1.7 con interceptor, vietato `fetch` diretto

---

## Workflow deploy

### Frontend (automatico)
```bash
git add .
git commit -m "feat: ..."
git push origin main
# Netlify deploy automatico — ~2 minuti
```

### Backend (manuale SCP)
```bash
# 1. Copia il/i file modificato/i
scp -P 1122 backend/src/controllers/audit.controller.js \
  spascarella@www.fr-busato.it:/var/www/sgq-backend/src/controllers/

# 2. Restart server
fuser -k 3000/tcp
sleep 2 && cd /var/www/sgq-backend && nohup node src/server.js > /var/www/sgq-backend/app.log 2>&1 &
sleep 4 && cat /var/www/sgq-backend/app.log
```

### Template Word (richiede commit)
```bash
# Dopo aver modificato app/public/templates/ISO9001-audit-report.docx in Word:
git add app/public/templates/ISO9001-audit-report.docx
git commit -m "chore: aggiorna template Word"
git push origin main
```

---

*Aggiornato: 2026-03-01 — Sessione fix-auth + architettura Word export template-based*
