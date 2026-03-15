/**
 * Migration 024: report_templates + report_template_assignments
 * Roadmap Phase 1 - Template report per org
 * Eseguire: node backend/scripts/run-migration-024.js
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
    console.log('Connesso al DB. Esecuzione migration 024 (report_templates)...\n');

    // --- 1. Tabella report_templates ---
    const hasTemplates = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'report_templates'");
    if (hasTemplates.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.report_templates (
          id              INT IDENTITY(1,1) NOT NULL,
          organization_id  INT NULL,
          name            NVARCHAR(255) NOT NULL,
          scope           NVARCHAR(50) NOT NULL DEFAULT 'audit',
          standard_key     NVARCHAR(50) NULL,
          file_path       NVARCHAR(500) NOT NULL,
          is_system       BIT NOT NULL DEFAULT 0,
          created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT PK_report_templates PRIMARY KEY CLUSTERED (id),
          CONSTRAINT FK_report_templates_org FOREIGN KEY (organization_id) REFERENCES dbo.organizations(organization_id),
          CONSTRAINT CK_report_templates_scope CHECK (scope IN ('audit', 'self_assessment'))
        );
        CREATE NONCLUSTERED INDEX IX_report_templates_org_scope_std ON dbo.report_templates(organization_id, scope, standard_key);
      `);
      console.log('[OK] Tabella report_templates creata');
    } else {
      console.log('[--] Tabella report_templates gia presente');
    }

    // --- 2. Seed template di sistema ---
    const hasSeed = await pool.request().query('SELECT 1 FROM report_templates WHERE organization_id IS NULL');
    if (hasSeed.recordset.length === 0) {
      await pool.request().query(`
        INSERT INTO report_templates (organization_id, name, scope, standard_key, file_path, is_system, created_at, updated_at)
        VALUES
          (NULL, N'Report Audit ISO 9001', 'audit', 'ISO_9001', '/templates/ISO9001-audit-report.docx', 1, GETDATE(), GETDATE()),
          (NULL, N'Report Audit ISO 14001', 'audit', 'ISO_14001', '/templates/ISO14001-audit-report.docx', 1, GETDATE(), GETDATE()),
          (NULL, N'Report Audit ISO 45001', 'audit', 'ISO_45001', '/templates/ISO45001-audit-report.docx', 1, GETDATE(), GETDATE()),
          (NULL, N'Report Audit ISO 3834-2', 'audit', 'ISO_3834_2', '/templates/ISO3834-audit-report.docx', 1, GETDATE(), GETDATE()),
          (NULL, N'Report Audit (default)', 'audit', 'default', '/templates/ISO9001-audit-report.docx', 1, GETDATE(), GETDATE())
      `);
      console.log('[OK] Seed template di sistema inseriti (5 righe)');
    } else {
      console.log('[--] Seed template di sistema gia presenti');
    }

    // --- 3. Tabella report_template_assignments ---
    const hasAssign = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'report_template_assignments'");
    if (hasAssign.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.report_template_assignments (
          id                   INT IDENTITY(1,1) NOT NULL,
          organization_id      INT NOT NULL,
          standard_id         INT NULL,
          custom_checklist_id  INT NULL,
          report_template_id  INT NOT NULL,
          created_at          DATETIME2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT PK_report_template_assignments PRIMARY KEY CLUSTERED (id),
          CONSTRAINT FK_rta_org FOREIGN KEY (organization_id) REFERENCES dbo.organizations(organization_id),
          CONSTRAINT FK_rta_standard FOREIGN KEY (standard_id) REFERENCES dbo.standards(standard_id),
          CONSTRAINT FK_rta_template FOREIGN KEY (report_template_id) REFERENCES dbo.report_templates(id),
          CONSTRAINT CK_rta_at_least_one CHECK (standard_id IS NOT NULL OR custom_checklist_id IS NOT NULL)
        );
        CREATE UNIQUE NONCLUSTERED INDEX UQ_rta_org_std_custom ON dbo.report_template_assignments(organization_id, standard_id, custom_checklist_id);
      `);
      console.log('[OK] Tabella report_template_assignments creata');
    } else {
      console.log('[--] Tabella report_template_assignments gia presente');
    }

    // --- Verifica ---
    const count = await pool.request().query('SELECT COUNT(*) AS n FROM report_templates');
    console.log('\n=== VERIFICA ===');
    console.log('  report_templates: ' + count.recordset[0].n + ' righe');
    const assignCount = await pool.request().query('SELECT COUNT(*) AS n FROM report_template_assignments');
    console.log('  report_template_assignments: ' + assignCount.recordset[0].n + ' righe');
    console.log('\n=== MIGRATION 024 COMPLETATA ===');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
