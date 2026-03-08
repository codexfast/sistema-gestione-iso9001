/**
 * Migration 023: ISO 14001:2015 — Checklist sistematica da norma (clausole 4→10)
 * - Soft-delete 46 domande legislative (iso14001_s4/s5)
 * - Disattivazione sezioni legislative legacy
 * - Creazione 7 nuove sezioni (14001_c4 → 14001_c10)
 * - Inserimento 29 domande basate sui requisiti della norma
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {
    ...c,
    server:   process.env.DB_SERVER,
    database: process.env.DB_DATABASE || c.database,
    user:     process.env.DB_USER     || c.user,
    password: process.env.DB_PASSWORD || c.password
};
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {
    console.log('Migration 023: ISO 14001:2015 checklist da norma...\n');

    // ---------- 1. Soft-delete domande legislative ----------
    const del = await pool.request().query(`
        UPDATE checklist_questions
        SET is_active = 0, updated_at = GETDATE()
        WHERE standard_id = 2 AND section_code IN ('iso14001_s4', 'iso14001_s5')
    `);
    console.log(`[1] Soft-delete domande legislative: ${del.rowsAffected[0]} righe aggiornate`);

    // ---------- 2. Disattiva sezioni legislative ----------
    const delSec = await pool.request().query(`
        UPDATE checklist_sections
        SET is_active = 0
        WHERE standard_id = 2 AND section_code IN ('iso14001_s4', 'iso14001_s5')
    `);
    console.log(`[2] Sezioni legislative disattivate: ${delSec.rowsAffected[0]} righe`);

    // ---------- 3. Crea 7 sezioni clausole 4→10 ----------
    const sections = [
        { code: '14001_c4',  title: '4 – Contesto dell\'Organizzazione',  order: 1 },
        { code: '14001_c5',  title: '5 – Leadership',                      order: 2 },
        { code: '14001_c6',  title: '6 – Pianificazione',                  order: 3 },
        { code: '14001_c7',  title: '7 – Supporto',                        order: 4 },
        { code: '14001_c8',  title: '8 – Attività Operative',              order: 5 },
        { code: '14001_c9',  title: '9 – Valutazione delle Prestazioni',   order: 6 },
        { code: '14001_c10', title: '10 – Miglioramento',                  order: 7 },
    ];

    for (const s of sections) {
        const exists = await pool.request().query(
            `SELECT section_id FROM checklist_sections WHERE standard_id=2 AND section_code='${s.code}'`
        );
        if (exists.recordset.length > 0) {
            await pool.request().query(`
                UPDATE checklist_sections
                SET section_title='${s.title.replace(/'/g, "''")}', is_active=1, display_order=${s.order}
                WHERE standard_id=2 AND section_code='${s.code}'
            `);
            console.log(`[3] Sezione aggiornata: ${s.code}`);
        } else {
            await pool.request().query(`
                INSERT INTO checklist_sections (section_code, section_title, standard_id, display_order, is_active)
                VALUES ('${s.code}', '${s.title.replace(/'/g, "''")}', 2, ${s.order}, 1)
            `);
            console.log(`[3] Sezione creata: ${s.code}`);
        }
    }

    // ---------- 4. Inserisci 29 domande ----------
    const questions = [
        // Clausola 4 (4 domande)
        { section: '14001_c4',  order: 1,  text: 'Comprendere l\'organizzazione e il suo contesto (fattori interni ed esterni, condizioni ambientali rilevanti)' },
        { section: '14001_c4',  order: 2,  text: 'Esigenze e aspettative delle parti interessate rilevanti per il SGA e obblighi di conformità che ne derivano' },
        { section: '14001_c4',  order: 3,  text: 'Campo di applicazione del sistema di gestione ambientale (confini, unità organizzative, attività e servizi)' },
        { section: '14001_c4',  order: 4,  text: 'Istituzione, attuazione, mantenimento e miglioramento continuo del sistema di gestione ambientale' },
        // Clausola 5 (3 domande)
        { section: '14001_c5',  order: 5,  text: 'Leadership e impegno dell\'alta direzione nel SGA (responsabilità, risorse, miglioramento continuo)' },
        { section: '14001_c5',  order: 6,  text: 'Politica ambientale (appropriata al contesto, impegni, comunicazione, disponibilità alle parti interessate)' },
        { section: '14001_c5',  order: 7,  text: 'Ruoli, responsabilità e autorità per la conformità al SGA e per il reporting alla direzione' },
        // Clausola 6 (6 domande)
        { section: '14001_c6',  order: 8,  text: 'Azioni per affrontare rischi e opportunità — determinazione e gestione delle situazioni di emergenza ambientale' },
        { section: '14001_c6',  order: 9,  text: 'Aspetti ambientali delle attività, prodotti e servizi — identificazione, valutazione significatività, ciclo di vita' },
        { section: '14001_c6',  order: 10, text: 'Obblighi di conformità — requisiti legali e altri requisiti applicabili agli aspetti ambientali' },
        { section: '14001_c6',  order: 11, text: 'Pianificazione delle azioni per aspetti significativi, obblighi di conformità e rischi/opportunità identificati' },
        { section: '14001_c6',  order: 12, text: 'Obiettivi ambientali (coerenti con politica, misurabili, monitorati, comunicati, aggiornati)' },
        { section: '14001_c6',  order: 13, text: 'Pianificazione per il raggiungimento degli obiettivi ambientali (cosa, risorse, responsabile, tempi, indicatori)' },
        // Clausola 7 (7 domande)
        { section: '14001_c7',  order: 14, text: 'Risorse necessarie per istituzione, attuazione, mantenimento e miglioramento del SGA' },
        { section: '14001_c7',  order: 15, text: 'Competenza del personale con impatto sulla prestazione ambientale e sull\'adempimento degli obblighi' },
        { section: '14001_c7',  order: 16, text: 'Consapevolezza del personale (politica ambientale, aspetti significativi, contributo personale, implicazioni NC)' },
        { section: '14001_c7',  order: 17, text: 'Comunicazione interna ed esterna — processi per cosa, quando, con chi e come comunicare' },
        { section: '14001_c7',  order: 18, text: 'Informazioni documentate richieste dalla norma e da esigenze proprie del SGA' },
        { section: '14001_c7',  order: 19, text: 'Creazione e aggiornamento delle informazioni documentate (identificazione, formato, riesame, approvazione)' },
        { section: '14001_c7',  order: 20, text: 'Controllo delle informazioni documentate (disponibilità, protezione, distribuzione, conservazione, eliminazione)' },
        // Clausola 8 (2 domande)
        { section: '14001_c8',  order: 21, text: 'Pianificazione e controllo operativi — criteri operativi, prospettiva di ciclo di vita, gestione fornitori e appaltatori' },
        { section: '14001_c8',  order: 22, text: 'Preparazione e risposta alle emergenze ambientali (piano, prove periodiche, riesame post-emergenza, formazione)' },
        // Clausola 9 (4 domande)
        { section: '14001_c9',  order: 23, text: 'Monitoraggio, misurazione, analisi e valutazione della prestazione ambientale (KPI, strumenti tarati, comunicazione)' },
        { section: '14001_c9',  order: 24, text: 'Valutazione della conformità agli obblighi di conformità (frequenza, azioni, conoscenza dello stato)' },
        { section: '14001_c9',  order: 25, text: 'Programma di audit interno (frequenza, metodi, responsabilità, obiettività, reporting ai livelli pertinenti)' },
        { section: '14001_c9',  order: 26, text: 'Riesame di direzione del SGA (input: cambiamenti, obiettivi, NC/AC, audit; output: decisioni e azioni)' },
        // Clausola 10 (3 domande)
        { section: '14001_c10', order: 27, text: 'Determinazione delle opportunità di miglioramento della prestazione ambientale' },
        { section: '14001_c10', order: 28, text: 'Non conformità e azioni correttive (controllo NC, analisi cause, efficacia AC, impatti ambientali, modifiche SGA)' },
        { section: '14001_c10', order: 29, text: 'Miglioramento continuo dell\'idoneità, adeguatezza ed efficacia del sistema di gestione ambientale' },
    ];

    let inserted = 0, skipped = 0;
    for (const q of questions) {
        const escaped = q.text.replace(/'/g, "''");
        const exists = await pool.request().query(`
            SELECT question_id FROM checklist_questions
            WHERE standard_id=2 AND section_code='${q.section}'
              AND LEFT(question_text, 40) = LEFT(N'${escaped}', 40)
              AND is_active=1
        `);
        if (exists.recordset.length > 0) {
            console.log(`[--] Già presente: "${q.text.substring(0, 55)}..." (id=${exists.recordset[0].question_id})`);
            skipped++;
            continue;
        }
        const res = await pool.request().query(`
            INSERT INTO checklist_questions
                (standard_id, section_code, question_text, question_type, is_mandatory, display_order, is_active, created_at, updated_at)
            OUTPUT INSERTED.question_id
            VALUES (2, '${q.section}', N'${escaped}', 'text', 1, ${q.order}, 1, GETDATE(), GETDATE())
        `);
        const newId = res.recordset[0].question_id;
        console.log(`[OK] Inserita ord:${q.order} id:${newId} — "${q.text.substring(0, 55)}..."`);
        inserted++;
    }

    console.log(`\n[4] Domande inserite: ${inserted}, già presenti (skip): ${skipped}`);

    // ---------- 5. Riepilogo finale ----------
    console.log('\n=== Riepilogo IDs ISO 14001:2015 (per clauseRef nel template Word) ===');
    const allQ = await pool.request().query(`
        SELECT cs.section_code, cs.section_title, cq.question_id, cq.display_order, LEFT(cq.question_text, 70) AS testo
        FROM checklist_questions cq
        JOIN checklist_sections cs ON cs.section_code = cq.section_code AND cs.standard_id = cq.standard_id
        WHERE cq.standard_id = 2 AND cq.is_active = 1
        ORDER BY cs.display_order, cq.display_order
    `);
    allQ.recordset.forEach(r =>
        console.log(`  [${r.section_code}] ord:${r.display_order} id:${r.question_id} — ${r.testo}`)
    );

    console.log('\n✅ Migration 023 completata.');
    await pool.close();
    process.exit(0);
}).catch(e => {
    console.error('Errore:', e.message);
    process.exit(1);
});
