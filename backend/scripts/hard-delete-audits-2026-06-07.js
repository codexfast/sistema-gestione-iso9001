/**
 * Hard delete audit di test 2026-06 e 2026-07 in produzione.
 *
 * ATTENZIONE: elimina definitivamente gli audit e tutti i dati collegati.
 *
 * Uso:
 *   NODE_ENV=production node backend/scripts/hard-delete-audits-2026-06-07.js
 */

const { getPool } = require('../src/config/database');

async function run() {
  const pool = await getPool();

  const idsRes = await pool.request().query(`
    SELECT audit_id, audit_number
    FROM audits
    WHERE audit_number IN ('2026-06', '2026-07')
  `);

  if (idsRes.recordset.length === 0) {
    console.log('Nessun audit 2026-06 / 2026-07 trovato. Nulla da fare.');
    process.exit(0);
  }

  console.log('Audit da eliminare:');
  console.table(idsRes.recordset);

  const auditIds = idsRes.recordset.map((r) => r.audit_id);

  const idList = auditIds.join(',');

  console.log('\nElimino dati collegati e audit...');

  await pool.request().query(`
    DELETE FROM attachments WHERE audit_id IN (${idList});
    DELETE FROM audit_responses WHERE audit_id IN (${idList});
    DELETE FROM pending_issues WHERE audit_id IN (${idList});
    DELETE FROM audit_standards WHERE audit_id IN (${idList});
    DELETE FROM non_conformities WHERE audit_id IN (${idList});
    DELETE FROM audit_statistics WHERE audit_id IN (${idList});
    DELETE FROM audits WHERE audit_id IN (${idList});
  `);

  const check = await pool.request().query(`
    SELECT audit_id, audit_number FROM audits
    WHERE audit_number IN ('2026-06', '2026-07')
  `);

  console.log('\nVerifica finale (deve essere vuota):');
  console.table(check.recordset);

  process.exit(0);
}

run().catch((err) => {
  console.error('Errore hard-delete 2026-06/07:', err);
  process.exit(1);
});

