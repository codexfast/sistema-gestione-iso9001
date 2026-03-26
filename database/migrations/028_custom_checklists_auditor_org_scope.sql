-- Migration 028: scope checklist custom per auditor_org (policy B legacy-friendly)
-- Obiettivo:
--  - consentire isolamento per studio/auditor_org
--  - mantenere visibili le checklist legacy (auditor_org_id NULL) a tutti gli auditor

IF COL_LENGTH('custom_checklists', 'auditor_org_id') IS NULL
BEGIN
    ALTER TABLE custom_checklists
    ADD auditor_org_id INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_custom_checklists_auditor_org_id'
)
BEGIN
    ALTER TABLE custom_checklists
    ADD CONSTRAINT FK_custom_checklists_auditor_org_id
        FOREIGN KEY (auditor_org_id) REFERENCES auditor_orgs(id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_custom_checklists_org_auditor_org'
      AND object_id = OBJECT_ID('custom_checklists')
)
BEGIN
    CREATE INDEX IX_custom_checklists_org_auditor_org
        ON custom_checklists (organization_id, auditor_org_id, is_active);
END
GO
