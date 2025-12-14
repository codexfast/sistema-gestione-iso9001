-- ============================================================================
-- DIAGNOSI DOMANDE MANCANTI ISO 9001
-- ============================================================================
-- Confronta lo schema delle domande nel seed originale vs DB attuale
-- per identificare esattamente quali 2 domande mancano
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'DIAGNOSI DOMANDE CHECKLIST ISO 9001';
PRINT '============================================================================';
PRINT '';

-- Conta domande per sezione
PRINT 'Distribuzione domande per sezione (solo sezioni con domande):';
PRINT '';

SELECT 
    cs.section_code,
    cs.section_title,
    COUNT(cq.question_id) as num_domande
FROM checklist_sections cs
LEFT JOIN checklist_questions cq 
    ON cs.section_code = cq.section_code 
    AND cs.standard_id = cq.standard_id
WHERE cs.standard_id = 1
GROUP BY cs.section_code, cs.section_title
HAVING COUNT(cq.question_id) > 0
ORDER BY cs.section_code;

PRINT '';
PRINT '============================================================================';
PRINT '';

-- Conta totale
DECLARE @total INT;
SELECT @total = COUNT(*) FROM checklist_questions WHERE standard_id = 1;
PRINT 'TOTALE DOMANDE: ' + CAST(@total AS VARCHAR(10)) + '/77';

PRINT '';
PRINT '============================================================================';
PRINT 'SEZIONI SENZA DOMANDE (potrebbero essere header sections)';
PRINT '============================================================================';
PRINT '';

SELECT 
    cs.section_code,
    cs.section_title,
    cs.parent_section_code
FROM checklist_sections cs
WHERE cs.standard_id = 1
AND NOT EXISTS (
    SELECT 1 FROM checklist_questions cq 
    WHERE cq.section_code = cs.section_code 
    AND cq.standard_id = 1
)
ORDER BY cs.section_code;

PRINT '';
PRINT '============================================================================';
PRINT 'ANALISI SEED ORIGINALE vs DB';
PRINT '============================================================================';
PRINT '';

-- Verifica sezioni critiche che dovrebbero avere domande
PRINT 'Verifica sezioni critiche:';
PRINT '';

-- Sezione 7.2 (Competenza) - dovrebbe avere 2 domande
DECLARE @count_7_2 INT;
SELECT @count_7_2 = COUNT(*) FROM checklist_questions WHERE section_code = '7.2' AND standard_id = 1;
PRINT '7.2 (Competenza): ' + CAST(@count_7_2 AS VARCHAR(10)) + ' domande (atteso: 2)';

-- Sezione 7.3 (Consapevolezza) - dovrebbe avere 1 domanda
DECLARE @count_7_3 INT;
SELECT @count_7_3 = COUNT(*) FROM checklist_questions WHERE section_code = '7.3' AND standard_id = 1;
PRINT '7.3 (Consapevolezza): ' + CAST(@count_7_3 AS VARCHAR(10)) + ' domande (atteso: 1)';

-- Sezione 7.4 (Comunicazione) - dovrebbe avere 1 domanda
DECLARE @count_7_4 INT;
SELECT @count_7_4 = COUNT(*) FROM checklist_questions WHERE section_code = '7.4' AND standard_id = 1;
PRINT '7.4 (Comunicazione): ' + CAST(@count_7_4 AS VARCHAR(10)) + ' domande (atteso: 1)';

-- Sezione 7.5 (Informazioni documentate) - dovrebbe avere 2 domande
DECLARE @count_7_5 INT;
SELECT @count_7_5 = COUNT(*) FROM checklist_questions WHERE section_code = '7.5' AND standard_id = 1;
PRINT '7.5 (Informazioni documentate): ' + CAST(@count_7_5 AS VARCHAR(10)) + ' domande (atteso: 2)';

PRINT '';
PRINT '============================================================================';

GO
