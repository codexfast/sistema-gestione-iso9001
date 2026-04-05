require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');
sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {
    const r = await pool.request().query(`SELECT DISTINCT question_type FROM checklist_questions WHERE is_active=1`);
    console.log('question_type valori:', r.recordset.map(x=>x.question_type));
    const sample = await pool.request().query(`SELECT TOP 3 standard_id, section_code, question_type, is_mandatory, LEFT(question_text,60) AS testo FROM checklist_questions WHERE standard_id=1 ORDER BY display_order`);
    sample.recordset.forEach(r => console.log(r.standard_id, r.section_code, r.question_type, 'mandatory:'+r.is_mandatory, r.testo));
    await pool.close(); process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
