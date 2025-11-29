-- =============================================================================
-- Script FINALE di Migrazione Multi-Standard (VERSIONE CORRETTA)
-- Parte da stato parziale e completa la migrazione
-- =============================================================================

USE [SGQ_ISO9001];
GO

PRINT '🚀 Completamento migrazione multi-standard...';
PRINT '';

-- =============================================================================
-- CLEANUP: Rimuovi vincoli esistenti che bloccano le modifiche
-- =============================================================================

PRINT '🧹 Cleanup vincoli obsoleti...';

-- Rimuovi indici se esistono (per permettere ALTER COLUMN)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_checklist_sections_standard' AND object_id = OBJECT_ID(N'[dbo].[checklist_sections]'))
BEGIN
    DROP INDEX [IX_checklist_sections_standard] ON [dbo].[checklist_sections];
    PRINT '   ✅ IX_checklist_sections_standard rimosso';
END

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_checklist_questions_standard' AND object_id = OBJECT_ID(N'[dbo].[checklist_questions]'))
BEGIN
    DROP INDEX [IX_checklist_questions_standard] ON [dbo].[checklist_questions];
    PRINT '   ✅ IX_checklist_questions_standard rimosso';
END

-- Rimuovi FK se esistono
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_sections_standard')
BEGIN
    ALTER TABLE [dbo].[checklist_sections] DROP CONSTRAINT [FK_checklist_sections_standard];
    PRINT '   ✅ FK_checklist_sections_standard rimossa';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_questions_standard')
BEGIN
    ALTER TABLE [dbo].[checklist_questions] DROP CONSTRAINT [FK_checklist_questions_standard];
    PRINT '   ✅ FK_checklist_questions_standard rimossa';
END

-- Rimuovi vincolo composto se esiste
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_checklist_sections_standard_code')
BEGIN
    ALTER TABLE [dbo].[checklist_sections] DROP CONSTRAINT [UQ_checklist_sections_standard_code];
    PRINT '   ✅ UQ_checklist_sections_standard_code rimosso';
END

PRINT '';

-- =============================================================================
-- STEP 1: CHECKLIST_SECTIONS
-- =============================================================================

PRINT '📋 Completamento checklist_sections...';

-- Rendi standard_id NOT NULL
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[checklist_sections]') 
    AND name = 'standard_id'
    AND is_nullable = 1
)
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ALTER COLUMN [standard_id] INT NOT NULL;
    PRINT '   ✅ standard_id impostato NOT NULL';
END
ELSE
BEGIN
    PRINT '   ⚠️  standard_id già NOT NULL';
END
GO

-- Foreign key verso standards
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_sections_standard')
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ADD CONSTRAINT [FK_checklist_sections_standard] 
        FOREIGN KEY ([standard_id]) 
        REFERENCES [dbo].[standards]([standard_id]);
    PRINT '   ✅ FK_checklist_sections_standard creata';
END
GO

-- Indice su standard_id
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_checklist_sections_standard')
BEGIN
    CREATE INDEX [IX_checklist_sections_standard] 
    ON [dbo].[checklist_sections] ([standard_id]);
    PRINT '   ✅ IX_checklist_sections_standard creato';
END
GO

-- Vincolo UNIQUE composto (standard_id + section_code)
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_checklist_sections_standard_code')
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ADD CONSTRAINT [UQ_checklist_sections_standard_code] 
        UNIQUE ([standard_id], [section_code]);
    PRINT '   ✅ UQ_checklist_sections_standard_code creato';
END
GO

PRINT '';

-- =============================================================================
-- STEP 2: CHECKLIST_QUESTIONS
-- =============================================================================

PRINT '📋 Completamento checklist_questions...';

-- Rendi standard_id NOT NULL
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[checklist_questions]') 
    AND name = 'standard_id'
    AND is_nullable = 1
)
BEGIN
    ALTER TABLE [dbo].[checklist_questions]
    ALTER COLUMN [standard_id] INT NOT NULL;
    PRINT '   ✅ standard_id impostato NOT NULL';
END
ELSE
BEGIN
    PRINT '   ⚠️  standard_id già NOT NULL';
END
GO

-- Foreign key verso standards
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_questions_standard')
BEGIN
    ALTER TABLE [dbo].[checklist_questions]
    ADD CONSTRAINT [FK_checklist_questions_standard] 
        FOREIGN KEY ([standard_id]) 
        REFERENCES [dbo].[standards]([standard_id]);
    PRINT '   ✅ FK_checklist_questions_standard creata';
END
GO

-- Indice su standard_id
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_checklist_questions_standard')
BEGIN
    CREATE INDEX [IX_checklist_questions_standard] 
    ON [dbo].[checklist_questions] ([standard_id]);
    PRINT '   ✅ IX_checklist_questions_standard creato';
END
GO

-- FK composta verso checklist_sections
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_checklist_questions_section_composite')
BEGIN
    ALTER TABLE [dbo].[checklist_questions]
    ADD CONSTRAINT [FK_checklist_questions_section_composite] 
        FOREIGN KEY ([standard_id], [section_code])
        REFERENCES [dbo].[checklist_sections]([standard_id], [section_code])
        ON DELETE CASCADE;
    PRINT '   ✅ FK_checklist_questions_section_composite creata';
END
GO

PRINT '';

-- =============================================================================
-- STEP 3: NON_CONFORMITIES (Aggiungi standard_id)
-- =============================================================================

PRINT '📋 Aggiornamento non_conformities per multi-standard...';

-- Aggiungi colonna standard_id se non esiste
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[non_conformities]') 
    AND name = 'standard_id'
)
BEGIN
    ALTER TABLE [dbo].[non_conformities]
    ADD [standard_id] INT NULL;
    PRINT '   ✅ Colonna standard_id aggiunta';
END
GO

-- Popola standard_id per NC esistenti
UPDATE nc
SET nc.[standard_id] = cs.[standard_id]
FROM [dbo].[non_conformities] nc
INNER JOIN [dbo].[checklist_sections] cs ON nc.[section_code] = cs.[section_code]
WHERE nc.[standard_id] IS NULL;

PRINT '   ✅ NC esistenti associate a standard';
GO

-- Rendi NOT NULL
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[non_conformities]') 
    AND name = 'standard_id'
    AND is_nullable = 1
)
BEGIN
    ALTER TABLE [dbo].[non_conformities]
    ALTER COLUMN [standard_id] INT NOT NULL;
    PRINT '   ✅ standard_id impostato NOT NULL';
END
GO

-- FK verso standards
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_non_conformities_standard')
BEGIN
    ALTER TABLE [dbo].[non_conformities]
    ADD CONSTRAINT [FK_non_conformities_standard] 
        FOREIGN KEY ([standard_id]) 
        REFERENCES [dbo].[standards]([standard_id]);
    PRINT '   ✅ FK_non_conformities_standard creata';
END
GO

-- FK composta verso checklist_sections
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_non_conformities_section_composite')
BEGIN
    ALTER TABLE [dbo].[non_conformities]
    ADD CONSTRAINT [FK_non_conformities_section_composite] 
        FOREIGN KEY ([standard_id], [section_code])
        REFERENCES [dbo].[checklist_sections]([standard_id], [section_code]);
    PRINT '   ✅ FK_non_conformities_section_composite creata';
END
GO

PRINT '';

-- =============================================================================
-- VERIFICA FINALE
-- =============================================================================

PRINT '========================================';
PRINT '✅ MIGRAZIONE COMPLETATA';
PRINT '========================================';
PRINT '';

-- Verifica struttura
PRINT '📊 VERIFICA STRUTTURA:';
SELECT 
    'checklist_sections' AS Tabella,
    COUNT(CASE WHEN name = 'standard_id' THEN 1 END) AS standard_id_presente,
    COUNT(CASE WHEN name = 'standard_id' AND is_nullable = 0 THEN 1 END) AS standard_id_not_null
FROM sys.columns
WHERE object_id = OBJECT_ID(N'[dbo].[checklist_sections]')
UNION ALL
SELECT 
    'checklist_questions',
    COUNT(CASE WHEN name = 'standard_id' THEN 1 END),
    COUNT(CASE WHEN name = 'standard_id' AND is_nullable = 0 THEN 1 END)
FROM sys.columns
WHERE object_id = OBJECT_ID(N'[dbo].[checklist_questions]')
UNION ALL
SELECT 
    'non_conformities',
    COUNT(CASE WHEN name = 'standard_id' THEN 1 END),
    COUNT(CASE WHEN name = 'standard_id' AND is_nullable = 0 THEN 1 END)
FROM sys.columns
WHERE object_id = OBJECT_ID(N'[dbo].[non_conformities]')
UNION ALL
SELECT 
    'audits',
    COUNT(CASE WHEN name = 'standard_id' THEN 1 END),
    COUNT(CASE WHEN name = 'standard_id' AND is_nullable = 1 THEN 1 END) AS nullable_ok
FROM sys.columns
WHERE object_id = OBJECT_ID(N'[dbo].[audits]');

PRINT '';
PRINT '📊 VINCOLI COMPOSTI:';
SELECT 
    name AS Vincolo,
    OBJECT_NAME(parent_object_id) AS Tabella
FROM sys.key_constraints
WHERE name LIKE '%standard_code%';

PRINT '';
PRINT '📊 FOREIGN KEYS:';
SELECT 
    name AS FK,
    OBJECT_NAME(parent_object_id) AS Da_Tabella,
    OBJECT_NAME(referenced_object_id) AS A_Tabella
FROM sys.foreign_keys
WHERE name LIKE '%standard%' OR name LIKE '%composite%'
ORDER BY parent_object_id, name;

PRINT '';
PRINT '✅ Database pronto per multi-standard!';
PRINT '';

GO
