/**
 * run-migration-030.js
 * Esegue la migration 030 (notifications_config) sul DB di produzione.
 * Usa config/database.json per le credenziali (come gli altri script migration).
 */

const sql = require('mssql');
const fs  = require('fs');
const path = require('path');

const dbConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/database.json'), 'utf8')
);

const sqlFile = path.join(__dirname, '../../database/migrations/030_notifications_config.sql');

async function runMigration() {
  let pool;
  try {
    console.log('Connessione al database...');
    pool = await sql.connect(dbConfig);
    console.log('Connesso.');

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const batches = sqlContent.split(/\bGO\b/i).map(b => b.trim()).filter(Boolean);

    for (const batch of batches) {
      await pool.request().query(batch);
    }

    console.log('Migration 030 completata con successo.');
  } catch (err) {
    console.error('Errore migration 030:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

runMigration();
