-- =============================================================================
-- Script di Migrazione: Supporto Multi-Standard
-- Sistema Gestione ISO 9001 → Sistema Gestione Integrato
-- 
-- Autore: Sistema Gestione ISO 9001
-- Data: 29 novembre 2025
-- Versione: 1.0
-- 
-- DESCRIZIONE:
-- Questo script migra il database da architettura single-standard (ISO 9001)
-- a multi-standard, permettendo gestione simultanea di:
-- - ISO 9001:2015 (Qualità)
-- - ISO 14001:2015 (Ambiente)
-- - ISO 45001:2018 (Salute e Sicurezza)
-- - Altri standard futuri
--
-- COMPATIBILITÀ: Backward compatible - dati esistenti preservati
-- =============================================================================

USE [SGQ_ISO9001];
GO

PRINT '🚀 Inizio migrazione multi-standard...';
PRINT '';

-- =============================================================================
-- STEP 1: CREAZIONE TABELLA STANDARDS
-- =============================================================================

PRINT '📋 STEP 1/6: Creazione tabella standards...';

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[standards]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[standards] (
        [standard_id] INT IDENTITY(1,1) NOT NULL,
        [standard_code] NVARCHAR(50) NOT NULL,
        [standard_name] NVARCHAR(255) NOT NULL,
        [standard_full_name] NVARCHAR(500) NOT NULL,
        [version] NVARCHAR(50) NOT NULL,
        [category] NVARCHAR(50) NOT NULL CHECK ([category] IN ('quality', 'environment', 'safety', 'security', 'other')),
        [is_active] BIT NOT NULL DEFAULT 1,
        [description] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_standards] PRIMARY KEY CLUSTERED ([standard_id]),
        CONSTRAINT [UQ_standards_code] UNIQUE NONCLUSTERED ([standard_code])
    );
    
    CREATE INDEX [IX_standards_category] ON [dbo].[standards] ([category]);
    CREATE INDEX [IX_standards_active] ON [dbo].[standards] ([is_active]) WHERE [is_active] = 1;
    
    PRINT '   ✅ Tabella standards creata';
END
ELSE
BEGIN
    PRINT '   ⚠️  Tabella standards già esistente';
END
GO

-- Popola standard iniziali
IF NOT EXISTS (SELECT * FROM [dbo].[standards])
BEGIN
    INSERT INTO [dbo].[standards] ([standard_code], [standard_name], [standard_full_name], [version], [category], [description])
    VALUES
    (
        'ISO_9001_2015',
        'ISO 9001:2015',
        'Sistemi di gestione per la qualità - Requisiti',
        '2015',
        'quality',
        'Standard internazionale che definisce i requisiti per un sistema di gestione per la qualità. Aiuta le organizzazioni a migliorare la soddisfazione del cliente attraverso l''applicazione efficace del sistema.'
    ),
    (
        'ISO_14001_2015',
        'ISO 14001:2015',
        'Sistemi di gestione ambientale - Requisiti e guida per l''uso',
        '2015',
        'environment',
        'Standard internazionale che specifica i requisiti per un sistema di gestione ambientale efficace. Aiuta le organizzazioni a migliorare le prestazioni ambientali attraverso un uso più efficiente delle risorse e la riduzione dei rifiuti.'
    ),
    (
        'ISO_45001_2018',
        'ISO 45001:2018',
        'Sistemi di gestione per la salute e sicurezza sul lavoro - Requisiti e guida per l''uso',
        '2018',
        'safety',
        'Standard internazionale che definisce i requisiti per un sistema di gestione della salute e sicurezza sul lavoro. Aiuta le organizzazioni a fornire luoghi di lavoro sicuri e salubri prevenendo infortuni e malattie professionali.'
    );
    
    PRINT '   ✅ Standard ISO 9001, 14001, 45001 inseriti';
END
ELSE
BEGIN
    PRINT '   ⚠️  Standard già presenti';
END
GO

-- =============================================================================
-- STEP 2: MODIFICA TABELLA CHECKLIST_SECTIONS
-- =============================================================================

PRINT '';
PRINT '📋 STEP 2/6: Aggiunta standard_id a checklist_sections...';

-- Aggiungi colonna standard_id (nullable temporaneamente)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[checklist_sections]') 
    AND name = 'standard_id'
)
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ADD [standard_id] INT NULL;
    
    PRINT '   ✅ Colonna standard_id aggiunta';
END
ELSE
BEGIN
    PRINT '   ⚠️  Colonna standard_id già esistente';
END
GO

-- Popola standard_id per sezioni esistenti (ISO 9001)
UPDATE [dbo].[checklist_sections]
SET [standard_id] = (SELECT [standard_id] FROM [dbo].[standards] WHERE [standard_code] = 'ISO_9001_2015')
WHERE [standard_id] IS NULL;

PRINT '   ✅ Sezioni esistenti associate a ISO 9001:2015';
GO

-- STEP 2A: Rendi standard_id NOT NULL SUBITO (mentre non ci sono dipendenze)
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[checklist_sections]') 
    AND name = 'standard_id'
    AND is_nullable = 1
)
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ALTER COLUMN [standard_id] INT NOT NULL;
    
    PRINT '   ✅ Colonna standard_id impostata NOT NULL';
END
ELSE
BEGIN
    PRINT '   ⚠️  Colonna standard_id già NOT NULL';
END
GO

-- STEP 2B: Aggiungi foreign key verso standards
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_checklist_sections_standard'
)
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ADD CONSTRAINT [FK_checklist_sections_standard] 
        FOREIGN KEY ([standard_id]) 
        REFERENCES [dbo].[standards]([standard_id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    
    PRINT '   ✅ Foreign key FK_checklist_sections_standard creata';
END
ELSE
BEGIN
    PRINT '   ⚠️  Foreign key FK_checklist_sections_standard già esistente';
END
GO

-- STEP 2C: Crea indice su standard_id
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_checklist_sections_standard'
    AND object_id = OBJECT_ID(N'[dbo].[checklist_sections]')
)
BEGIN
    CREATE INDEX [IX_checklist_sections_standard] 
    ON [dbo].[checklist_sections] ([standard_id]);
    
    PRINT '   ✅ Indice IX_checklist_sections_standard creato';
END
ELSE
BEGIN
    PRINT '   ⚠️  Indice IX_checklist_sections_standard già esistente';
END
GO

-- STEP 2D: Crea nuovo vincolo UNIQUE composto (standard_id + section_code)
IF NOT EXISTS (
    SELECT * FROM sys.key_constraints 
    WHERE name = 'UQ_checklist_sections_standard_code'
)
BEGIN
    ALTER TABLE [dbo].[checklist_sections]
    ADD CONSTRAINT [UQ_checklist_sections_standard_code] 
        UNIQUE NONCLUSTERED ([standard_id], [section_code]);
    
    PRINT '   ✅ Vincolo UQ_checklist_sections_standard_code creato';
END
ELSE
BEGIN
    PRINT '   ⚠️  Vincolo UQ_checklist_sections_standard_code già esistente';
END
GO

-- STEP 2E: Ricrea FK da checklist_questions verso checklist_sections
-- NOTA: Ora section_code NON è più UNIQUE da solo, quindi questa FK non può esistere
-- La rimuoviamo definitivamente e la sostituiremo con FK su (standard_id, section_code)
IF EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_checklist_questions_section'
)
BEGIN
    ALTER TABLE [dbo].[checklist_questions]
    DROP CONSTRAINT [FK_checklist_questions_section];
    
    PRINT '   ✅ FK_checklist_questions_section rimossa (obsoleta)';
END
GO

-- STEP 2F: Ricrea FK da non_conformities verso checklist_sections
-- Stesso problema: dobbiamo usare vincolo composto
IF EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_non_conformities_section'
)
BEGIN
    ALTER TABLE [dbo].[non_conformities]
    DROP CONSTRAINT [FK_non_conformities_section];
    
    PRINT '   ✅ FK_non_conformities_section rimossa (obsoleta)';
END
GO

-- =============================================================================
-- STEP 3: MODIFICA TABELLA CHECKLIST_QUESTIONS
-- =============================================================================

PRINT '';
PRINT '📋 STEP 3/6: Aggiunta standard_id a checklist_questions...';

-- Aggiungi colonna standard_id
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[checklist_questions]') 
    AND name = 'standard_id'
)
BEGIN
    ALTER TABLE [dbo].[checklist_questions]
    ADD [standard_id] INT NULL;
    
    PRINT '   ✅ Colonna standard_id aggiunta';
END
GO

-- Popola standard_id per domande esistenti (eredita da sezione)
UPDATE q
SET q.[standard_id] = s.[standard_id]
FROM [dbo].[checklist_questions] q
INNER JOIN [dbo].[checklist_sections] s ON q.[section_code] = s.[section_code]
WHERE q.[standard_id] IS NULL;

PRINT '   ✅ Domande esistenti associate a ISO 9001:2015';
GO

-- STEP 3A: Rendi standard_id NOT NULL PRIMA di creare vincoli
ALTER TABLE [dbo].[checklist_questions]
ALTER COLUMN [standard_id] INT NOT NULL;

PRINT '   ✅ Colonna standard_id impostata NOT NULL';
GO

-- STEP 3B: Aggiungi foreign key verso standards
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_checklist_questions_standard'
)
BEGIN
    ALTER TABLE [dbo].[checklist_questions]
    ADD CONSTRAINT [FK_checklist_questions_standard] 
        FOREIGN KEY ([standard_id]) 
        REFERENCES [dbo].[standards]([standard_id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    
    PRINT '   ✅ Foreign key FK_checklist_questions_standard creata';
END
GO

-- STEP 3C: Crea indice su standard_id
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_checklist_questions_standard'
)
BEGIN
    CREATE INDEX [IX_checklist_questions_standard] 
    ON [dbo].[checklist_questions] ([standard_id]);
    
    PRINT '   ✅ Indice IX_checklist_questions_standard creato';
END;
GO

-- =============================================================================
-- STEP 4: MODIFICA TABELLA AUDITS
-- =============================================================================

PRINT '';
PRINT '📋 STEP 4/6: Aggiunta standard_id a audits...';

-- Aggiungi colonna standard_id (nullable per supportare audit multi-standard)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[audits]') 
    AND name = 'standard_id'
)
BEGIN
    ALTER TABLE [dbo].[audits]
    ADD [standard_id] INT NULL;
    
    PRINT '   ✅ Colonna standard_id aggiunta';
END
GO

-- Popola standard_id per audit esistenti (ISO 9001)
UPDATE [dbo].[audits]
SET [standard_id] = (SELECT [standard_id] FROM [dbo].[standards] WHERE [standard_code] = 'ISO_9001_2015')
WHERE [standard_id] IS NULL;

PRINT '   ✅ Audit esistenti associati a ISO 9001:2015';
GO

-- Aggiungi foreign key verso standards
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_audits_standard'
)
BEGIN
    ALTER TABLE [dbo].[audits]
    ADD CONSTRAINT [FK_audits_standard] 
        FOREIGN KEY ([standard_id]) 
        REFERENCES [dbo].[standards]([standard_id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    
    PRINT '   ✅ Foreign key FK_audits_standard creata';
END
GO

-- Crea indice su standard_id
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_audits_standard'
)
BEGIN
    CREATE INDEX [IX_audits_standard] 
    ON [dbo].[audits] ([standard_id]);
    
    PRINT '   ✅ Indice IX_audits_standard creato';
END
GO

-- NOTA: standard_id rimane NULLABLE per supportare audit multi-standard
-- (se NULL, controllare tabella audit_standards)

-- =============================================================================
-- STEP 5: CREAZIONE TABELLA AUDIT_STANDARDS (Multi-Standard Support)
-- =============================================================================

PRINT '';
PRINT '📋 STEP 5/6: Creazione tabella audit_standards (audit integrati)...';

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audit_standards]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[audit_standards] (
        [audit_id] INT NOT NULL,
        [standard_id] INT NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_audit_standards] PRIMARY KEY CLUSTERED ([audit_id], [standard_id]),
        CONSTRAINT [FK_audit_standards_audit] FOREIGN KEY ([audit_id])
            REFERENCES [dbo].[audits]([audit_id])
            ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT [FK_audit_standards_standard] FOREIGN KEY ([standard_id])
            REFERENCES [dbo].[standards]([standard_id])
            ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE INDEX [IX_audit_standards_standard] ON [dbo].[audit_standards] ([standard_id]);
    
    PRINT '   ✅ Tabella audit_standards creata';
    PRINT '   ℹ️  Usare questa tabella per audit che verificano più standard contemporaneamente';
END
ELSE
BEGIN
    PRINT '   ⚠️  Tabella audit_standards già esistente';
END
GO

-- =============================================================================
-- STEP 6: AGGIORNAMENTO VIEW VW_AUDIT_DASHBOARD
-- =============================================================================

PRINT '';
PRINT '📋 STEP 6/6: Aggiornamento view vw_audit_dashboard...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_audit_dashboard')
BEGIN
    DROP VIEW [dbo].[vw_audit_dashboard];
    PRINT '   ✅ View esistente rimossa';
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
    
    -- Standard info
    a.[standard_id],
    s.[standard_code],
    s.[standard_name],
    s.[category] AS standard_category,
    
    -- Multi-standard flag
    CASE 
        WHEN EXISTS (SELECT 1 FROM [dbo].[audit_standards] WHERE [audit_id] = a.[audit_id])
        THEN 1 
        ELSE 0 
    END AS is_multi_standard,
    
    -- User info
    u.[full_name] AS created_by_name,
    u.[email] AS created_by_email,
    
    -- Aggregates
    (SELECT COUNT(*) FROM [dbo].[attachments] WHERE [audit_id] = a.[audit_id]) AS attachments_count,
    (SELECT COUNT(*) FROM [dbo].[non_conformities] WHERE [audit_id] = a.[audit_id] AND [status] = 'open') AS open_nc_count
FROM [dbo].[audits] a
INNER JOIN [dbo].[users] u ON a.[created_by] = u.[user_id]
LEFT JOIN [dbo].[standards] s ON a.[standard_id] = s.[standard_id]
WHERE a.[is_deleted] = 0;
GO

PRINT '   ✅ View vw_audit_dashboard aggiornata con supporto multi-standard';
GO

-- =============================================================================
-- VERIFICA FINALE
-- =============================================================================

PRINT '';
PRINT '========================================';
PRINT '🎉 MIGRAZIONE COMPLETATA CON SUCCESSO';
PRINT '========================================';
PRINT '';

-- Mostra riepilogo standard
PRINT '📊 STANDARD DISPONIBILI:';
SELECT 
    [standard_id] AS ID,
    [standard_code] AS Codice,
    [standard_name] AS Nome,
    [category] AS Categoria,
    [is_active] AS Attivo
FROM [dbo].[standards]
ORDER BY [standard_id];

PRINT '';

-- Mostra riepilogo sezioni per standard
PRINT '📊 SEZIONI PER STANDARD:';
SELECT 
    s.[standard_name] AS Standard,
    COUNT(cs.[section_id]) AS [Num Sezioni]
FROM [dbo].[standards] s
LEFT JOIN [dbo].[checklist_sections] cs ON s.[standard_id] = cs.[standard_id]
GROUP BY s.[standard_id], s.[standard_name]
ORDER BY s.[standard_id];

PRINT '';

-- Mostra riepilogo audit per standard
PRINT '📊 AUDIT PER STANDARD:';
SELECT 
    COALESCE(s.[standard_name], 'Multi-Standard') AS Standard,
    COUNT(a.[audit_id]) AS [Num Audit]
FROM [dbo].[audits] a
LEFT JOIN [dbo].[standards] s ON a.[standard_id] = s.[standard_id]
WHERE a.[is_deleted] = 0
GROUP BY s.[standard_id], s.[standard_name]
ORDER BY s.[standard_id];

PRINT '';
PRINT '✅ DATABASE: SGQ_ISO9001';
PRINT '✅ NUOVA TABELLA: standards (3 standard configurati)';
PRINT '✅ NUOVA TABELLA: audit_standards (supporto audit integrati)';
PRINT '✅ MODIFICHE: checklist_sections, checklist_questions, audits';
PRINT '✅ VIEW AGGIORNATA: vw_audit_dashboard';
PRINT '';
PRINT '🚀 Prossimi passi:';
PRINT '   1. Backend può filtrare sezioni: WHERE standard_id = @standardId';
PRINT '   2. Frontend può selezionare standard durante creazione audit';
PRINT '   3. Popolare sezioni ISO 14001 e ISO 45001 quando necessario';
PRINT '';
PRINT '📖 ESEMPI QUERY:';
PRINT '';
PRINT '   -- Audit solo ISO 9001';
PRINT '   SELECT * FROM vw_audit_dashboard WHERE standard_code = ''ISO_9001_2015'';';
PRINT '';
PRINT '   -- Sezioni ISO 14001 (da popolare)';
PRINT '   SELECT * FROM checklist_sections WHERE standard_id = 2;';
PRINT '';
PRINT '   -- Audit multi-standard';
PRINT '   SELECT * FROM vw_audit_dashboard WHERE is_multi_standard = 1;';
PRINT '';
PRINT '========================================';

GO
