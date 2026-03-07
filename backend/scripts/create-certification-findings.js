/**
 * Migrazione: crea tabella certification_findings
 * Rilievi dell'ente certificatore (ACCREDIA, Bureau Veritas, TÜV, ecc.)
 * Legati all'azienda (company_id), persistono tra un audit e l'altro.
 */
require('dotenv').config();
const sql = require('mssql');
const c = require('../config/database.json').production;

sql.connect({
  server: c.server, port: c.port || 1433, database: c.database,
  user: c.user, password: c.password,
  options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {

  // Verifica se esiste già
  const exists = await pool.request().query(
    "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='certification_findings'"
  );
  if (exists.recordset.length > 0) {
    console.log('Tabella certification_findings già esistente.');
    await pool.close(); return;
  }

  await pool.request().query(`
    CREATE TABLE certification_findings (
      finding_id        INT IDENTITY(1,1) PRIMARY KEY,
      company_id        INT NOT NULL,
      organization_id   INT NOT NULL,
      standard_id       INT NOT NULL DEFAULT 1,
      finding_number    NVARCHAR(50)  NULL,
      finding_type      NVARCHAR(10)  NOT NULL DEFAULT 'NC',  -- NC, OBS, RIM
      clause_ref        NVARCHAR(50)  NULL,
      description       NVARCHAR(MAX) NOT NULL,
      certifying_body   NVARCHAR(100) NULL DEFAULT 'ACCREDIA',
      issue_date        DATE          NULL,
      due_date          DATE          NULL,
      status            NVARCHAR(20)  NOT NULL DEFAULT 'open', -- open, in_progress, closed
      corrective_action NVARCHAR(MAX) NULL,
      evidence          NVARCHAR(MAX) NULL,
      closed_date       DATE          NULL,
      created_by        INT           NULL,
      created_at        DATETIME2     NOT NULL DEFAULT GETDATE(),
      updated_at        DATETIME2     NOT NULL DEFAULT GETDATE(),
      CONSTRAINT CK_cert_findings_type   CHECK (finding_type IN ('NC','OBS','RIM')),
      CONSTRAINT CK_cert_findings_status CHECK (status IN ('open','in_progress','closed'))
    )
  `);
  console.log('OK: tabella certification_findings creata');

  // Indici per le query più comuni
  await pool.request().query(
    'CREATE INDEX IX_cert_findings_company ON certification_findings(company_id, status)'
  );
  await pool.request().query(
    'CREATE INDEX IX_cert_findings_org ON certification_findings(organization_id)'
  );
  console.log('OK: indici creati');

  await pool.close();
}).catch(e => console.error('ERRORE:', e.message));
