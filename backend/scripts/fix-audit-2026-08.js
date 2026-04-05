/**
 * Script di manutenzione: isola audit con numero '2026-08'
 *
 * Obiettivo:
 * - evitare conflitti con il vincolo UQ_audits_number durante la sync
 * - senza perdere traccia storica dei record di test
 *
 * Azione:
 * - trova tutti gli audit con audit_number = '2026-08'
 * - per ciascuno:
 *   - imposta is_deleted = 1
 *   - rinomina audit_number in '2026-08-OLD-{audit_id}'
 *
 * Uso:
 *   NODE_ENV=production node backend/scripts/fix-audit-2026-08.js
 */

const { getPool } = require('../src/config/database');

async function run() {
  const pool = await getPool();

  console.log("=== Ricerca audit con numero '2026-08' ===");
  const res = await pool.request().query(`
    SELECT audit_id, audit_number, client_name, status, is_deleted
    FROM audits
    WHERE audit_number = '2026-08'
  `);

  if (res.recordset.length === 0) {
    console.log("Nessun audit trovato con numero 2026-08. Nulla da fare.");
    process.exit(0);
  }

  console.table(res.recordset);

  console.log('\nAggiornamento audit (soft delete + rename numero)...');

  for (const row of res.recordset) {
    const newNumber = `2026-08-OLD-${row.audit_id}`;
    console.log(
      `- audit_id=${row.audit_id}: audit_number '${row.audit_number}' -> '${newNumber}', is_deleted=1`
    );
    await pool
      .request()
      .input('newNumber', newNumber)
      .input('audit_id', row.audit_id)
      .query(
      `
      UPDATE audits
      SET audit_number = @newNumber,
          is_deleted = 1,
          updated_at = GETDATE()
      WHERE audit_id = @audit_id
      `
      );
  }

  console.log('\nVerifica finale:');
  const check = await pool.request().query(`
    SELECT audit_id, audit_number, client_name, status, is_deleted
    FROM audits
    WHERE audit_number LIKE '2026-08-OLD-%'
  `);
  console.table(check.recordset);

  process.exit(0);
}

run().catch((err) => {
  console.error('Errore fix-audit-2026-08:', err);
  process.exit(1);
});

