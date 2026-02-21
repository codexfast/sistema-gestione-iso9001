/**
 * Migration 017 - ALTER TABLE attachments
 * Aggiunge: question_id (collegamento a domanda checklist) + category (classificazione file)
 * 
 * SAFE TO RUN MULTIPLE TIMES: usa IF NOT EXISTS prima di ogni ALTER
 * 
 * ISO 9001:2015 - 7.5.3: Controllo informazioni documentate (allegati tracciabili per domanda)
 */

USE SGQ_ISO9001;
GO

-- ============================================================
-- 1. Aggiungi colonna question_id (NULL - allegato generico)
-- Consente di collegare un allegato a una domanda specifica
-- Se NULL → allegato generico dell'audit (non a una domanda)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.attachments') AND name = 'question_id'
)
BEGIN
    ALTER TABLE [dbo].[attachments]
    ADD [question_id] INT NULL;

    PRINT '✅ Colonna question_id aggiunta ad attachments';
END
ELSE
BEGIN
    PRINT '⏭️  Colonna question_id già presente - skip';
END
GO

-- ============================================================
-- 2. Aggiungi FK question_id → checklist_questions
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_attachments_question_id'
)
BEGIN
    ALTER TABLE [dbo].[attachments]
    ADD CONSTRAINT [FK_attachments_question_id]
    FOREIGN KEY ([question_id]) REFERENCES [dbo].[checklist_questions]([question_id])
    ON DELETE SET NULL;  -- Se domanda eliminata, allegato resta (scollegato)

    PRINT '✅ FK FK_attachments_question_id aggiunta';
END
ELSE
BEGIN
    PRINT '⏭️  FK FK_attachments_question_id già presente - skip';
END
GO

-- ============================================================
-- 3. Aggiungi colonna category (classificazione tipo file)
-- Valori: photo | document | audio | video
-- Default: 'document' per compatibilità allegati esistenti
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.attachments') AND name = 'category'
)
BEGIN
    ALTER TABLE [dbo].[attachments]
    ADD [category] NVARCHAR(20) NOT NULL 
    CONSTRAINT [DF_attachments_category] DEFAULT 'document';

    PRINT '✅ Colonna category aggiunta ad attachments (default: document)';
END
ELSE
BEGIN
    PRINT '⏭️  Colonna category già presente - skip';
END
GO

-- ============================================================
-- 4. Aggiungi CHECK constraint su category
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE name = 'CK_attachments_category'
)
BEGIN
    ALTER TABLE [dbo].[attachments]
    ADD CONSTRAINT [CK_attachments_category]
    CHECK ([category] IN ('photo', 'document', 'audio', 'video'));

    PRINT '✅ CHECK constraint CK_attachments_category aggiunto';
END
ELSE
BEGIN
    PRINT '⏭️  CHECK constraint CK_attachments_category già presente - skip';
END
GO

-- ============================================================
-- 5. Aggiorna category per allegati esistenti basandosi sul MIME type
-- Foto: image/* → 'photo'
-- Audio: audio/* → 'audio'  
-- Video: video/* → 'video'
-- Tutto il resto → 'document' (già default)
-- ============================================================
UPDATE [dbo].[attachments]
SET [category] = 
    CASE 
        WHEN [file_type] LIKE 'image/%' THEN 'photo'
        WHEN [file_type] LIKE 'audio/%' THEN 'audio'
        WHEN [file_type] LIKE 'video/%' THEN 'video'
        ELSE 'document'
    END
WHERE [category] = 'document';  -- Solo quelli col default (non toccati manualmente)
GO

PRINT '✅ Category aggiornata per allegati esistenti';

-- ============================================================
-- 6. Indice per query frequenti (audit + question)
-- Usato da: GET /api/v1/attachments?audit_id=X&question_id=Y
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('dbo.attachments') 
    AND name = 'IX_attachments_audit_question'
)
BEGIN
    CREATE INDEX [IX_attachments_audit_question]
    ON [dbo].[attachments] ([audit_id], [question_id]);

    PRINT '✅ Indice IX_attachments_audit_question creato';
END
GO

-- ============================================================
-- VERIFICA FINALE
-- ============================================================
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'attachments'
ORDER BY ORDINAL_POSITION;
GO

PRINT '';
PRINT '=== Migration 017 completata ===';
