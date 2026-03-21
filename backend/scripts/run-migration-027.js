/**
 * Migration 027: tabella audit_locks (lock pessimistico multi-utente)
 * Eseguire: node backend/scripts/run-migration-027.js
 */
require('dotenv').config();
const fs = require('fs');
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
    console.log('Connesso al DB. Esecuzione migration 027 (audit_locks)...\n');

    const sqlPath = path.join(__dirname, '..', '..', 'database', 'migrations', '027_audit_locks.sql');
    const sqlText = fs.readFileSync(sqlPath, 'utf8');
    await pool.request().query(sqlText);

    const chk = await pool.request().query(
      "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'audit_locks'",
    );
    console.log('\n=== VERIFICA ===');
    console.log('  Tabella audit_locks:', chk.recordset[0].n > 0 ? 'OK' : 'MANCANTE');
    console.log('\n=== MIGRATION 027 COMPLETATA ===');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
