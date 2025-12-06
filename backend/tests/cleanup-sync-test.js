/**
 * Cleanup specifico per test offline sync
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

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

        // Elimina audit SYNC (CASCADE elimina anche audit_standards)
        const auditsResult = await pool.request().query(`
            DELETE FROM audits 
            WHERE audit_number = 'AUDIT-SYNC-001'
        `);
        console.log(`✅ Eliminati ${auditsResult.rowsAffected[0]} audit sync test`);

        // Elimina utenti sync test
        const usersResult = await pool.request().query(`
            DELETE FROM users 
            WHERE email IN ('sync.user.a@test.local', 'sync.user.b@test.local')
        `);
        console.log(`✅ Eliminati ${usersResult.rowsAffected[0]} utenti sync test`);

        console.log('✅ Cleanup sync test completato!\n');

        await sql.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Errore cleanup:', error.message);
        process.exit(1);
    }
}

cleanup();
