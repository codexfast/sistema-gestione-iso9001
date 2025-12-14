-- ============================================================================
-- VERIFICA E FIX SEZIONI CHECKLIST ISO 9001
-- ============================================================================
-- Verifica quali sezioni 7.x mancano e le inserisce manualmente
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'VERIFICA SEZIONI CHECKLIST ISO 9001';
PRINT '============================================================================';
PRINT '';

-- Conta sezioni totali
DECLARE @totalSections INT;
SELECT @totalSections = COUNT(*) FROM checklist_sections WHERE standard_id = 1;
PRINT 'Sezioni totali ISO 9001: ' + CAST(@totalSections AS VARCHAR(10));
PRINT '';

-- Verifica sezioni 7.x specifiche
PRINT 'Verifica sezioni critiche:';
PRINT '';

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.5' AND standard_id = 1)
    PRINT '✓ Sezione 7.1.5 (Risorse monitoraggio) - PRESENTE'
ELSE
    PRINT '✗ Sezione 7.1.5 (Risorse monitoraggio) - MANCANTE';

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.6' AND standard_id = 1)
    PRINT '✓ Sezione 7.1.6 (Conoscenza organizzativa) - PRESENTE'
ELSE
    PRINT '✗ Sezione 7.1.6 (Conoscenza organizzativa) - MANCANTE';

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.2' AND standard_id = 1)
    PRINT '✓ Sezione 7.2 (Competenza) - PRESENTE'
ELSE
    PRINT '✗ Sezione 7.2 (Competenza) - MANCANTE';

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.3' AND standard_id = 1)
    PRINT '✓ Sezione 7.3 (Consapevolezza) - PRESENTE'
ELSE
    PRINT '✗ Sezione 7.3 (Consapevolezza) - MANCANTE';

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.4' AND standard_id = 1)
    PRINT '✓ Sezione 7.4 (Comunicazione) - PRESENTE'
ELSE
    PRINT '✗ Sezione 7.4 (Comunicazione) - MANCANTE';

PRINT '';
PRINT '============================================================================';
PRINT 'FIX SEZIONI MANCANTI';
PRINT '============================================================================';
PRINT '';

-- Fix sezione 7.1.5
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.5' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.1.5', 'Risorse per il monitoraggio e la misurazione', '7.1', 5, 1, 1);
    PRINT '✓ Sezione 7.1.5 inserita';
END

-- Fix sezione 7.1.6
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.6' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.1.6', 'Conoscenza organizzativa', '7.1', 6, 1, 1);
    PRINT '✓ Sezione 7.1.6 inserita';
END

-- Fix sezione 7.2
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.2' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.2', 'Competenza', '7', 2, 1, 1);
    PRINT '✓ Sezione 7.2 inserita';
END

-- Fix sezione 7.3
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.3' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.3', 'Consapevolezza', '7', 3, 1, 1);
    PRINT '✓ Sezione 7.3 inserita';
END

-- Fix sezione 7.4
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.4' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.4', 'Comunicazione', '7', 4, 1, 1);
    PRINT '✓ Sezione 7.4 inserita';
END

PRINT '';
PRINT '============================================================================';
PRINT 'VERIFICA FINALE';
PRINT '============================================================================';

DECLARE @finalSections INT;
SELECT @finalSections = COUNT(*) FROM checklist_sections WHERE standard_id = 1;
PRINT 'Sezioni finali: ' + CAST(@finalSections AS VARCHAR(10));

-- Verifica quali sezioni hanno domande
PRINT '';
PRINT 'Sezioni senza domande:';
SELECT cs.section_code, cs.section_title
FROM checklist_sections cs
WHERE cs.standard_id = 1
AND NOT EXISTS (
    SELECT 1 FROM checklist_questions cq 
    WHERE cq.section_code = cs.section_code 
    AND cq.standard_id = 1
)
ORDER BY cs.section_code;

PRINT '';
PRINT '✓ Ora puoi rieseguire fix_missing_questions.sql per inserire le 7 domande';
PRINT '============================================================================';

GO
