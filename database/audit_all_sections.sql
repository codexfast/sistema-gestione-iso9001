-- ============================================================================
-- AUDIT COMPLETO TUTTE LE SEZIONI ATTESE
-- ============================================================================
-- PRINT per ogni sezione attesa dal seed vs DB effettivo
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'AUDIT COMPLETO DOMANDE - Tutte le Sezioni Attese dal Seed';
PRINT '============================================================================';
PRINT '';

DECLARE @cnt INT;
DECLARE @total INT = 0;
DECLARE @missing INT = 0;

-- Sezione 4.x
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '4.1' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '4.1: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '4.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '4.2: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '4.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '4.3: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '4.4' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '4.4: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

PRINT '';

-- Sezione 5.x
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '5.1' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '5.1: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '5.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '5.2: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '5.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '5.3: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

PRINT '';

-- Sezione 6.x
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '6.1' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '6.1: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '6.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '6.2: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '6.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (1 - @cnt);
PRINT '6.3: ' + CAST(@cnt AS VARCHAR(10)) + '/1' + CASE WHEN @cnt < 1 THEN ' ❌' ELSE ' ✓' END;

PRINT '';

-- Sezione 7.1.x
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.1.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (1 - @cnt);
PRINT '7.1.2: ' + CAST(@cnt AS VARCHAR(10)) + '/1' + CASE WHEN @cnt < 1 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.1.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (1 - @cnt);
PRINT '7.1.3: ' + CAST(@cnt AS VARCHAR(10)) + '/1' + CASE WHEN @cnt < 1 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.1.4' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (1 - @cnt);
PRINT '7.1.4: ' + CAST(@cnt AS VARCHAR(10)) + '/1' + CASE WHEN @cnt < 1 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.1.5' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '7.1.5: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.1.6' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '7.1.6: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

PRINT '';

-- Sezione 7.x altre
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '7.2: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (1 - @cnt);
PRINT '7.3: ' + CAST(@cnt AS VARCHAR(10)) + '/1' + CASE WHEN @cnt < 1 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.4' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (1 - @cnt);
PRINT '7.4: ' + CAST(@cnt AS VARCHAR(10)) + '/1' + CASE WHEN @cnt < 1 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '7.5' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '7.5: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

PRINT '';

-- Sezione 8.x
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.1' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '8.1: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '8.2: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '8.3: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.4' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '8.4: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.5' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (4 - @cnt);
PRINT '8.5: ' + CAST(@cnt AS VARCHAR(10)) + '/4' + CASE WHEN @cnt < 4 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.6' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '8.6: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '8.7' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (3 - @cnt);
PRINT '8.7: ' + CAST(@cnt AS VARCHAR(10)) + '/3' + CASE WHEN @cnt < 3 THEN ' ❌' ELSE ' ✓' END;

PRINT '';

-- Sezione 9.x
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '9.1' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (4 - @cnt);
PRINT '9.1: ' + CAST(@cnt AS VARCHAR(10)) + '/4' + CASE WHEN @cnt < 4 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '9.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (4 - @cnt);
PRINT '9.2: ' + CAST(@cnt AS VARCHAR(10)) + '/4' + CASE WHEN @cnt < 4 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '9.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (4 - @cnt);
PRINT '9.3: ' + CAST(@cnt AS VARCHAR(10)) + '/4' + CASE WHEN @cnt < 4 THEN ' ❌' ELSE ' ✓' END;

PRINT '';

-- Sezione 10.x
SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '10.2' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (5 - @cnt);
PRINT '10.2: ' + CAST(@cnt AS VARCHAR(10)) + '/5' + CASE WHEN @cnt < 5 THEN ' ❌' ELSE ' ✓' END;

SELECT @cnt = COUNT(*) FROM checklist_questions WHERE section_code = '10.3' AND standard_id = 1;
SET @total = @total + @cnt; SET @missing = @missing + (2 - @cnt);
PRINT '10.3: ' + CAST(@cnt AS VARCHAR(10)) + '/2' + CASE WHEN @cnt < 2 THEN ' ❌' ELSE ' ✓' END;

PRINT '';
PRINT '============================================================================';
PRINT 'RIEPILOGO';
PRINT '============================================================================';
PRINT 'TOTALE DB: ' + CAST(@total AS VARCHAR(10));
PRINT 'TOTALE ATTESO: 77';
PRINT 'MANCANTI: ' + CAST(@missing AS VARCHAR(10));
PRINT '============================================================================';

GO
