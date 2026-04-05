/**
 * Migration 026: Template "Verbale visita" per checklist custom
 * Phase 7 - Report Word per audit con checklist personalizzate
 * Eseguire: node backend/scripts/run-migration-026.js
 */
require('dotenv').config();
const path = require('path');
const configs = require(path.join(__dirname, '..', 'config', 'database.json'));
let c = configs.production || configs.development;
if (process.env.DB_SERVER) {
  c = { ...c, server: process.env.DB_SERVER, database: process.env.DB_DATABASE || c.database, user: process.env.DB_USER || c.user, password: process.env.DB_PASSWORD || c.password };
}
const sql = require('mssql');

const config = { server: c.server, port: c.port || 1433, database: c.database, user: c.user, password: c.password, options: { trustServerCertificate: true, encrypt: true } };

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connesso al DB. Esecuzione migration 026 (Verbale visita template)...\n');

    const hasVerbale = await pool.request().query(
      "SELECT 1 FROM report_templates WHERE organization_id IS NULL AND standard_key = 'custom_checklist'"
    );
    if (hasVerbale.recordset.length === 0) {
      await pool.request().query(`
        INSERT INTO report_templates (organization_id, name, scope, standard_key, file_path, is_system, created_at, updated_at)
        VALUES (NULL, N'Verbale visita (checklist custom)', 'audit', 'custom_checklist', '/templates/VerbaleVisita-generic.docx', 1, GETDATE(), GETDATE())
      `);
      console.log('[OK] Template Verbale visita (custom_checklist) inserito');
    } else {
      console.log('[--] Template Verbale visita gia presente');
    }

    const count = await pool.request().query("SELECT COUNT(*) AS n FROM report_templates WHERE standard_key = 'custom_checklist'");
    console.log('\n=== VERIFICA ===');
    console.log('  Template custom_checklist: ' + count.recordset[0].n + ' riga/e');
    console.log('\n=== MIGRATION 026 COMPLETATA ===');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
