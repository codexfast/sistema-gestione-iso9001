/**
 * Setup organizzazione test per multi-tenant E2E
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

async function setupTestOrg() {
    try {
        const pool = await sql.connect(config);

        // Verifica se organizzazione test esiste già
        const existing = await pool.request()
            .input('code', sql.NVarChar, 'TEST_ORG_B')
            .query('SELECT organization_id FROM organizations WHERE organization_code = @code');

        if (existing.recordset.length > 0) {
            console.log('✅ Organizzazione TEST_ORG_B già esistente (ID:', existing.recordset[0].organization_id, ')');
            return existing.recordset[0].organization_id;
        }

        // Crea nuova organizzazione
        const result = await pool.request()
            .input('code', sql.NVarChar, 'TEST_ORG_B')
            .input('name', sql.NVarChar, 'Organizzazione Test B')
            .input('email', sql.NVarChar, 'test-b@sgq.local')
            .query(`
        INSERT INTO organizations (organization_code, organization_name, contact_email, is_active)
        OUTPUT INSERTED.organization_id
        VALUES (@code, @name, @email, 1)
      `);

        console.log('✅ Organizzazione TEST_ORG_B creata (ID:', result.recordset[0].organization_id, ')');
        return result.recordset[0].organization_id;

    } catch (error) {
        console.error('❌ Errore:', error.message);
        process.exit(1);
    } finally {
        sql.close();
    }
}

setupTestOrg();
