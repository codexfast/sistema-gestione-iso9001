-- =============================================================================
-- Script di Rollback: Migrazione Multi-Standard
-- Rimuove modifiche parziali per permettere re-run pulito
-- =============================================================================

USE [SGQ_ISO9001];
GO

PRINT '🔄 Rollback migrazione multi-standard...';
PRINT '';

-- Rimuovi FK checklist_questions -> standards
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_questions_standard')
BEGIN
    ALTER TABLE [dbo].[checklist_questions] DROP CONSTRAINT [FK_checklist_questions_standard];
    PRINT '✅ FK_checklist_questions_standard rimossa';
END

-- Rimuovi indice checklist_questions
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_checklist_questions_standard')
BEGIN
    DROP INDEX [IX_checklist_questions_standard] ON [dbo].[checklist_questions];
    PRINT '✅ IX_checklist_questions_standard rimosso';
END

-- Rimuovi colonna standard_id da checklist_questions
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[checklist_questions]') AND name = 'standard_id')
BEGIN
    ALTER TABLE [dbo].[checklist_questions] DROP COLUMN [standard_id];
    PRINT '✅ Colonna standard_id rimossa da checklist_questions';
END

-- Rimuovi FK checklist_sections -> standards
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_sections_standard')
BEGIN
    ALTER TABLE [dbo].[checklist_sections] DROP CONSTRAINT [FK_checklist_sections_standard];
    PRINT '✅ FK_checklist_sections_standard rimossa';
END

-- Rimuovi vincolo composto
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_checklist_sections_standard_code')
BEGIN
    ALTER TABLE [dbo].[checklist_sections] DROP CONSTRAINT [UQ_checklist_sections_standard_code];
    PRINT '✅ UQ_checklist_sections_standard_code rimosso';
END

-- Rimuovi indice checklist_sections
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_checklist_sections_standard')
BEGIN
    DROP INDEX [IX_checklist_sections_standard] ON [dbo].[checklist_sections];
    PRINT '✅ IX_checklist_sections_standard rimosso';
END

-- Rimuovi colonna standard_id da checklist_sections
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[checklist_sections]') AND name = 'standard_id')
BEGIN
    ALTER TABLE [dbo].[checklist_sections] DROP COLUMN [standard_id];
    PRINT '✅ Colonna standard_id rimossa da checklist_sections';
END

-- Ricrea vincolo originale UQ_checklist_sections_code
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_checklist_sections_code')
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ADD CONSTRAINT [UQ_checklist_sections_code] UNIQUE NONCLUSTERED ([section_code]);
    PRINT '✅ UQ_checklist_sections_code ricreato';
END

-- Ricrea FK checklist_questions -> checklist_sections
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_questions_section')
BEGIN
    ALTER TABLE [dbo].[checklist_questions]
    ADD CONSTRAINT [FK_checklist_questions_section] 
        FOREIGN KEY ([section_code])
        REFERENCES [dbo].[checklist_sections]([section_code])
        ON DELETE CASCADE ON UPDATE CASCADE;
    PRINT '✅ FK_checklist_questions_section ricreata';
END

-- Rimuovi FK audits -> standards
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_audits_standard')
BEGIN
    ALTER TABLE [dbo].[audits] DROP CONSTRAINT [FK_audits_standard];
    PRINT '✅ FK_audits_standard rimossa';
END

-- Rimuovi indice audits
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_audits_standard')
BEGIN
    DROP INDEX [IX_audits_standard] ON [dbo].[audits];
    PRINT '✅ IX_audits_standard rimosso';
END

-- Rimuovi colonna standard_id da audits
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[audits]') AND name = 'standard_id')
BEGIN
    ALTER TABLE [dbo].[audits] DROP COLUMN [standard_id];
    PRINT '✅ Colonna standard_id rimossa da audits';
END

-- Rimuovi tabella audit_standards
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audit_standards]'))
BEGIN
    DROP TABLE [dbo].[audit_standards];
    PRINT '✅ Tabella audit_standards rimossa';
END

-- Ripristina view originale
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_audit_dashboard')
BEGIN
    DROP VIEW [dbo].[vw_audit_dashboard];
END
GO

CREATE VIEW [dbo].[vw_audit_dashboard]
AS
SELECT 
    a.[audit_id],
    a.[audit_uuid],
    a.[audit_number],
    a.[client_name],
    a.[project_year],
    a.[audit_date],
    a.[auditor_name],
    a.[audit_type],
    a.[status],
    a.[total_questions],
    a.[answered_questions],
    a.[conformities_count],
    a.[non_conformities_count],
    a.[completion_percentage],
    a.[created_at],
    a.[updated_at],
    u.[full_name] AS created_by_name,
    u.[email] AS created_by_email,
    (SELECT COUNT(*) FROM [dbo].[attachments] WHERE [audit_id] = a.[audit_id]) AS attachments_count,
    (SELECT COUNT(*) FROM [dbo].[non_conformities] WHERE [audit_id] = a.[audit_id] AND [status] = 'open') AS open_nc_count
FROM [dbo].[audits] a
INNER JOIN [dbo].[users] u ON a.[created_by] = u.[user_id]
WHERE a.[is_deleted] = 0;
GO

PRINT '✅ View vw_audit_dashboard ripristinata';

-- Rimuovi tabella standards
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[standards]'))
BEGIN
    DROP TABLE [dbo].[standards];
    PRINT '✅ Tabella standards rimossa';
END

PRINT '';
PRINT '========================================';
PRINT '✅ ROLLBACK COMPLETATO';
PRINT '========================================';
PRINT '';
PRINT 'Database ripristinato allo stato pre-migrazione.';
PRINT 'Ora puoi eseguire migration_multi_standard.sql corretto.';
PRINT '';

GO
