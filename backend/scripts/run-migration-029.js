/**
 * Migration 029: document_registry — registro universale documenti SGQ
 * Eseguire: node backend/scripts/run-migration-029.js
 */
require('dotenv').config();
const path = require('path');
const sql = require('mssql');

// Legge database.json come fanno tutti gli altri runner del progetto
const configs = require(path.join(__dirname, '..', 'config', 'database.json'));
let c = configs.production || configs.development;

// Override con variabili d'ambiente se presenti
if (process.env.DB_SERVER) {
  c = {
    ...c,
    server:   process.env.DB_SERVER,
    port:     parseInt(process.env.DB_PORT || c.port || '11043'),
    database: process.env.DB_DATABASE || c.database,
    user:     process.env.DB_USER     || c.user,
    password: process.env.DB_PASSWORD || c.password,
  };
}

const config = {
  server:   c.server,
  port:     c.port || 11043,
  database: c.database,
  user:     c.user,
  password: c.password,
  options:  { trustServerCertificate: true, encrypt: c.options?.encrypt ?? true },
};

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connesso al DB. Esecuzione migration 029...\n');

    // 1. Crea tabella principale
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.objects
        WHERE name = 'document_registry' AND type = 'U'
      )
      BEGIN
        CREATE TABLE document_registry (
          id                    INT IDENTITY(1,1) NOT NULL,
          organization_id       INT            NOT NULL,
          company_id            INT            NULL,
          auditor_org_id        INT            NULL,
          standard_id           INT            NULL,
          clause_ref            NVARCHAR(30)   NULL,
          doc_type              NVARCHAR(50)   NOT NULL,
          doc_code              NVARCHAR(100)  NULL,
          title                 NVARCHAR(500)  NOT NULL,
          revision              NVARCHAR(20)   NULL,
          status                NVARCHAR(30)   NOT NULL
            CONSTRAINT CK_doc_registry_status
            CHECK (status IN (
              'vigente','in_revisione','obsoleto','in_approvazione'
            )),
          issue_date            DATE           NULL,
          expiry_date           DATE           NULL,
          responsible           NVARCHAR(255)  NULL,
          retention_years       INT            NULL,
          attachment_id         INT            NULL,
          import_status         NVARCHAR(20)   NOT NULL DEFAULT 'active'
            CONSTRAINT CK_doc_registry_import_status
            CHECK (import_status IN ('ai_draft','verified','active')),
          extraction_confidence DECIMAL(3,2)   NULL,
          notes                 NVARCHAR(MAX)  NULL,
          created_by            INT            NULL,
          created_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
          updated_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
          CONSTRAINT PK_document_registry PRIMARY KEY (id)
        );
        PRINT 'Tabella document_registry creata.';
      END
    `);
    console.log('[OK] Tabella document_registry');

    // 2. Foreign keys (idempotenti)
    const fks = [
      {
        name: 'FK_doc_registry_organization',
        sql: 'ALTER TABLE document_registry ADD CONSTRAINT FK_doc_registry_organization FOREIGN KEY (organization_id) REFERENCES organizations(organization_id)',
      },
      {
        name: 'FK_doc_registry_company',
        sql: 'ALTER TABLE document_registry ADD CONSTRAINT FK_doc_registry_company FOREIGN KEY (company_id) REFERENCES companies(id)',
      },
      {
        name: 'FK_doc_registry_auditor_org',
        sql: 'ALTER TABLE document_registry ADD CONSTRAINT FK_doc_registry_auditor_org FOREIGN KEY (auditor_org_id) REFERENCES auditor_orgs(id)',
      },
      {
        name: 'FK_doc_registry_standard',
        sql: 'ALTER TABLE document_registry ADD CONSTRAINT FK_doc_registry_standard FOREIGN KEY (standard_id) REFERENCES standards(standard_id)',
      },
      {
        name: 'FK_doc_registry_attachment',
        sql: 'ALTER TABLE document_registry ADD CONSTRAINT FK_doc_registry_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(attachment_id)',
      },
      {
        name: 'FK_doc_registry_created_by',
        sql: 'ALTER TABLE document_registry ADD CONSTRAINT FK_doc_registry_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)',
      },
    ];

    for (const fk of fks) {
      const exists = await pool.request().query(
        `SELECT COUNT(*) AS c FROM sys.foreign_keys WHERE name = '${fk.name}'`
      );
      if (exists.recordset[0].c === 0) {
        await pool.request().query(fk.sql);
        console.log(`[OK] FK ${fk.name} creata`);
      } else {
        console.log(`[SKIP] FK ${fk.name} già presente`);
      }
    }

    // 3. Indici (idempotenti)
    const indexes = [
      {
        name: 'IX_doc_registry_org_company',
        sql: `CREATE INDEX IX_doc_registry_org_company
              ON document_registry (organization_id, company_id, status)`,
      },
      {
        name: 'IX_doc_registry_expiry',
        sql: `CREATE INDEX IX_doc_registry_expiry
              ON document_registry (expiry_date, status)
              WHERE expiry_date IS NOT NULL`,
      },
      {
        name: 'IX_doc_registry_type_status',
        sql: `CREATE INDEX IX_doc_registry_type_status
              ON document_registry (organization_id, doc_type, status)`,
      },
    ];

    for (const idx of indexes) {
      const exists = await pool.request().query(
        `SELECT COUNT(*) AS c FROM sys.indexes
         WHERE name = '${idx.name}' AND object_id = OBJECT_ID('document_registry')`
      );
      if (exists.recordset[0].c === 0) {
        await pool.request().query(idx.sql);
        console.log(`[OK] Indice ${idx.name} creato`);
      } else {
        console.log(`[SKIP] Indice ${idx.name} già presente`);
      }
    }

    // 4. Verifica finale
    const verify = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM sys.objects WHERE name = 'document_registry' AND type = 'U') AS table_exists,
        (SELECT COUNT(*) FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('document_registry')) AS fk_count,
        (SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID('document_registry') AND type > 0) AS idx_count,
        (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('document_registry')) AS col_count
    `);

    const v = verify.recordset[0];
    console.log('\n=== VERIFICA FINALE ===');
    console.log('Tabella creata:    ', v.table_exists === 1 ? 'SI' : 'NO');
    console.log('Foreign keys:      ', v.fk_count);
    console.log('Indici:            ', v.idx_count);
    console.log('Colonne:           ', v.col_count);
    console.log('\n=== MIGRATION 029 COMPLETATA ===');

  } catch (err) {
    console.error('Errore migration 029:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
