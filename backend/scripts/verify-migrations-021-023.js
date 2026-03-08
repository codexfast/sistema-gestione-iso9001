/**
 * Verifica stato migrations 021 e 023 — ISO 3834-2 e RDP_MSN
 * Esegui: node backend/scripts/verify-migrations-021-023.js
 */
require('dotenv').config();
const path = require('path');
const configs = JSON.parse(require('fs').readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) {
  c = { ...c, server: process.env.DB_SERVER, port: parseInt(process.env.DB_PORT || c.port), database: process.env.DB_DATABASE || c.database, user: process.env.DB_USER || c.user, password: process.env.DB_PASSWORD || c.password };
}
const sql = require('mssql');

sql.connect({
  server: c.server, port: c.port || 1433, database: c.database,
  user: c.user, password: c.password,
  options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {
  console.log('=== VERIFICA MIGRATIONS 021 / 023 ===\n');

  // 1. Standards
  const stds = await pool.request().query(`
    SELECT standard_id, standard_code, standard_name
    FROM standards
    WHERE standard_code IN ('ISO_3834_2', 'RDP_MSN')
    ORDER BY standard_id
  `);
  console.log('1. STANDARD ISO 3834 / RDP_MSN:');
  if (stds.recordset.length === 0) {
    console.log('   ❌ Nessuno standard ISO_3834_2 o RDP_MSN trovato');
  } else {
    stds.recordset.forEach(s => console.log(`   ✅ ID ${s.standard_id}: ${s.standard_code} — ${s.standard_name}`));
  }

  // 2. Sezioni per standard 6 (ISO 3834-2)
  const sec6 = await pool.request().query(`
    SELECT section_code, section_title, display_order
    FROM checklist_sections
    WHERE standard_id = 6 AND is_active = 1
    ORDER BY display_order
  `);
  console.log('\n2. SEZIONI ISO 3834-2 (standard_id=6):');
  if (sec6.recordset.length === 0) {
    console.log('   ❌ Nessuna sezione — migration 021 incompleta');
  } else {
    sec6.recordset.forEach(s => console.log(`   ✅ ${s.section_code}: ${s.section_title}`));
  }

  // 3. Domande ISO 3834-2
  const q6 = await pool.request().query(`
    SELECT section_code, COUNT(*) AS n
    FROM checklist_questions
    WHERE standard_id = 6 AND is_active = 1
    GROUP BY section_code
    ORDER BY MIN(display_order)
  `);
  const tot6 = q6.recordset.reduce((sum, r) => sum + r.n, 0);
  console.log('\n3. DOMANDE ISO 3834-2 (attese: 22):');
  if (tot6 === 0) {
    console.log('   ❌ Nessuna domanda — migration 021 non ha inserito le domande');
  } else {
    q6.recordset.forEach(r => console.log(`   ${r.section_code}: ${r.n} domande`));
    console.log(`   Totale: ${tot6} ${tot6 === 22 ? '✅' : '⚠️ (attese 22)'}`);
  }

  // 4. Sezioni e domande RDP_MSN (standard_id=7)
  const sec7 = await pool.request().query(`
    SELECT section_code, section_title
    FROM checklist_sections
    WHERE standard_id = 7 AND is_active = 1
    ORDER BY display_order
  `);
  const q7 = await pool.request().query(`
    SELECT COUNT(*) AS n FROM checklist_questions WHERE standard_id = 7 AND is_active = 1
  `);
  console.log('\n4. RDP_MSN (standard_id=7):');
  console.log(`   Sezioni: ${sec7.recordset.length} (attese: 9 — 3834_s4, s7, s10, s11, s12, s14, s15, s16, s17)`);
  console.log(`   Domande: ${q7.recordset[0].n} (attese: 36)`);
  if (sec7.recordset.length === 0 && q7.recordset[0].n === 0) {
    console.log('   ⚠️ Migration 023 inserisce solo lo standard, NON sezioni/domande.');
    console.log('   → Serve migration aggiuntiva per RDP_MSN (36 domande in 9 sezioni).');
  }

  // 5. API GET /checklist/questions/all — sample
  const sample6 = await pool.request().query(`
    SELECT TOP 3 cq.question_id, cq.section_code, cq.display_order AS question_order
    FROM checklist_questions cq
    JOIN checklist_sections cs ON cs.section_code = cq.section_code AND cs.standard_id = cq.standard_id
    WHERE cq.standard_id = 6 AND cq.is_active = 1 AND cs.is_active = 1
    ORDER BY cs.display_order, cq.display_order
  `);
  console.log('\n5. SAMPLE API standard_id=6 (prime 3):');
  sample6.recordset.forEach(r => console.log(`   question_id=${r.question_id} section=${r.section_code} order=${r.question_order}`));

  await pool.close();
  console.log('\n=== FINE VERIFICA ===');
  process.exit(0);
}).catch(e => {
  console.error('❌ Errore:', e.message);
  process.exit(1);
});
