/**
 * run-migration-030.js
 * Esegue la migration 030 (notifications_config) sul DB di produzione.
 * Usa config/database.json per le credenziali (come gli altri script migration).
 */

const sql = require('mssql');
const fs  = require('fs');
const path = require('path');

const dbConfigAll = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/database.json'), 'utf8')
);
// database.json ha struttura {development:{...}, production:{...}} — usa production sul VPS
const env = process.env.NODE_ENV || 'production';
const dbConfig = dbConfigAll[env] || dbConfigAll.production || dbConfigAll;

// SQL inline per evitare dipendenze da path relativi sul VPS
const SQL_030 = `
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE name = 'notifications_config' AND type = 'U'
)
BEGIN
    CREATE TABLE notifications_config (
        id                  INT IDENTITY(1,1) NOT NULL,
        organization_id     INT            NOT NULL,
        recipients_email    NVARCHAR(1000) NOT NULL,
        alert_days_1        INT            NOT NULL DEFAULT 30,
        alert_days_2        INT            NOT NULL DEFAULT 7,
        send_time           NVARCHAR(5)    NOT NULL DEFAULT '08:00',
        alert_doc_expiry    BIT            NOT NULL DEFAULT 1,
        alert_nc_open       BIT            NOT NULL DEFAULT 1,
        alert_qualif_expiry BIT            NOT NULL DEFAULT 1,
        enabled             BIT            NOT NULL DEFAULT 1,
        created_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_notifications_config PRIMARY KEY (id),
        CONSTRAINT UQ_notifications_config_org UNIQUE (organization_id)
    );
    PRINT 'Tabella notifications_config creata.';
END
ELSE
    PRINT 'Tabella notifications_config gia esistente - skip.';
`;

const SQL_030_FK = `
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_notifications_config_org')
    ALTER TABLE notifications_config
    ADD CONSTRAINT FK_notifications_config_org
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id);
`;

async function runMigration() {
  let pool;
  try {
    console.log('Connessione al database...');
    pool = await sql.connect(dbConfig);
    console.log('Connesso.');

    const batches = [SQL_030, SQL_030_FK];

    for (const batch of batches) {
      const result = await pool.request().query(batch);
      if (result.recordset) console.log(result.recordset);
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
