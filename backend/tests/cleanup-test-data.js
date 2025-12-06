/**
 * Cleanup dati test multi-tenant
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Carica config database
const configPath = path.join(__dirname, '..', 'config', 'database.json');
const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const dbConfig = configs.development;

const config = {
    server: dbConfig.server,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    options: dbConfig.options
};

async function cleanup() {
    try {
        const pool = await sql.connect(config);

        // Elimina audit test PRIMA (hanno FK verso users)
        const auditsResult = await pool.request().query(`
      DELETE FROM audits 
      WHERE audit_number IN ('AUDIT-A-001', 'AUDIT-B-001')
    `);
        console.log(`✅ Eliminati ${auditsResult.rowsAffected[0]} audit test`);

        // Elimina utenti test
        const usersResult = await pool.request().query(`
      DELETE FROM users 
      WHERE email IN ('user.a@default-org.test', 'user.b@test-org-b.test')
    `);
        console.log(`✅ Eliminati ${usersResult.rowsAffected[0]} utenti test`); console.log('✅ Cleanup completato!');

    } catch (error) {
        console.error('❌ Errore:', error.message);
        process.exit(1);
    } finally {
        sql.close();
    }
}

cleanup();
