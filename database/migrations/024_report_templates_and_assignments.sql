-- ============================================================
-- Migration 024: report_templates + report_template_assignments
-- Roadmap: Phase 1 - Template report per org + checklist personalizzate
-- Data: 2026-03-15
-- ============================================================

-- ============================================================
-- PARTE 1: Tabella report_templates
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'report_templates')
BEGIN
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
    CREATE NONCLUSTERED INDEX IX_report_templates_org_scope_std 
        ON dbo.report_templates(organization_id, scope, standard_key);
    PRINT 'Tabella report_templates creata';
END
ELSE
    PRINT 'Tabella report_templates gia presente';

-- ============================================================
-- PARTE 2: Seed template di sistema (organization_id = NULL)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM report_templates WHERE organization_id IS NULL)
BEGIN
    INSERT INTO report_templates (organization_id, name, scope, standard_key, file_path, is_system, created_at, updated_at)
    VALUES
        (NULL, 'Report Audit ISO 9001', 'audit', 'ISO_9001', '/templates/ISO9001-audit-report.docx', 1, GETDATE(), GETDATE()),
        (NULL, 'Report Audit ISO 14001', 'audit', 'ISO_14001', '/templates/ISO14001-audit-report.docx', 1, GETDATE(), GETDATE()),
        (NULL, 'Report Audit ISO 45001', 'audit', 'ISO_45001', '/templates/ISO45001-audit-report.docx', 1, GETDATE(), GETDATE()),
        (NULL, 'Report Audit ISO 3834-2', 'audit', 'ISO_3834_2', '/templates/ISO3834-audit-report.docx', 1, GETDATE(), GETDATE()),
        (NULL, 'Report Audit (default)', 'audit', 'default', '/templates/ISO9001-audit-report.docx', 1, GETDATE(), GETDATE());
    PRINT 'Seed template di sistema inseriti (5 righe)';
END
ELSE
    PRINT 'Seed template di sistema gia presenti';

-- ============================================================
-- PARTE 3: Tabella report_template_assignments
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'report_template_assignments')
BEGIN
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
    CREATE UNIQUE NONCLUSTERED INDEX UQ_rta_org_std_custom 
        ON dbo.report_template_assignments(organization_id, standard_id, custom_checklist_id);
    PRINT 'Tabella report_template_assignments creata';
END
ELSE
    PRINT 'Tabella report_template_assignments gia presente';

-- ============================================================
-- ROLLBACK (eseguire manualmente se necessario):
-- DROP TABLE IF EXISTS report_template_assignments;
-- DROP TABLE IF EXISTS report_templates;
-- ============================================================
