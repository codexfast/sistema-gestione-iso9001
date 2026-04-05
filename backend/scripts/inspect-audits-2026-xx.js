/**
 * Ispezione audit 2026-06 / 2026-07 / 2026-08 su DB produzione
 * Uso: NODE_ENV=production node backend/scripts/inspect-audits-2026-xx.js
 */

const { getPool } = require('../src/config/database');

async function run() {
  const pool = await getPool();

  const res = await pool.request().query(`
    SELECT audit_id, audit_number, client_name, status, is_deleted
    FROM audits
    WHERE audit_number IN ('2026-06', '2026-07', '2026-08')
       OR audit_number LIKE '2026-06-%'
       OR audit_number LIKE '2026-07-%'
       OR audit_number LIKE '2026-08-%'
    ORDER BY audit_number, audit_id
  `);

  console.log('=== AUDITS 2026-06 / 2026-07 / 2026-08 (inclusi OLD) ===');
  console.table(res.recordset);

  process.exit(0);
}

run().catch((err) => {
  console.error('Errore ispezione audits 2026-xx:', err);
  process.exit(1);
});

