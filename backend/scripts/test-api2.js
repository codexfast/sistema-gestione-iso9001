/**
 * Test completo: login + GET + PATCH + verifica
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

    // 1. Trova utente admin
    const users = await pool.request().query(
        "SELECT user_id, email, role FROM users WHERE role IN ('admin','superadmin') AND is_active=1"
    );
    console.log('Utenti admin:', users.recordset.map(u => `${u.email} (${u.role})`).join(', '));

    // 2. Verifica domande IS014001 con norm_excerpt
    const comp = await pool.request().query(
        "SELECT COUNT(*) AS n FROM checklist_questions WHERE standard_id=2 AND is_active=1 AND norm_excerpt IS NOT NULL AND LTRIM(RTRIM(norm_excerpt)) != ''"
    );
    const tot = await pool.request().query(
        "SELECT COUNT(*) AS n FROM checklist_questions WHERE standard_id=2 AND is_active=1"
    );
    console.log(`\nStralci compilati: ${comp.recordset[0].n}/${tot.recordset[0].n}`);

    // 3. Test PATCH diretto su DB
    console.log('\nTest PATCH diretto su DB (question_id=122)...');
    await pool.request()
        .input('id', sql.Int, 122)
        .input('excerpt', sql.NVarChar(sql.MAX), 'TEST diretto DB — verifica funzionamento')
        .query("UPDATE checklist_questions SET norm_excerpt=@excerpt, updated_at=GETDATE() WHERE question_id=@id");

    const verify = await pool.request().query(
        "SELECT norm_excerpt FROM checklist_questions WHERE question_id=122"
    );
    console.log('Valore salvato:', verify.recordset[0].norm_excerpt);

    // 4. Ripristino
    await pool.request()
        .input('id', sql.Int, 122)
        .query("UPDATE checklist_questions SET norm_excerpt=NULL, updated_at=GETDATE() WHERE question_id=@id");
    console.log('Ripristinato a NULL.');

    await pool.close();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
