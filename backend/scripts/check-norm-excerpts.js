/**
 * Verifica norm_excerpt nel DB per ISO 14001
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
    const r = await pool.request().query(`
        SELECT
            question_id,
            display_order,
            LEFT(question_text, 50) AS testo,
            LEFT(ISNULL(norm_excerpt,''), 100) AS stralcio,
            CASE WHEN norm_excerpt IS NULL OR LTRIM(RTRIM(norm_excerpt)) = '' THEN 0 ELSE 1 END AS compilato
        FROM checklist_questions
        WHERE standard_id = 2 AND is_active = 1
        ORDER BY display_order
    `);

    const tot  = r.recordset.length;
    const comp = r.recordset.filter(x => x.compilato).length;
    console.log(`\nISO 14001 — ${comp}/${tot} stralci compilati\n${'='.repeat(60)}`);
    r.recordset.forEach(x => {
        const flag = x.compilato ? '[OK]' : '[--]';
        console.log(`${flag} id:${x.question_id} ord:${x.display_order} — ${x.testo}`);
        if (x.compilato) console.log(`     → ${x.stralcio}...`);
    });
    await pool.close();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
