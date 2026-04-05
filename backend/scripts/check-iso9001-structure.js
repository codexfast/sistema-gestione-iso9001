require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');
sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {

    console.log('=== Sezioni ISO 9001 ===');
    const sec = await pool.request().query(`
        SELECT section_id, section_code, section_title, display_order
        FROM checklist_sections WHERE standard_id=1 ORDER BY display_order
    `);
    sec.recordset.forEach(r => console.log(`  [${r.section_code}] ${r.section_title} (order:${r.display_order})`));

    console.log('\n=== Domande ISO 9001 per sezione ===');
    const q = await pool.request().query(`
        SELECT section_code, COUNT(*) as n, MIN(LEFT(question_text,60)) as prima
        FROM checklist_questions WHERE standard_id=1 AND is_active=1
        GROUP BY section_code ORDER BY MIN(display_order)
    `);
    q.recordset.forEach(r => console.log(`  ${r.section_code}: ${r.n} domande — "${r.prima}..."`));

    console.log('\n=== Domande clausola 7 (per vedere se ci sono 7.1.x) ===');
    const q7 = await pool.request().query(`
        SELECT question_id, section_code, display_order, LEFT(question_text,80) as testo
        FROM checklist_questions WHERE standard_id=1 AND is_active=1 AND section_code='clause7'
        ORDER BY display_order
    `);
    q7.recordset.forEach(r => console.log(`  #${r.question_id} [${r.section_code}] ${r.testo}`));

    console.log('\n=== Domande clausola 5 ===');
    const q5 = await pool.request().query(`
        SELECT question_id, section_code, display_order, LEFT(question_text,80) as testo
        FROM checklist_questions WHERE standard_id=1 AND is_active=1 AND section_code='clause5'
        ORDER BY display_order
    `);
    q5.recordset.forEach(r => console.log(`  #${r.question_id} [${r.section_code}] ${r.testo}`));

    console.log('\n=== Domande clausola 6 ===');
    const q6 = await pool.request().query(`
        SELECT question_id, section_code, display_order, LEFT(question_text,80) as testo
        FROM checklist_questions WHERE standard_id=1 AND is_active=1 AND section_code='clause6'
        ORDER BY display_order
    `);
    q6.recordset.forEach(r => console.log(`  #${r.question_id} [${r.section_code}] ${r.testo}`));

    console.log('\n=== Domande clausola 8 (per vedere 8.5) ===');
    const q8 = await pool.request().query(`
        SELECT question_id, section_code, display_order, LEFT(question_text,80) as testo
        FROM checklist_questions WHERE standard_id=1 AND is_active=1 AND section_code='clause8'
        ORDER BY display_order
    `);
    q8.recordset.forEach(r => console.log(`  #${r.question_id} [${r.section_code}] ${r.testo}`));

    await pool.close(); process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
