-- ============================================================================
-- VERIFICA COLONNE PRESENTI NELLE TABELLE
-- ============================================================================
-- Query per scoprire quali colonne esistono realmente nel database
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'COLONNE TABELLA: audits';
PRINT '============================================================================';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'audits'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '============================================================================';
PRINT 'COLONNE TABELLA: audit_responses';
PRINT '============================================================================';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'audit_responses'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '============================================================================';
PRINT 'COLONNE TABELLA: attachments';
PRINT '============================================================================';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'attachments'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '============================================================================';
PRINT 'COLONNE TABELLA: non_conformities';
PRINT '============================================================================';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'non_conformities'
ORDER BY ORDINAL_POSITION;

GO
