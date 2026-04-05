/**
 * Controlla dettagli audit 4916 (2026-04) e risposte
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8'));
const c = configs.production;
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {

    // 1) Full extra_data audit 4916
    const r1 = await pool.request().query(`
        SELECT audit_id, audit_number, client_name, standard_id, audit_extra_data
        FROM audits WHERE audit_id = 4916
    `);
    const aud = r1.recordset[0];
    console.log('\n=== AUDIT 4916 (2026-04) ===');
    console.log('standard_id:', aud.standard_id);
    const extra = aud.audit_extra_data || '';
    // Cerca selectedStandards
    const match = extra.match(/"selectedStandards"\s*:\s*(\[[^\]]*\])/);
    if (match) console.log('selectedStandards:', match[1]);
    else console.log('selectedStandards NON TROVATO nel extra_data');
    console.log('\nFull extra_data (prime 800):\n', extra.substring(0, 800));

    // 2) Colonne audit_responses
    const r2 = await pool.request().query('SELECT TOP 1 * FROM audit_responses ORDER BY response_id DESC');
    console.log('\n=== COLONNE audit_responses ===');
    console.log(Object.keys(r2.recordset[0]).join(', '));

    // 3) Risposte audit 4916
    const r3 = await pool.request().input('aid', sql.Int, 4916).query(`
        SELECT TOP 20
            ar.response_id,
            ar.question_id,
            ar.conformity_status,
            LEFT(ISNULL(ar.notes, ''), 40) AS note,
            cq.standard_id AS q_std,
            LEFT(ISNULL(cq.question_text, ''), 40) AS domanda
        FROM audit_responses ar
        LEFT JOIN checklist_questions cq ON cq.question_id = ar.question_id
        WHERE ar.audit_id = @aid
        ORDER BY ar.question_id
    `);
    console.log('\n=== RISPOSTE audit 4916 (prime 20) ===');
    r3.recordset.forEach(r => {
        console.log(`  q:${r.question_id} std:${r.q_std} status:${r.conformity_status} | ${r.domanda}`);
    });

    await pool.close();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
