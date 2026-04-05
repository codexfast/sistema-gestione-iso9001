require('dotenv').config();
const fs = require('fs'), path = require('path');
const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8')).production;
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {
    const r = await pool.request().query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='checklist_questions' ORDER BY ORDINAL_POSITION"
    );
    console.log('Colonne checklist_questions:');
    console.log(r.recordset.map(x => x.COLUMN_NAME).join(', '));
    await pool.close();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
