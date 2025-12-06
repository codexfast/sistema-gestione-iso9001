/**
 * Verifica schema tabella audits
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

async function checkAuditsSchema() {
    try {
        const pool = await sql.connect(config);

        // Verifica colonne tabella audits
        const columns = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'audits'
      ORDER BY ORDINAL_POSITION
    `);

        console.log('\n📋 Schema tabella audits:\n');
        columns.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Verifica se standard_id esiste
        const hasStandardId = columns.recordset.some(col => col.COLUMN_NAME === 'standard_id');

        if (!hasStandardId) {
            console.log('\n❌ Colonna standard_id NON ESISTE nella tabella audits!');
            console.log('\nLa tabella audits usa multi-standard con junction table audit_standards');
            console.log('Dobbiamo prendere il primo standard_id dalla junction table.\n');
        } else {
            // Verifica valori audit di test
            const testAudits = await pool.request().query(`
        SELECT audit_id, audit_number, standard_id, organization_id
        FROM audits
        WHERE audit_number IN ('AUDIT-A-001', 'AUDIT-B-001')
      `);

            console.log('\n📋 Audit di test:\n');
            testAudits.recordset.forEach(a => {
                console.log(`  - ${a.audit_number}: audit_id=${a.audit_id}, standard_id=${a.standard_id || 'NULL'}, org=${a.organization_id}`);
            });
        }

    } catch (error) {
        console.error('\n❌ Errore:', error.message);
        process.exit(1);
    } finally {
        sql.close();
    }
}

checkAuditsSchema();
