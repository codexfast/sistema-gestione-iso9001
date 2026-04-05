/**
 * Migration 025: custom_checklists, sections, items, responses, attachments
 * Roadmap Phase 4 - Checklist personalizzate
 * Eseguire: node backend/scripts/run-migration-025.js
 */
require('dotenv').config();
const path = require('path');
const configs = require(path.join(__dirname, '..', 'config', 'database.json'));
let c = configs.production || configs.development;
if (process.env.DB_SERVER) {
  c = { ...c, server: process.env.DB_SERVER, database: process.env.DB_DATABASE || c.database, user: process.env.DB_USER || c.user, password: process.env.DB_PASSWORD || c.password };
}
const sql = require('mssql');

const config = { server: c.server, port: c.port || 1433, database: c.database, user: c.user, password: c.password, options: { trustServerCertificate: true, encrypt: true } };

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connesso al DB. Esecuzione migration 025 (custom_checklists)...\n');

    // --- 1. custom_checklists ---
    const hasCC = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'custom_checklists'");
    if (hasCC.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.custom_checklists (
          id                       INT IDENTITY(1,1) NOT NULL,
          organization_id          INT NOT NULL,
          name                     NVARCHAR(255) NOT NULL,
          description              NVARCHAR(MAX) NULL,
          is_active                BIT NOT NULL DEFAULT 1,
          default_report_template_id INT NULL,
          custom_report_template_id INT NULL,
          created_at               DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at               DATETIME2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT PK_custom_checklists PRIMARY KEY CLUSTERED (id),
          CONSTRAINT FK_cc_org FOREIGN KEY (organization_id) REFERENCES dbo.organizations(organization_id),
          CONSTRAINT FK_cc_default_template FOREIGN KEY (default_report_template_id) REFERENCES dbo.report_templates(id),
          CONSTRAINT FK_cc_custom_template FOREIGN KEY (custom_report_template_id) REFERENCES dbo.report_templates(id)
        );
        CREATE NONCLUSTERED INDEX IX_custom_checklists_org ON dbo.custom_checklists(organization_id);
      `);
      console.log('[OK] Tabella custom_checklists creata');
    } else {
      console.log('[--] Tabella custom_checklists gia presente');
    }

    // --- 2. custom_checklist_sections ---
    const hasCCS = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'custom_checklist_sections'");
    if (hasCCS.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.custom_checklist_sections (
          id                 INT IDENTITY(1,1) NOT NULL,
          custom_checklist_id INT NOT NULL,
          code               NVARCHAR(50) NOT NULL,
          title              NVARCHAR(500) NOT NULL,
          display_order       INT NOT NULL DEFAULT 0,
          CONSTRAINT PK_custom_checklist_sections PRIMARY KEY CLUSTERED (id),
          CONSTRAINT FK_ccs_checklist FOREIGN KEY (custom_checklist_id) REFERENCES dbo.custom_checklists(id) ON DELETE CASCADE
        );
        CREATE NONCLUSTERED INDEX IX_ccs_checklist ON dbo.custom_checklist_sections(custom_checklist_id);
      `);
      console.log('[OK] Tabella custom_checklist_sections creata');
    } else {
      console.log('[--] Tabella custom_checklist_sections gia presente');
    }

    // --- 3. custom_checklist_items ---
    const hasCCI = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'custom_checklist_items'");
    if (hasCCI.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.custom_checklist_items (
          id                 INT IDENTITY(1,1) NOT NULL,
          custom_checklist_id INT NOT NULL,
          section_id         INT NOT NULL,
          code               NVARCHAR(50) NOT NULL,
          title              NVARCHAR(500) NOT NULL,
          response_type      NVARCHAR(50) NOT NULL DEFAULT 'verbale',
          display_order      INT NOT NULL DEFAULT 0,
          CONSTRAINT PK_custom_checklist_items PRIMARY KEY CLUSTERED (id),
          CONSTRAINT FK_cci_section FOREIGN KEY (section_id) REFERENCES dbo.custom_checklist_sections(id) ON DELETE CASCADE
        );
        CREATE NONCLUSTERED INDEX IX_cci_checklist ON dbo.custom_checklist_items(custom_checklist_id);
        CREATE NONCLUSTERED INDEX IX_cci_section ON dbo.custom_checklist_items(section_id);
      `);
      console.log('[OK] Tabella custom_checklist_items creata');
    } else {
      console.log('[--] Tabella custom_checklist_items gia presente');
    }

    // --- 4. audits.custom_checklist_id ---
    const hasAuditCol = await pool.request().query(
      "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'audits' AND COLUMN_NAME = 'custom_checklist_id'"
    );
    if (hasAuditCol.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE dbo.audits ADD custom_checklist_id INT NULL;
        ALTER TABLE dbo.audits ADD CONSTRAINT FK_audits_custom_checklist FOREIGN KEY (custom_checklist_id) REFERENCES dbo.custom_checklists(id);
      `);
      console.log('[OK] Colonna audits.custom_checklist_id aggiunta');
    } else {
      console.log('[--] Colonna audits.custom_checklist_id gia presente');
    }

    // --- 5. audit_custom_checklist_responses ---
    const hasACCR = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'audit_custom_checklist_responses'");
    if (hasACCR.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.audit_custom_checklist_responses (
          id              INT IDENTITY(1,1) NOT NULL,
          audit_id        INT NOT NULL,
          custom_item_id  INT NOT NULL,
          evidence_blocks NVARCHAR(MAX) NULL,
          updated_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT PK_audit_custom_checklist_responses PRIMARY KEY CLUSTERED (id),
          CONSTRAINT FK_accr_audit FOREIGN KEY (audit_id) REFERENCES dbo.audits(audit_id) ON DELETE CASCADE,
          CONSTRAINT FK_accr_item FOREIGN KEY (custom_item_id) REFERENCES dbo.custom_checklist_items(id) ON DELETE CASCADE,
          CONSTRAINT UQ_accr_audit_item UNIQUE (audit_id, custom_item_id)
        );
        CREATE NONCLUSTERED INDEX IX_accr_audit ON dbo.audit_custom_checklist_responses(audit_id);
      `);
      console.log('[OK] Tabella audit_custom_checklist_responses creata');
    } else {
      console.log('[--] Tabella audit_custom_checklist_responses gia presente');
    }

    // --- 6. attachments.custom_item_id ---
    const hasAttCol = await pool.request().query(
      "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'attachments' AND COLUMN_NAME = 'custom_item_id'"
    );
    if (hasAttCol.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE dbo.attachments ADD custom_item_id INT NULL;
        ALTER TABLE dbo.attachments ADD CONSTRAINT FK_attachments_custom_item FOREIGN KEY (custom_item_id) REFERENCES dbo.custom_checklist_items(id) ON DELETE SET NULL;
      `);
      console.log('[OK] Colonna attachments.custom_item_id aggiunta');
    } else {
      console.log('[--] Colonna attachments.custom_item_id gia presente');
    }

    // --- 7. FK report_template_assignments.custom_checklist_id ---
    const hasRtaFk = await pool.request().query(
      "SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_rta_custom_checklist'"
    );
    if (hasRtaFk.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE dbo.report_template_assignments
        ADD CONSTRAINT FK_rta_custom_checklist FOREIGN KEY (custom_checklist_id) REFERENCES dbo.custom_checklists(id);
      `);
      console.log('[OK] FK report_template_assignments.custom_checklist_id aggiunta');
    } else {
      console.log('[--] FK report_template_assignments.custom_checklist_id gia presente');
    }

    // --- Verifica ---
    console.log('\n=== VERIFICA ===');
    const cc = await pool.request().query('SELECT COUNT(*) AS n FROM custom_checklists');
    console.log('  custom_checklists:', cc.recordset[0].n, 'righe');
    const ccs = await pool.request().query('SELECT COUNT(*) AS n FROM custom_checklist_sections');
    console.log('  custom_checklist_sections:', ccs.recordset[0].n, 'righe');
    const cci = await pool.request().query('SELECT COUNT(*) AS n FROM custom_checklist_items');
    console.log('  custom_checklist_items:', cci.recordset[0].n, 'righe');
    console.log('\n=== MIGRATION 025 COMPLETATA ===');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
