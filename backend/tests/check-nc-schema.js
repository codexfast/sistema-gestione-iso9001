/**
 * Verifica schema tabella non_conformities
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

async function checkSchema() {
    try {
        const pool = await sql.connect(config);

        // Verifica colonne tabella
        const columns = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'non_conformities'
      ORDER BY ORDINAL_POSITION
    `);

        console.log('\n📋 Schema tabella non_conformities:\n');
        columns.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Verifica se tabella esiste
        if (columns.recordset.length === 0) {
            console.log('\n❌ Tabella non_conformities NON ESISTE!');
            console.log('\nCreo la tabella...\n');

            await pool.request().query(`
        CREATE TABLE non_conformities (
          nc_id INT IDENTITY(1,1) PRIMARY KEY,
          nc_uuid UNIQUEIDENTIFIER DEFAULT NEWID() NOT NULL,
          audit_id INT NOT NULL,
          nc_number NVARCHAR(50) NOT NULL UNIQUE,
          section_code NVARCHAR(20) NOT NULL,
          description NVARCHAR(MAX) NOT NULL,
          severity NVARCHAR(20) NOT NULL CHECK (severity IN ('major', 'minor', 'observation')),
          responsible_person NVARCHAR(255) NULL,
          due_date DATE NULL,
          corrective_action NVARCHAR(MAX) NULL,
          verification_notes NVARCHAR(MAX) NULL,
          status NVARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'closed')),
          created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
          updated_at DATETIME2 DEFAULT GETDATE() NOT NULL,
          FOREIGN KEY (audit_id) REFERENCES audits(audit_id) ON DELETE CASCADE
        );
        
        CREATE INDEX IX_non_conformities_audit_id ON non_conformities(audit_id);
        CREATE INDEX IX_non_conformities_status ON non_conformities(status);
        CREATE INDEX IX_non_conformities_severity ON non_conformities(severity);
      `);

            console.log('✅ Tabella non_conformities creata con successo!');
        } else {
            console.log('\n✅ Tabella esiste con', columns.recordset.length, 'colonne');
        }

    } catch (error) {
        console.error('\n❌ Errore:', error.message);
        process.exit(1);
    } finally {
        sql.close();
    }
}

checkSchema();
