/**
 * Rollback Migration 024: report_templates + report_template_assignments
 * Eseguire SOLO se necessario rollback Phase 1
 * Ordine: prima assignments (FK), poi templates
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
    console.log('Rollback migration 024...\n');

    const hasAssign = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'report_template_assignments'");
    if (hasAssign.recordset.length > 0) {
      await pool.request().query('DROP TABLE dbo.report_template_assignments');
      console.log('[OK] Tabella report_template_assignments eliminata');
    } else {
      console.log('[--] report_template_assignments non esiste');
    }

    const hasTemplates = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'report_templates'");
    if (hasTemplates.recordset.length > 0) {
      await pool.request().query('DROP TABLE dbo.report_templates');
      console.log('[OK] Tabella report_templates eliminata');
    } else {
      console.log('[--] report_templates non esiste');
    }

    console.log('\n=== ROLLBACK 024 COMPLETATO ===');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
