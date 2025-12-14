-- ============================================================================
-- CONFRONTO SEED ATTESO vs DB EFFETTIVO
-- ============================================================================
-- Conta domande per sezione e confronta con valori attesi dal seed
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'CONFRONTO SEED vs DB - Sezioni con Discrepanze';
PRINT '============================================================================';
PRINT '';

-- Query diretta senza tabella temporanea
SELECT 
    expected.section_code,
    ISNULL(actual.cnt, 0) as db_count,
    expected.expected_count,
    ISNULL(actual.cnt, 0) - expected.expected_count as diff
FROM (
    -- Valori attesi dal seed
    SELECT '4.1' as section_code, 2 as expected_count UNION ALL
    SELECT '4.2', 2 UNION ALL SELECT '4.3', 3 UNION ALL SELECT '4.4', 3 UNION ALL
    SELECT '5.1', 3 UNION ALL SELECT '5.2', 2 UNION ALL SELECT '5.3', 2 UNION ALL
    SELECT '6.1', 3 UNION ALL SELECT '6.2', 3 UNION ALL SELECT '6.3', 1 UNION ALL
    SELECT '7.1.2', 1 UNION ALL SELECT '7.1.3', 1 UNION ALL SELECT '7.1.4', 1 UNION ALL 
    SELECT '7.1.5', 3 UNION ALL SELECT '7.1.6', 2 UNION ALL
    SELECT '7.2', 3 UNION ALL SELECT '7.3', 1 UNION ALL SELECT '7.4', 1 UNION ALL SELECT '7.5', 2 UNION ALL
    SELECT '8.1', 2 UNION ALL SELECT '8.2', 3 UNION ALL SELECT '8.3', 2 UNION ALL 
    SELECT '8.4', 3 UNION ALL SELECT '8.5', 4 UNION ALL SELECT '8.6', 3 UNION ALL SELECT '8.7', 3 UNION ALL
    SELECT '9.1', 4 UNION ALL SELECT '9.2', 4 UNION ALL SELECT '9.3', 4 UNION ALL
    SELECT '10.2', 5 UNION ALL SELECT '10.3', 2
) expected
LEFT JOIN (
    -- Conteggio effettivo dal DB
    SELECT section_code, COUNT(*) as cnt
    FROM checklist_questions
    WHERE standard_id = 1
    GROUP BY section_code
) actual ON expected.section_code = actual.section_code
WHERE ISNULL(actual.cnt, 0) != expected.expected_count
ORDER BY expected.section_code;

PRINT '';
PRINT '============================================================================';

-- Totali
DECLARE @db_total INT;
SELECT @db_total = COUNT(*) FROM checklist_questions WHERE standard_id = 1;

PRINT 'TOTALE DB: ' + CAST(@db_total AS VARCHAR(10));
PRINT 'TOTALE ATTESO: 77';
PRINT 'MANCANTI: ' + CAST(77 - @db_total AS VARCHAR(10));
PRINT '============================================================================';

GO
