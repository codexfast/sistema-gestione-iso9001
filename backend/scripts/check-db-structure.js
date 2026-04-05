require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, port:parseInt(process.env.DB_PORT||c.port), database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');
sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {

    const cols = await pool.request().query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='companies' ORDER BY ORDINAL_POSITION`);
    console.log('=== Colonne companies ===');
    cols.recordset.forEach(r => console.log(' ', r.COLUMN_NAME, '(' + r.DATA_TYPE + ')'));

    const std = await pool.request().query(`SELECT standard_id, standard_code, standard_name FROM standards ORDER BY standard_id`);
    console.log('\n=== Standards ===');
    std.recordset.forEach(r => console.log(' ', r.standard_id, r.standard_code, '-', r.standard_name));

    const sec = await pool.request().query(`SELECT section_id, standard_id, section_code, section_title FROM checklist_sections ORDER BY standard_id, display_order`);
    console.log('\n=== Sezioni (tutte) ===');
    sec.recordset.forEach(r => console.log(' ', r.section_id, '[std:'+r.standard_id+']', r.section_code, '-', r.section_title));

    await pool.close();
    process.exit(0);
}).catch(e => { console.error('ERR:', e.message); process.exit(1); });
