-- ============================================================
-- Migration 025: Checklist personalizzate e risposte verbale
-- Roadmap Phase 4 - custom_checklists, sections, items, responses
-- Data: 2026-03-15
-- ============================================================

-- ============================================================
-- PARTE 1: Tabella custom_checklists
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'custom_checklists')
BEGIN
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
    PRINT 'Tabella custom_checklists creata';
END
ELSE
    PRINT 'Tabella custom_checklists gia presente';

-- ============================================================
-- PARTE 2: Tabella custom_checklist_sections
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'custom_checklist_sections')
BEGIN
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
    PRINT 'Tabella custom_checklist_sections creata';
END
ELSE
    PRINT 'Tabella custom_checklist_sections gia presente';

-- ============================================================
-- PARTE 3: Tabella custom_checklist_items
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'custom_checklist_items')
BEGIN
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
    PRINT 'Tabella custom_checklist_items creata';
END
ELSE
    PRINT 'Tabella custom_checklist_items gia presente';

-- ============================================================
-- PARTE 4: Colonna audits.custom_checklist_id
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'audits' AND COLUMN_NAME = 'custom_checklist_id'
)
BEGIN
    ALTER TABLE dbo.audits ADD custom_checklist_id INT NULL;
    ALTER TABLE dbo.audits ADD CONSTRAINT FK_audits_custom_checklist FOREIGN KEY (custom_checklist_id) REFERENCES dbo.custom_checklists(id);
    PRINT 'Colonna audits.custom_checklist_id aggiunta';
END
ELSE
    PRINT 'Colonna audits.custom_checklist_id gia presente';

-- ============================================================
-- PARTE 5: Tabella audit_custom_checklist_responses
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_custom_checklist_responses')
BEGIN
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
    PRINT 'Tabella audit_custom_checklist_responses creata';
END
ELSE
    PRINT 'Tabella audit_custom_checklist_responses gia presente';

-- ============================================================
-- PARTE 6: Colonna attachments.custom_item_id
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'attachments' AND COLUMN_NAME = 'custom_item_id'
)
BEGIN
    ALTER TABLE dbo.attachments ADD custom_item_id INT NULL;
    ALTER TABLE dbo.attachments ADD CONSTRAINT FK_attachments_custom_item FOREIGN KEY (custom_item_id) REFERENCES dbo.custom_checklist_items(id) ON DELETE SET NULL;
    PRINT 'Colonna attachments.custom_item_id aggiunta';
END
ELSE
    PRINT 'Colonna attachments.custom_item_id gia presente';

-- ============================================================
-- PARTE 7: FK custom_checklist_id su report_template_assignments
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_rta_custom_checklist'
)
BEGIN
    ALTER TABLE dbo.report_template_assignments
    ADD CONSTRAINT FK_rta_custom_checklist FOREIGN KEY (custom_checklist_id) REFERENCES dbo.custom_checklists(id);
    PRINT 'FK report_template_assignments.custom_checklist_id aggiunta';
END
ELSE
    PRINT 'FK report_template_assignments.custom_checklist_id gia presente';

-- ============================================================
-- ROLLBACK (eseguire manualmente se necessario):
-- ALTER TABLE report_template_assignments DROP CONSTRAINT FK_rta_custom_checklist;
-- ALTER TABLE attachments DROP CONSTRAINT FK_attachments_custom_item;
-- ALTER TABLE attachments DROP COLUMN custom_item_id;
-- DROP TABLE audit_custom_checklist_responses;
-- ALTER TABLE audits DROP CONSTRAINT FK_audits_custom_checklist;
-- ALTER TABLE audits DROP COLUMN custom_checklist_id;
-- DROP TABLE custom_checklist_items;
-- DROP TABLE custom_checklist_sections;
-- DROP TABLE custom_checklists;
-- ============================================================
