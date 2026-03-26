/**
 * Migration 028: scope checklist custom per auditor_org (policy B)
 * Eseguire: node backend/scripts/run-migration-028.js
 */
require('dotenv').config();
const path = require('path');
const configs = require(path.join(__dirname, '..', 'config', 'database.json'));
let c = configs.production || configs.development;
if (process.env.DB_SERVER) {
  c = {
    ...c,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE || c.database,
    user: process.env.DB_USER || c.user,
    password: process.env.DB_PASSWORD || c.password,
  };
}
const sql = require('mssql');

const config = {
  server: c.server,
  port: c.port || 1433,
  database: c.database,
  user: c.user,
  password: c.password,
  options: { trustServerCertificate: true, encrypt: true },
};

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connesso al DB. Esecuzione migration 028...\n');

    await pool.request().query(`
      IF COL_LENGTH('custom_checklists', 'auditor_org_id') IS NULL
      BEGIN
          ALTER TABLE custom_checklists
          ADD auditor_org_id INT NULL;
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (
          SELECT 1
          FROM sys.foreign_keys
          WHERE name = 'FK_custom_checklists_auditor_org_id'
      )
      BEGIN
          ALTER TABLE custom_checklists
          ADD CONSTRAINT FK_custom_checklists_auditor_org_id
              FOREIGN KEY (auditor_org_id) REFERENCES auditor_orgs(id);
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = 'IX_custom_checklists_org_auditor_org'
            AND object_id = OBJECT_ID('custom_checklists')
      )
      BEGIN
          CREATE INDEX IX_custom_checklists_org_auditor_org
              ON custom_checklists (organization_id, auditor_org_id, is_active);
      END
    `);

    const verify = await pool.request().query(`
      SELECT
        COL_LENGTH('custom_checklists', 'auditor_org_id') AS has_col,
        (SELECT COUNT(*) FROM sys.foreign_keys WHERE name = 'FK_custom_checklists_auditor_org_id') AS fk_count,
        (SELECT COUNT(*) FROM sys.indexes WHERE name = 'IX_custom_checklists_org_auditor_org' AND object_id = OBJECT_ID('custom_checklists')) AS idx_count
    `);

    const v = verify.recordset[0] || {};
    console.log('[OK] auditor_org_id col length:', v.has_col);
    console.log('[OK] FK present:', v.fk_count);
    console.log('[OK] IDX present:', v.idx_count);
    console.log('\n=== MIGRATION 028 COMPLETATA ===');
  } catch (err) {
    console.error('Errore migration 028:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
