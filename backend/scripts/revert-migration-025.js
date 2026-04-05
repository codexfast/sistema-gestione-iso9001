/**
 * Rollback Migration 025: custom_checklists e dipendenze
 * Eseguire SOLO se necessario rollback Phase 4
 * Ordine: rispettare FK (prima dipendenti, poi tabelle principali)
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
    console.log('Rollback migration 025...\n');

    const dropFk = async (table, fkName) => {
      try {
        const exists = await pool.request().query(
          `SELECT 1 FROM sys.foreign_keys WHERE name = '${fkName}'`
        );
        if (exists.recordset.length === 0) {
          console.log('[--]', fkName, 'non esiste, skip');
          return;
        }
        await pool.request().query(`ALTER TABLE dbo.${table} DROP CONSTRAINT ${fkName}`);
        console.log('[OK] FK', fkName, 'rimossa');
      } catch (e) {
        console.error('Errore drop', fkName, ':', e.message);
        throw e;
      }
    };

    const dropCol = async (table, col) => {
      const exists = await pool.request().query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${col}'`
      );
      if (exists.recordset.length === 0) {
        console.log('[--]', table + '.' + col, 'non esiste, skip');
        return;
      }
      await pool.request().query(`ALTER TABLE dbo.${table} DROP COLUMN ${col}`);
      console.log('[OK] Colonna', table + '.' + col, 'rimossa');
    };

    const dropTable = async (name) => {
      const exists = await pool.request().query(`SELECT 1 FROM sys.tables WHERE name = '${name}'`);
      if (exists.recordset.length === 0) {
        console.log('[--]', name, 'non esiste, skip');
        return;
      }
      await pool.request().query(`DROP TABLE dbo.${name}`);
      console.log('[OK] Tabella', name, 'eliminata');
    };

    // 1. FK report_template_assignments
    await dropFk('report_template_assignments', 'FK_rta_custom_checklist');

    // 2. Colonna attachments.custom_item_id
    await dropFk('attachments', 'FK_attachments_custom_item');
    await dropCol('attachments', 'custom_item_id');

    // 3. Tabella audit_custom_checklist_responses
    await dropTable('audit_custom_checklist_responses');

    // 4. Colonna audits.custom_checklist_id
    await dropFk('audits', 'FK_audits_custom_checklist');
    await dropCol('audits', 'custom_checklist_id');

    // 5. Tabelle custom (ordine per FK)
    await dropTable('custom_checklist_items');
    await dropTable('custom_checklist_sections');
    await dropTable('custom_checklists');

    console.log('\n=== ROLLBACK 025 COMPLETATO ===');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
