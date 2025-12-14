-- ============================================================================
-- VERIFICA DETTAGLIATA DOMANDE PER SEZIONE
-- ============================================================================
-- Verifica manualmente le sezioni più probabili per identificare le 2 mancanti
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'VERIFICA DETTAGLIATA DOMANDE PER SEZIONE';
PRINT '============================================================================';
PRINT '';

-- Sezioni che probabilmente hanno problemi (sezione 8, 9, 10 tipicamente più complesse)
DECLARE @cnt INT;

-- 8.5 (dovrebbe avere 4 domande)
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.5' AND standard_id = 1;
PRINT '8.5 (Produzione ed erogazione): ' + CAST(@cnt AS VARCHAR(10)) + '/4 domande' + CASE WHEN @cnt < 4 THEN ' ❌ MANCANTE' ELSE '' END;

-- 8.6 (dovrebbe avere 3 domande)
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.6' AND standard_id = 1;
PRINT '8.6 (Rilascio): ' + CAST(@cnt AS VARCHAR(10)) + '/3 domande' + CASE WHEN @cnt < 3 THEN ' ❌ MANCANTE' ELSE '' END;

-- 9.1 (dovrebbe avere 4 domande)
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '9.1' AND standard_id = 1;
PRINT '9.1 (Monitoraggio e misurazione): ' + CAST(@cnt AS VARCHAR(10)) + '/4 domande' + CASE WHEN @cnt < 4 THEN ' ❌ MANCANTE' ELSE '' END;

-- 9.2 (dovrebbe avere 4 domande)
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '9.2' AND standard_id = 1;
PRINT '9.2 (Audit interno): ' + CAST(@cnt AS VARCHAR(10)) + '/4 domande' + CASE WHEN @cnt < 4 THEN ' ❌ MANCANTE' ELSE '' END;

-- 9.3 (dovrebbe avere 4 domande)
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '9.3' AND standard_id = 1;
PRINT '9.3 (Riesame direzione): ' + CAST(@cnt AS VARCHAR(10)) + '/4 domande' + CASE WHEN @cnt < 4 THEN ' ❌ MANCANTE' ELSE '' END;

-- 10.2 (dovrebbe avere 5 domande)
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '10.2' AND standard_id = 1;
PRINT '10.2 (Non conformità e azioni correttive): ' + CAST(@cnt AS VARCHAR(10)) + '/5 domande' + CASE WHEN @cnt < 5 THEN ' ❌ MANCANTE' ELSE '' END;

-- 10.3 (dovrebbe avere 2 domande)
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '10.3' AND standard_id = 1;
PRINT '10.3 (Miglioramento continuo): ' + CAST(@cnt AS VARCHAR(10)) + '/2 domande' + CASE WHEN @cnt < 2 THEN ' ❌ MANCANTE' ELSE '' END;

PRINT '';
PRINT '============================================================================';
PRINT 'LISTA COMPLETA DOMANDE PER SEZIONE (tutte le sezioni)';
PRINT '============================================================================';
PRINT '';

-- Lista completa di tutte le sezioni con count
SELECT 
    section_code,
    COUNT(*) as num_domande
FROM checklist_questions
WHERE standard_id = 1
GROUP BY section_code
ORDER BY section_code;

PRINT '';
PRINT '============================================================================';

GO
