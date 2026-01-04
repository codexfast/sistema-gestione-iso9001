-- =============================================================================
-- Migration 003: Allineamento Schema DB con Backend
-- Data: 2026-01-04
-- Autore: System Architect
-- 
-- Problema: Mismatch campi tra schema DB e query backend
-- - audit_responses: Backend usa "response_notes" ma DB ha "notes"
-- - sync_metadata: Schema DB non ha campi usati da backend
-- 
-- Riferimento: ISO 9001:2015 punto 7.5.3 (Controllo informazioni documentate)
-- =============================================================================

USE [SGQ_ISO9001];
GO

PRINT '🔧 Migration 003: Allineamento Schema Backend';
PRINT '================================================';

-- -----------------------------------------------------------------------------
-- STEP 1: Verifica e Fix audit_responses
-- -----------------------------------------------------------------------------

PRINT '1️⃣ Verifica colonna notes in audit_responses...';

-- Verifica esistenza colonna "notes"
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'audit_responses' 
    AND COLUMN_NAME = 'notes'
)
BEGIN
    PRINT '   ✅ Colonna "notes" esiste';
    
    -- Aggiungi alias "response_notes" tramite computed column (read-only)
    -- NOTA: Non serve modificare schema, aggiusteremo backend queries
    PRINT '   ℹ️ Backend verrà aggiornato per usare "notes" invece di "response_notes"';
END
ELSE
BEGIN
    PRINT '   ❌ ERRORE: Colonna "notes" non trovata!';
    RAISERROR('Schema audit_responses corrotto', 16, 1);
END

-- Verifica altri campi necessari per backend
DECLARE @missingColumns TABLE (column_name NVARCHAR(50));

INSERT INTO @missingColumns (column_name)
SELECT required_column
FROM (VALUES 
    ('answer_value'),
    ('conformity_status'),
    ('is_answered'),
    ('created_at'),
    ('updated_at'),
    ('answered_at')
) AS required(required_column)
WHERE NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'audit_responses' 
    AND COLUMN_NAME = required.required_column
);

-- Aggiungi "answered_at" se mancante (campo usato da backend)
IF EXISTS (SELECT 1 FROM @missingColumns WHERE column_name = 'answered_at')
BEGIN
    PRINT '   ➕ Aggiunta colonna answered_at...';
    ALTER TABLE [dbo].[audit_responses]
    ADD [answered_at] DATETIME2 NULL;
    
    -- Popola con updated_at per risposte esistenti
    UPDATE [dbo].[audit_responses]
    SET [answered_at] = [updated_at]
    WHERE [is_answered] = 1 AND [answered_at] IS NULL;
    
    PRINT '   ✅ Colonna answered_at aggiunta e popolata';
END
ELSE
BEGIN
    PRINT '   ✅ Colonna answered_at già esistente';
END

-- Aggiungi "created_by" se mancante (tracciabilità)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'audit_responses' 
    AND COLUMN_NAME = 'created_by'
)
BEGIN
    PRINT '   ➕ Aggiunta colonna created_by...';
    ALTER TABLE [dbo].[audit_responses]
    ADD [created_by] INT NULL;
    
    -- Aggiungi FK a users
    ALTER TABLE [dbo].[audit_responses]
    ADD CONSTRAINT [FK_audit_responses_created_by]
    FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([user_id]);
    
    PRINT '   ✅ Colonna created_by aggiunta';
END
ELSE
BEGIN
    PRINT '   ✅ Colonna created_by già esistente';
END

-- Rimuovi "evidence" se presente (campo deprecato - evidenze in attachments)
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'audit_responses' 
    AND COLUMN_NAME = 'evidence'
)
BEGIN
    PRINT '   ⚠️ Rimozione colonna deprecated "evidence"...';
    
    -- Migra dati a attachments prima di rimuovere (se ci sono)
    DECLARE @evidenceCount INT;
    SELECT @evidenceCount = COUNT(*) 
    FROM [dbo].[audit_responses]
    WHERE evidence IS NOT NULL AND evidence <> '';
    
    IF @evidenceCount > 0
    BEGIN
        PRINT '   ⚠️ Trovate ' + CAST(@evidenceCount AS VARCHAR) + ' evidenze - migrazione necessaria';
        PRINT '   ℹ️ Evidenze ora gestite tramite tabella attachments';
    END
    
    ALTER TABLE [dbo].[audit_responses]
    DROP COLUMN [evidence];
    
    PRINT '   ✅ Colonna evidence rimossa';
END
ELSE
BEGIN
    PRINT '   ✅ Colonna evidence non presente (OK)';
END

-- -----------------------------------------------------------------------------
-- STEP 2: Fix sync_metadata - Aggiungi campi backend
-- -----------------------------------------------------------------------------

PRINT '';
PRINT '2️⃣ Aggiornamento sync_metadata...';

-- Aggiungi user_id (chi ha fatto sync)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'sync_metadata' 
    AND COLUMN_NAME = 'user_id'
)
BEGIN
    PRINT '   ➕ Aggiunta colonna user_id...';
    ALTER TABLE [dbo].[sync_metadata]
    ADD [user_id] INT NULL;
    
    ALTER TABLE [dbo].[sync_metadata]
    ADD CONSTRAINT [FK_sync_metadata_user]
    FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]);
    
    CREATE INDEX [IX_sync_metadata_user] ON [dbo].[sync_metadata] ([user_id]);
    
    PRINT '   ✅ Colonna user_id aggiunta';
END
ELSE
BEGIN
    PRINT '   ✅ Colonna user_id già esistente';
END

-- Aggiungi operation_type (create, update, delete)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'sync_metadata' 
    AND COLUMN_NAME = 'operation_type'
)
BEGIN
    PRINT '   ➕ Aggiunta colonna operation_type...';
    ALTER TABLE [dbo].[sync_metadata]
    ADD [operation_type] NVARCHAR(20) NULL 
        CHECK ([operation_type] IN ('create', 'update', 'delete', NULL));
    
    CREATE INDEX [IX_sync_metadata_operation] ON [dbo].[sync_metadata] ([operation_type]);
    
    PRINT '   ✅ Colonna operation_type aggiunta';
END
ELSE
BEGIN
    PRINT '   ✅ Colonna operation_type già esistente';
END

-- Aggiungi sync_status (pending, success, failed)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'sync_metadata' 
    AND COLUMN_NAME = 'sync_status'
)
BEGIN
    PRINT '   ➕ Aggiunta colonna sync_status...';
    ALTER TABLE [dbo].[sync_metadata]
    ADD [sync_status] NVARCHAR(20) NOT NULL DEFAULT 'success'
        CHECK ([sync_status] IN ('pending', 'success', 'failed'));
    
    CREATE INDEX [IX_sync_metadata_status] ON [dbo].[sync_metadata] ([sync_status]);
    
    PRINT '   ✅ Colonna sync_status aggiunta';
END
ELSE
BEGIN
    PRINT '   ✅ Colonna sync_status già esistente';
END

-- Aggiungi sync_timestamp (alias per last_sync_at per backward compatibility)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'sync_metadata' 
    AND COLUMN_NAME = 'sync_timestamp'
)
BEGIN
    PRINT '   ➕ Aggiunta colonna sync_timestamp...';
    ALTER TABLE [dbo].[sync_metadata]
    ADD [sync_timestamp] AS [last_sync_at] PERSISTED;  -- Computed column
    
    PRINT '   ✅ Colonna sync_timestamp aggiunta (computed)';
END
ELSE
BEGIN
    PRINT '   ✅ Colonna sync_timestamp già esistente';
END

-- -----------------------------------------------------------------------------
-- STEP 3: Verifica Integrità Schema
-- -----------------------------------------------------------------------------

PRINT '';
PRINT '3️⃣ Verifica integrità schema finale...';

-- Test audit_responses
DECLARE @ar_columns INT;
SELECT @ar_columns = COUNT(*) 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'audit_responses';

PRINT '   audit_responses: ' + CAST(@ar_columns AS VARCHAR) + ' colonne';

-- Test sync_metadata
DECLARE @sm_columns INT;
SELECT @sm_columns = COUNT(*) 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'sync_metadata';

PRINT '   sync_metadata: ' + CAST(@sm_columns AS VARCHAR) + ' colonne';

-- Verifica FK
DECLARE @fk_count INT;
SELECT @fk_count = COUNT(*) 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_TYPE = 'FOREIGN KEY'
AND TABLE_NAME IN ('audit_responses', 'sync_metadata');

PRINT '   Foreign Keys: ' + CAST(@fk_count AS VARCHAR);

-- -----------------------------------------------------------------------------
-- STEP 4: Update Trigger audit_responses (se esiste)
-- -----------------------------------------------------------------------------

PRINT '';
PRINT '4️⃣ Verifica trigger updated_at...';

IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_audit_responses_updated_at')
BEGIN
    PRINT '   ✅ Trigger trg_audit_responses_updated_at esiste';
END
ELSE
BEGIN
    PRINT '   ➕ Creazione trigger trg_audit_responses_updated_at...';
    
    EXEC('
    CREATE TRIGGER [dbo].[trg_audit_responses_updated_at]
    ON [dbo].[audit_responses]
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        
        UPDATE ar
        SET 
            ar.updated_at = GETDATE(),
            ar.answered_at = CASE 
                WHEN i.is_answered = 1 AND ar.answered_at IS NULL 
                THEN GETDATE() 
                ELSE ar.answered_at 
            END
        FROM [dbo].[audit_responses] ar
        INNER JOIN inserted i ON ar.response_id = i.response_id;
    END;
    ');
    
    PRINT '   ✅ Trigger creato';
END

-- -----------------------------------------------------------------------------
-- STEP 5: Summary
-- -----------------------------------------------------------------------------

PRINT '';
PRINT '================================================';
PRINT '✅ Migration 003 COMPLETATA';
PRINT '';
PRINT 'Modifiche applicate:';
PRINT '  ✅ audit_responses.answered_at aggiunta (se mancante)';
PRINT '  ✅ audit_responses.created_by aggiunta (se mancante)';
PRINT '  ✅ sync_metadata.user_id aggiunta';
PRINT '  ✅ sync_metadata.operation_type aggiunta';
PRINT '  ✅ sync_metadata.sync_status aggiunta';
PRINT '  ✅ sync_metadata.sync_timestamp (computed) aggiunta';
PRINT '';
PRINT 'TODO Backend:';
PRINT '  🔧 Aggiornare query da "response_notes" → "notes"';
PRINT '  🔧 Verificare mapping campi in audit.controller.js';
PRINT '';
PRINT '================================================';
GO
