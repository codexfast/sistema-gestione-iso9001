-- =============================================================================
-- Script di Rollback Rapido: Rimuove Solo FK Problematica
-- =============================================================================

USE [SGQ_ISO9001];
GO

PRINT '🔄 Rimozione FK non_conformities_section...';

-- Rimuovi FK non_conformities -> checklist_sections
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_non_conformities_section')
BEGIN
    ALTER TABLE [dbo].[non_conformities] 
    DROP CONSTRAINT [FK_non_conformities_section];
    PRINT '✅ FK_non_conformities_section rimossa';
END
ELSE
BEGIN
    PRINT '⚠️  FK_non_conformities_section già rimossa';
END

-- Rimuovi FK checklist_questions -> checklist_sections
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_questions_section')
BEGIN
    ALTER TABLE [dbo].[checklist_questions] 
    DROP CONSTRAINT [FK_checklist_questions_section];
    PRINT '✅ FK_checklist_questions_section rimossa';
END
ELSE
BEGIN
    PRINT '⚠️  FK_checklist_questions_section già rimossa';
END

-- Rimuovi vincolo UNIQUE problematico
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_checklist_sections_code')
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    DROP CONSTRAINT [UQ_checklist_sections_code];
    PRINT '✅ UQ_checklist_sections_code rimosso';
END
ELSE
BEGIN
    PRINT '⚠️  UQ_checklist_sections_code già rimosso';
END

PRINT '';
PRINT '✅ Cleanup completato. Ora puoi:';
PRINT '   1. Chiudere questa query';
PRINT '   2. Riaprire migration_multi_standard.sql (versione aggiornata)';
PRINT '   3. Eseguire lo script completo';
PRINT '';

GO
