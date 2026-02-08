-- ============================================================================
-- Migration 009: Tabella audit_standards (N:M audit ↔ standards)
-- ============================================================================
-- Descrizione:
--   Crea tabella di relazione N:N tra audits e standards per supportare
--   audit multi-standard (es: ISO 9001 + ISO 14001 + ISO 45001 combinati)
--
-- Autore: Sistema Gestione ISO 9001 - QS Studio
-- Data: 8 Febbraio 2026
-- Versione: 1.0
--
-- Dipendenze:
--   - Tabella audits esistente
--   - Tabella standards esistente
--
-- Rollback:
--   DROP TABLE audit_standards;
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;
PRINT '';
PRINT '================================================================================';
PRINT 'Migration 009: Tabella audit_standards (N:M audit ↔ standards)';
PRINT '================================================================================';
PRINT '';

-- ============================================================================
-- STEP 1: Verifica prerequisiti
-- ============================================================================

PRINT '🔍 STEP 1: Verifica prerequisiti...';

-- Verifica esistenza tabella audits
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audits')
BEGIN
    RAISERROR('❌ ERRORE: Tabella audits non trovata. Esegui prima migration 001.', 16, 1);
    RETURN;
END
PRINT '  ✅ Tabella audits trovata';

-- Verifica esistenza tabella standards
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'standards')
BEGIN
    RAISERROR('❌ ERRORE: Tabella standards non trovata. Esegui prima migration 002.', 16, 1);
    RETURN;
END
PRINT '  ✅ Tabella standards trovata';

-- Verifica che audit_standards NON esista già
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_standards')
BEGIN
    PRINT '  ⚠️  Tabella audit_standards già esistente. Migration già eseguita.';
    PRINT '';
    PRINT '✅ Migration 009 già applicata. Nessuna azione necessaria.';
    RETURN;
END

PRINT '';

-- ============================================================================
-- STEP 2: Crea tabella audit_standards
-- ============================================================================

PRINT '🛠️  STEP 2: Creazione tabella audit_standards...';

CREATE TABLE dbo.audit_standards (
    audit_standard_id INT IDENTITY(1,1) NOT NULL,
    audit_id INT NOT NULL,
    standard_id INT NOT NULL,
    is_primary BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Primary Key
    CONSTRAINT PK_audit_standards PRIMARY KEY CLUSTERED (audit_standard_id),
    
    -- Foreign Keys
    CONSTRAINT FK_audit_standards_audit 
        FOREIGN KEY (audit_id) 
        REFERENCES dbo.audits(audit_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT FK_audit_standards_standard 
        FOREIGN KEY (standard_id) 
        REFERENCES dbo.standards(standard_id),
    
    -- Unique Constraint: un audit non può avere lo stesso standard più volte
    CONSTRAINT UQ_audit_standards_audit_standard 
        UNIQUE (audit_id, standard_id)
);

PRINT '  ✅ Tabella audit_standards creata';

-- ============================================================================
-- STEP 3: Crea indici per performance
-- ============================================================================

PRINT '';
PRINT '📊 STEP 3: Creazione indici...';

CREATE NONCLUSTERED INDEX idx_audit_standards_audit 
    ON dbo.audit_standards(audit_id)
    INCLUDE (standard_id, is_primary);

PRINT '  ✅ Indice idx_audit_standards_audit creato';

CREATE NONCLUSTERED INDEX idx_audit_standards_standard 
    ON dbo.audit_standards(standard_id)
    INCLUDE (audit_id, is_primary);

PRINT '  ✅ Indice idx_audit_standards_standard creato';

CREATE NONCLUSTERED INDEX idx_audit_standards_primary 
    ON dbo.audit_standards(is_primary)
    WHERE is_primary = 1;

PRINT '  ✅ Indice idx_audit_standards_primary creato';

-- ============================================================================
-- STEP 4: Migrazione dati esistenti
-- ============================================================================

PRINT '';
PRINT '🔄 STEP 4: Migrazione dati esistenti...';

-- Conta audit con standard_id popolato
DECLARE @auditCount INT;
SELECT @auditCount = COUNT(*) 
FROM audits 
WHERE standard_id IS NOT NULL;

PRINT '  📋 Trovati ' + CAST(@auditCount AS NVARCHAR(10)) + ' audit con standard_id popolato';

-- Migra relazioni da audits.standard_id → audit_standards
INSERT INTO dbo.audit_standards (audit_id, standard_id, is_primary)
SELECT 
    audit_id, 
    standard_id, 
    1  -- Tutti gli audit esistenti hanno 1 solo standard → is_primary = TRUE
FROM audits
WHERE standard_id IS NOT NULL;

DECLARE @migratedCount INT = @@ROWCOUNT;

PRINT '  ✅ Migrati ' + CAST(@migratedCount AS NVARCHAR(10)) + ' record in audit_standards';

-- ============================================================================
-- STEP 5: Verifica integrità dati
-- ============================================================================

PRINT '';
PRINT '✔️  STEP 5: Verifica integrità dati...';

-- Verifica: ogni audit in audit_standards esiste in audits
DECLARE @orphanedAudits INT;
SELECT @orphanedAudits = COUNT(*)
FROM audit_standards ast
LEFT JOIN audits a ON ast.audit_id = a.audit_id
WHERE a.audit_id IS NULL;

IF @orphanedAudits > 0
BEGIN
    RAISERROR('❌ ERRORE: %d record in audit_standards fanno riferimento a audit inesistenti!', 16, 1, @orphanedAudits);
    ROLLBACK;
    RETURN;
END
PRINT '  ✅ Integrità FK audit_id: OK';

-- Verifica: ogni standard in audit_standards esiste in standards
DECLARE @orphanedStandards INT;
SELECT @orphanedStandards = COUNT(*)
FROM audit_standards ast
LEFT JOIN standards s ON ast.standard_id = s.standard_id
WHERE s.standard_id IS NULL;

IF @orphanedStandards > 0
BEGIN
    RAISERROR('❌ ERRORE: %d record in audit_standards fanno riferimento a standard inesistenti!', 16, 1, @orphanedStandards);
    ROLLBACK;
    RETURN;
END
PRINT '  ✅ Integrità FK standard_id: OK';

-- Verifica: ogni audit ha almeno un is_primary = 1 (se ha standard)
DECLARE @auditsWithoutPrimary INT;
SELECT @auditsWithoutPrimary = COUNT(DISTINCT ast.audit_id)
FROM audit_standards ast
WHERE NOT EXISTS (
    SELECT 1 
    FROM audit_standards ast2 
    WHERE ast2.audit_id = ast.audit_id 
    AND ast2.is_primary = 1
);

IF @auditsWithoutPrimary > 0
BEGIN
    PRINT '  ⚠️  WARNING: ' + CAST(@auditsWithoutPrimary AS NVARCHAR(10)) + ' audit senza standard primario';
END
ELSE
BEGIN
    PRINT '  ✅ Vincolo is_primary: OK (ogni audit ha uno standard primario)';
END

-- Verifica: nessun audit ha più di un is_primary = 1
DECLARE @auditsMultiplePrimary INT;
SELECT @auditsMultiplePrimary = COUNT(*)
FROM (
    SELECT audit_id
    FROM audit_standards
    WHERE is_primary = 1
    GROUP BY audit_id
    HAVING COUNT(*) > 1
) AS duplicates;

IF @auditsMultiplePrimary > 0
BEGIN
    RAISERROR('❌ ERRORE: %d audit hanno più di uno standard primario!', 16, 1, @auditsMultiplePrimary);
    ROLLBACK;
    RETURN;
END
PRINT '  ✅ Vincolo is_primary UNIQUE: OK (ogni audit ha max 1 standard primario)';

-- ============================================================================
-- STEP 6: Statistiche finali
-- ============================================================================

PRINT '';
PRINT '📊 STEP 6: Statistiche finali...';
PRINT '';

-- Conta totale relazioni
DECLARE @totalRelations INT;
SELECT @totalRelations = COUNT(*) FROM audit_standards;
PRINT '  📋 Totale relazioni audit ↔ standard: ' + CAST(@totalRelations AS NVARCHAR(10));

-- Conta audit con standard
DECLARE @auditsWithStandards INT;
SELECT @auditsWithStandards = COUNT(DISTINCT audit_id) FROM audit_standards;
PRINT '  📁 Audit con almeno uno standard: ' + CAST(@auditsWithStandards AS NVARCHAR(10));

-- Conta audit multi-standard
DECLARE @multiStandardAudits INT;
SELECT @multiStandardAudits = COUNT(*)
FROM (
    SELECT audit_id
    FROM audit_standards
    GROUP BY audit_id
    HAVING COUNT(*) > 1
) AS multi;
PRINT '  🔗 Audit con più standard (multi-standard): ' + CAST(@multiStandardAudits AS NVARCHAR(10));

-- Distribuzione standard
PRINT '';
PRINT '  📊 Distribuzione per standard:';
SELECT 
    s.standard_code,
    s.standard_name,
    COUNT(ast.audit_id) AS audit_count,
    SUM(CASE WHEN ast.is_primary = 1 THEN 1 ELSE 0 END) AS primary_count
FROM standards s
LEFT JOIN audit_standards ast ON s.standard_id = ast.standard_id
GROUP BY s.standard_id, s.standard_code, s.standard_name
ORDER BY audit_count DESC;

-- ============================================================================
-- STEP 7: Aggiungi metadata
-- ============================================================================

PRINT '';
PRINT '📝 STEP 7: Metadata tabella...';

-- Descrizione tabella
EXEC sp_addextendedproperty 
    @name = 'MS_Description',
    @value = 'Relazione N:N tra audit e standard ISO. Permette audit multi-standard (es: ISO 9001 + ISO 14001 combinati).',
    @level0type = 'SCHEMA', @level0name = 'dbo',
    @level1type = 'TABLE',  @level1name = 'audit_standards';

-- Descrizione colonne
EXEC sp_addextendedproperty 
    @name = 'MS_Description',
    @value = 'ID univoco relazione audit-standard',
    @level0type = 'SCHEMA', @level0name = 'dbo',
    @level1type = 'TABLE',  @level1name = 'audit_standards',
    @level2type = 'COLUMN', @level2name = 'audit_standard_id';

EXEC sp_addextendedproperty 
    @name = 'MS_Description',
    @value = 'FK: Riferimento audit',
    @level0type = 'SCHEMA', @level0name = 'dbo',
    @level1type = 'TABLE',  @level1name = 'audit_standards',
    @level2type = 'COLUMN', @level2name = 'audit_id';

EXEC sp_addextendedproperty 
    @name = 'MS_Description',
    @value = 'FK: Riferimento standard ISO',
    @level0type = 'SCHEMA', @level0name = 'dbo',
    @level1type = 'TABLE',  @level1name = 'audit_standards',
    @level2type = 'COLUMN', @level2name = 'standard_id';

EXEC sp_addextendedproperty 
    @name = 'MS_Description',
    @value = 'TRUE se standard primario audit (determina template base, numerazione, ecc.). Solo uno per audit.',
    @level0type = 'SCHEMA', @level0name = 'dbo',
    @level1type = 'TABLE',  @level1name = 'audit_standards',
    @level2type = 'COLUMN', @level2name = 'is_primary';

EXEC sp_addextendedproperty 
    @name = 'MS_Description',
    @value = 'Timestamp creazione relazione',
    @level0type = 'SCHEMA', @level0name = 'dbo',
    @level1type = 'TABLE',  @level1name = 'audit_standards',
    @level2type = 'COLUMN', @level2name = 'created_at';

PRINT '  ✅ Metadata aggiunti';

-- ============================================================================
-- COMPLETAMENTO
-- ============================================================================

PRINT '';
PRINT '================================================================================';
PRINT '✅ Migration 009 completata con successo!';
PRINT '================================================================================';
PRINT '';
PRINT '📌 PROSSIMI PASSI:';
PRINT '  1. Eseguire Migration 010 (depreca audits.standard_id)';
PRINT '  2. Aggiornare backend API per supportare multi-standard';
PRINT '  3. Aggiornare frontend UI (multi-select standard)';
PRINT '  4. Test E2E audit multi-standard';
PRINT '';
PRINT '⚠️  NOTE:';
PRINT '  - La colonna audits.standard_id è ancora presente (backward compatibility)';
PRINT '  - Nuovi audit devono popolare audit_standards (non più audits.standard_id)';
PRINT '  - Migration 010 deprecherà audits.standard_id definitivamente';
PRINT '';

GO
