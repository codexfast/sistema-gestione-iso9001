/**
 * Backup Database SGQ_ISO9001
 * Esporta schema + dati critici prima di migration (es. Phase 1 roadmap)
 *
 * Uso: node backend/scripts/backup-db.js
 *
 * Output:
 *   - database/backups/schema_YYYYMMDD_HHmmss.sql  (se export-schema.ps1 disponibile)
 *   - database/backups/data_YYYYMMDD_HHmmss/       (JSON per tabella)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const configs = require(path.join(__dirname, '..', 'config', 'database.json'));
const env = process.env.NODE_ENV || 'development';
let c = configs[env] || configs.development;

if (process.env.DB_SERVER) {
  c = {
    ...c,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT || c.port),
    database: process.env.DB_DATABASE || c.database,
    user: process.env.DB_USER || c.user,
    password: process.env.DB_PASSWORD || c.password,
  };
}

const sql = require('mssql');

// Tabelle da esportare (ordine rispettando FK: prima tabelle senza dipendenze)
const TABLES_TO_EXPORT = [
  'organizations',
  'users',
  'standards',
  'checklist_sections',
  'checklist_questions',
  'response_options',
  'auditor_orgs',
  'companies',
  'audits',
  'audit_standards',
  'audit_responses',
  'non_conformities',
  'attachments',
  'pending_issues',
  'audit_history',
  'sync_metadata',
  'user_standards',
];

function escapeJson(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && val.constructor.name === 'Object') return val;
  return val;
}

async function exportTableData(pool, tableName, outputDir) {
  try {
    const result = await pool.request().query(`SELECT * FROM [${tableName}]`);
    const rows = result.recordset.map((r) => {
      const obj = {};
      for (const [k, v] of Object.entries(r)) {
        obj[k] = escapeJson(v);
      }
      return obj;
    });
    const outPath = path.join(outputDir, `${tableName}.json`);
    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
    return rows.length;
  } catch (err) {
    // Tabella potrebbe non esistere (es. user_standards se migration non eseguita)
    console.warn(`  ⚠ ${tableName}: ${err.message}`);
    return -1;
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const backupDir = path.join(__dirname, '..', '..', 'database', 'backups');
  const dataDir = path.join(backupDir, `data_${timestamp}`);

  console.log('============================================');
  console.log('BACKUP DATABASE SGQ_ISO9001');
  console.log('============================================\n');
  console.log(`Server: ${c.server}:${c.port}`);
  console.log(`Database: ${c.database}`);
  console.log(`Timestamp: ${timestamp}\n`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  fs.mkdirSync(dataDir, { recursive: true });

  // 1. Schema export (PowerShell - opzionale)
  const schemaFile = path.join(backupDir, `schema_${timestamp}.sql`);
  const ps1Path = path.join(__dirname, '..', '..', 'database', 'scripts', 'export-schema.ps1');
  if (fs.existsSync(ps1Path)) {
    try {
      execSync(
        `powershell -ExecutionPolicy Bypass -File "${ps1Path}" -OutputFile "${schemaFile}"`,
        { stdio: 'inherit' }
      );
      console.log(`\n✅ Schema esportato: ${schemaFile}`);
    } catch (e) {
      console.warn('\n⚠ Export schema PowerShell fallito (continua con dati)');
    }
  } else {
    console.log('⚠ export-schema.ps1 non trovato, salto export schema');
  }

  // 2. Data export
  console.log('\n📋 Export dati...');
  const pool = await sql.connect({
    server: c.server,
    port: c.port || 1433,
    database: c.database,
    user: c.user,
    password: c.password,
    options: { trustServerCertificate: true, encrypt: true },
  });

  let totalRows = 0;
  for (const table of TABLES_TO_EXPORT) {
    const count = await exportTableData(pool, table, dataDir);
    if (count >= 0) {
      console.log(`  ${table}: ${count} righe`);
      totalRows += count;
    }
  }

  await pool.close();

  // Manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    database: c.database,
    server: c.server,
    tables: TABLES_TO_EXPORT,
    totalRows,
  };
  fs.writeFileSync(
    path.join(dataDir, '_manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  console.log('\n============================================');
  console.log(`✅ Backup completato: ${dataDir}`);
  console.log(`   Totale righe esportate: ${totalRows}`);
  console.log('============================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Errore backup:', err.message);
  process.exit(1);
});
