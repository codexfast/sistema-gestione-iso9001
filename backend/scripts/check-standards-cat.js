require('dotenv').config();
const fs = require('fs'), path = require('path');
const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8')).production;
const sql = require('mssql');
sql.connect({ server: c.server, port: c.port||1433, database: c.database, user: c.user, password: c.password, options: { trustServerCertificate: true, encrypt: true } })
.then(async p => {
    const r = await p.request().query('SELECT standard_id, standard_code, category FROM standards ORDER BY standard_id');
    r.recordset.forEach(x => console.log(`ID:${x.standard_id} ${x.standard_code} category=${x.category}`));
    await p.close();
}).catch(e => console.error(e.message));
