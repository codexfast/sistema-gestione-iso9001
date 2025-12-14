-- =====================================================
-- Migration: Add missing columns to audit_responses
-- Sistema Gestione ISO 9001
-- Date: 2025-12-06
-- =====================================================

USE SGQ_ISO9001;
GO

PRINT '🔄 Aggiunta colonne mancanti a audit_responses...';

-- Aggiungi colonna evidence
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_responses') AND name = 'evidence')
BEGIN
    ALTER TABLE [dbo].[audit_responses] ADD [evidence] NVARCHAR(MAX) NULL;
    PRINT '✅ Colonna evidence aggiunta';
END
GO

-- Aggiungi colonna answered_at
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_responses') AND name = 'answered_at')
BEGIN
    ALTER TABLE [dbo].[audit_responses] ADD [answered_at] DATETIME2 NULL;
    PRINT '✅ Colonna answered_at aggiunta';
END
GO

-- Aggiungi colonna created_by
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_responses') AND name = 'created_by')
BEGIN
    ALTER TABLE [dbo].[audit_responses] ADD [created_by] INT NULL;
    PRINT '✅ Colonna created_by aggiunta';
END
GO

-- Aggiungi colonna updated_by
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_responses') AND name = 'updated_by')
BEGIN
    ALTER TABLE [dbo].[audit_responses] ADD [updated_by] INT NULL;
    PRINT '✅ Colonna updated_by aggiunta';
END
GO

-- Aggiorna CHECK constraint per includere OSS
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_audit_responses_conformity_status' OR parent_object_id = OBJECT_ID('audit_responses'))
BEGIN
    DECLARE @constraintName NVARCHAR(255);
    SELECT @constraintName = name FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('audit_responses') 
    AND definition LIKE '%conformity_status%';
    
    IF @constraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE [dbo].[audit_responses] DROP CONSTRAINT [' + @constraintName + ']');
        PRINT '✅ Constraint ' + @constraintName + ' rimosso';
    END
END
GO

-- Aggiungi nuovo constraint con OSS
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_audit_responses_conformity_status')
BEGIN
    ALTER TABLE [dbo].[audit_responses] ADD CONSTRAINT [CK_audit_responses_conformity_status] 
        CHECK ([conformity_status] IN ('C', 'NC', 'OSS', 'OM', 'NA', NULL));
    PRINT '✅ Constraint CK_audit_responses_conformity_status aggiunto (C, NC, OSS, OM, NA)';
END
GO

-- Aggiungi FK per created_by e updated_by (opzionale, non blocca se user eliminato)
-- Non aggiungiamo FK perché potrebbe causare problemi con user eliminati

PRINT '✅ Migration audit_responses completata!';
GO
