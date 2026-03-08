/**
 * Test di consistenza DB multi-standard
 * Verifica: audit_standards, audit_responses, standard_id coerenti
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8')).production;
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {
    let issues = 0;

    console.log('\n=== TEST 1: Audit senza righe in audit_standards ===');
    const r1 = await pool.request().query(`
        SELECT a.audit_id, a.audit_number, a.client_name
        FROM audits a
        WHERE a.is_deleted = 0
          AND NOT EXISTS (SELECT 1 FROM audit_standards WHERE audit_id = a.audit_id)
        ORDER BY a.created_at DESC
    `);
    if (r1.recordset.length > 0) {
        console.log(`  ❌ ${r1.recordset.length} audit senza standard registrati:`);
        r1.recordset.forEach(x => console.log(`     ID:${x.audit_id} ${x.audit_number} (${x.client_name})`));
        issues += r1.recordset.length;
    } else {
        console.log('  ✅ Tutti gli audit hanno standard registrati');
    }

    console.log('\n=== TEST 2: Risposte con question_id non esistente ===');
    const r2 = await pool.request().query(`
        SELECT COUNT(*) AS cnt
        FROM audit_responses ar
        WHERE NOT EXISTS (SELECT 1 FROM checklist_questions cq WHERE cq.question_id = ar.question_id)
    `);
    const orphanResponses = r2.recordset[0].cnt;
    if (orphanResponses > 0) {
        console.log(`  ❌ ${orphanResponses} risposte puntano a domande inesistenti`);
        issues += orphanResponses;
    } else {
        console.log('  ✅ Tutte le risposte hanno question_id valido');
    }

    console.log('\n=== TEST 3: Standard in audit_standards ma standard non in tabella standards ===');
    const r3 = await pool.request().query(`
        SELECT DISTINCT ast.standard_id
        FROM audit_standards ast
        WHERE NOT EXISTS (SELECT 1 FROM standards s WHERE s.standard_id = ast.standard_id)
    `);
    if (r3.recordset.length > 0) {
        console.log(`  ❌ standard_id non validi in audit_standards: ${r3.recordset.map(x=>x.standard_id).join(', ')}`);
        issues += r3.recordset.length;
    } else {
        console.log('  ✅ Tutti i standard_id in audit_standards sono validi');
    }

    console.log('\n=== TEST 4: Tabella standards (valori attesi) ===');
    const r4 = await pool.request().query(`SELECT standard_id, standard_code, standard_name FROM standards ORDER BY standard_id`);
    const EXPECTED = { 1: '9001', 2: '14001', 3: '45001', 6: '3834' };
    r4.recordset.forEach(s => {
        const exp = EXPECTED[s.standard_id];
        const ok = exp && s.standard_code.includes(exp);
        console.log(`  ${ok ? '✅' : '⚠️'} ID:${s.standard_id} ${s.standard_code} — ${s.standard_name}`);
        if (!ok) issues++;
    });

    console.log('\n=== TEST 5: Risposte per standard per ogni audit ===');
    const r5 = await pool.request().query(`
        SELECT
            a.audit_id, a.audit_number, a.client_name,
            s.standard_code,
            COUNT(ar.response_id) AS risposte
        FROM audits a
        LEFT JOIN audit_responses ar ON ar.audit_id = a.audit_id
        LEFT JOIN checklist_questions cq ON cq.question_id = ar.question_id
        LEFT JOIN standards s ON s.standard_id = cq.standard_id
        WHERE a.is_deleted = 0
        GROUP BY a.audit_id, a.audit_number, a.client_name, s.standard_code
        HAVING COUNT(ar.response_id) > 0
        ORDER BY a.audit_id, s.standard_code
    `);
    r5.recordset.forEach(x => {
        console.log(`  Audit ${x.audit_id} (${x.audit_number}): ${x.risposte} risposte per ${x.standard_code || 'N/A'}`);
    });

    console.log(`\n${'='.repeat(50)}`);
    if (issues === 0) {
        console.log('✅ DB CONSISTENTE — Nessun problema rilevato');
    } else {
        console.log(`❌ ${issues} PROBLEMA/I RILEVATI — Correzione necessaria`);
    }

    await pool.close();
    process.exit(issues > 0 ? 1 : 0);
}).catch(e => { console.error(e.message); process.exit(1); });
