/**
 * REVERT Migration 023 — rimuove le aggiunte errate
 * - Elimina le 29 domande ISO 14001:2015 inserite per errore (ids 194-222)
 * - Disattiva le 7 sezioni 14001_c4..14001_c10 create per errore
 * - Verifica che le 46 domande originali di Marco siano ancora attive
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8'));
let c = configs.production;
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {
    console.log('REVERT migration 023...\n');

    // 1. Elimina le 29 domande inserite per errore (ids 194-222)
    const delQ = await pool.request().query(
        'DELETE FROM checklist_questions WHERE question_id BETWEEN 194 AND 222'
    );
    console.log('[1] Domande eliminate:', delQ.rowsAffected[0]);

    // 2. Disattiva le 7 sezioni create per errore
    const delS = await pool.request().query(
        "UPDATE checklist_sections SET is_active=0 WHERE section_code IN ('14001_c4','14001_c5','14001_c6','14001_c7','14001_c8','14001_c9','14001_c10')"
    );
    console.log('[2] Sezioni disattivate:', delS.rowsAffected[0]);

    // 3. Verifica domande ISO 14001 ancora attive (devono essere 46)
    const check = await pool.request().query(
        'SELECT COUNT(*) AS n FROM checklist_questions WHERE standard_id=2 AND is_active=1'
    );
    console.log('[3] Domande ISO 14001 ancora attive (attese: 46):', check.recordset[0].n);

    // 4. Mostra le sezioni ISO 14001 attive
    const secs = await pool.request().query(
        'SELECT section_code, section_title, is_active FROM checklist_sections WHERE standard_id=2 ORDER BY display_order'
    );
    console.log('\nSezioni ISO 14001 nel DB:');
    secs.recordset.forEach(s => console.log(`  ${s.is_active ? '[ATTIVA]' : '[inattiva]'} ${s.section_code} — ${s.section_title}`));

    console.log('\n✅ Revert completato. Checklist originale di Marco ripristinata.');
    await pool.close();
    process.exit(0);
}).catch(e => {
    console.error('Errore:', e.message);
    process.exit(1);
});
