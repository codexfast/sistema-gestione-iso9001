require('dotenv').config();
const fs = require('fs'), path = require('path');
const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8')).production;
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {

    // 1) Verifica tabella audit_standards
    const r1 = await pool.request().query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'audit_standards'"
    );
    console.log('audit_standards esiste:', r1.recordset.length > 0);

    if (r1.recordset.length > 0) {
        const r2 = await pool.request().query('SELECT * FROM audit_standards WHERE audit_id = 4916');
        console.log('Righe audit_standards per 4916:', JSON.stringify(r2.recordset));
    }

    // 2) standard_id degli audit recenti
    const r3 = await pool.request().query(
        'SELECT audit_id, audit_number, standard_id FROM audits WHERE is_deleted=0 ORDER BY created_at DESC'
    );
    console.log('\nstandard_id degli audit:');
    r3.recordset.forEach(x => console.log(`  ID:${x.audit_id} N:${x.audit_number} std:${x.standard_id}`));

    await pool.close();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
