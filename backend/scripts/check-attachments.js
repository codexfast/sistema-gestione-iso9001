require('dotenv').config();
const fs = require('fs');
const path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = { ...c, server: process.env.DB_SERVER, port: parseInt(process.env.DB_PORT || c.port), database: process.env.DB_DATABASE || c.database, user: process.env.DB_USER || c.user, password: process.env.DB_PASSWORD || c.password };

const sql = require('mssql');
sql.connect({ server: c.server, port: c.port || 1433, database: c.database, user: c.user, password: c.password, options: { trustServerCertificate: true, encrypt: true } }).then(async pool => {

    // Struttura colonne
    const cols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='attachments' ORDER BY ORDINAL_POSITION");
    console.log('Colonne attachments:', cols.recordset.map(r => r.COLUMN_NAME).join(', '));
    console.log('');

    // Tutti gli allegati
    const r = await pool.request().query('SELECT * FROM attachments ORDER BY attachment_id');
    if (r.recordset.length === 0) {
        console.log('Nessun allegato nel DB.');
    } else {
        r.recordset.forEach(row => console.log(JSON.stringify(row)));
    }
    await pool.close();
}).catch(e => console.error('ERR:', e.message));
