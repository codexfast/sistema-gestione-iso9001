require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, port:parseInt(process.env.DB_PORT||c.port), database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');
sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {

    console.log('=== Domande per standard ===');
    const counts = await pool.request().query(`
        SELECT s.standard_id, s.standard_code, COUNT(q.question_id) AS domande
        FROM standards s
        LEFT JOIN checklist_questions q ON s.standard_id = q.standard_id AND q.is_active = 1
        GROUP BY s.standard_id, s.standard_code
        ORDER BY s.standard_id
    `);
    counts.recordset.forEach(r => console.log('  ' + r.standard_code + ': ' + r.domande + ' domande'));

    console.log('');
    console.log('=== Prime 3 domande ISO 45001 ===');
    const q45 = await pool.request().query(`
        SELECT TOP 3 question_id, section_code, LEFT(question_text, 100) AS testo
        FROM checklist_questions
        WHERE standard_id = 3 AND is_active = 1
        ORDER BY display_order
    `);
    if (q45.recordset.length === 0) {
        console.log('  ISO 45001: NESSUNA domanda nel DB');
    } else {
        q45.recordset.forEach(r => console.log('  [' + r.section_code + '] ' + r.testo));
    }

    console.log('');
    console.log('=== Sezioni ISO 45001 ===');
    const sec45 = await pool.request().query(`
        SELECT section_code, section_title FROM checklist_sections WHERE standard_id = 3 ORDER BY display_order
    `);
    if (sec45.recordset.length === 0) {
        console.log('  Nessuna sezione per ISO 45001');
    } else {
        sec45.recordset.forEach(r => console.log('  ' + r.section_code + ': ' + r.section_title));
    }

    await pool.close();
    process.exit(0);
}).catch(e => { console.error('ERR:', e.message); process.exit(1); });
