-- ============================================================================
-- FIX DOMANDE CHECKLIST ISO 9001 - Sezioni Mancanti
-- ============================================================================
-- Inserisce 7 domande mancanti con FK error (sezioni 7.x intermedie)
-- Prerequisito: Seed principale già eseguito (70/77 domande presenti)
-- 
-- ISTRUZIONI ESECUZIONE:
-- 1. Verificare che seed principale sia stato eseguito: 
--    SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 1; -- Dovrebbe essere 70
-- 2. Eseguire questo script in SSMS
-- 3. Verificare: dovrebbe diventare 77
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'FIX DOMANDE CHECKLIST ISO 9001 - Sezioni 7.x';
PRINT '============================================================================';
PRINT '';

-- Verifica stato iniziale
DECLARE @currentCount INT;
SELECT @currentCount = COUNT(*) FROM checklist_questions WHERE standard_id = 1;
PRINT 'Domande attuali ISO 9001: ' + CAST(@currentCount AS VARCHAR(10));

IF @currentCount >= 77
BEGIN
    PRINT '⚠️ Warning: Già presenti 77+ domande. Verificare se serve realmente questo fix.';
    PRINT 'Esecuzione comunque consentita (INSERT ignorerà duplicati se esistono).';
END

PRINT '';
PRINT 'Inserimento 7 domande mancanti...';
PRINT '';

-- ============================================================================
-- DOMANDE SEZIONE 7.1.5 (Risorse per monitoraggio e misurazione)
-- ============================================================================
-- Nota: Le 3 domande di questa sezione erano già inserite nello script principale
-- ma fallirono per FK error. Le reinseriamo qui dopo aver verificato la sezione.

-- Verifica esistenza sezione
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.5' AND standard_id = 1)
BEGIN
    PRINT '⚠️ Sezione 7.1.5 mancante - skip domande (seed principale incompleto?)';
END
ELSE
BEGIN
    -- Domanda 7.1.5.1
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.5' AND display_order = 1 AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('L''organizzazione ha determinato e fornito le risorse necessarie per il monitoraggio e la misurazione per verificare la conformità?', 'conformity', '7.1.5', 1, 1);
        PRINT '✓ Domanda 7.1.5.1 inserita';
    END

    -- Domanda 7.1.5.2
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.5' AND display_order = 2 AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('Le risorse per il monitoraggio e la misurazione sono idonee e mantenute per assicurare risultati validi?', 'conformity', '7.1.5', 2, 1);
        PRINT '✓ Domanda 7.1.5.2 inserita';
    END

    -- Domanda 7.1.5.3
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.5' AND display_order = 3 AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('Sono conservate informazioni documentate come evidenza dell''idoneità allo scopo delle risorse di monitoraggio e misurazione?', 'conformity', '7.1.5', 3, 1);
        PRINT '✓ Domanda 7.1.5.3 inserita';
    END
END

-- ============================================================================
-- DOMANDE SEZIONE 7.1.6 (Conoscenza organizzativa)
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.6' AND standard_id = 1)
BEGIN
    PRINT '⚠️ Sezione 7.1.6 mancante - skip domande';
END
ELSE
BEGIN
    -- Domanda 7.1.6.1
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.6' AND display_order = 1 AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('L''organizzazione ha determinato la conoscenza necessaria per il funzionamento dei processi e per conseguire la conformità?', 'conformity', '7.1.6', 1, 1);
        PRINT '✓ Domanda 7.1.6.1 inserita';
    END

    -- Domanda 7.1.6.2
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.6' AND display_order = 2 AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('Tale conoscenza è mantenuta e resa disponibile nella misura necessaria?', 'conformity', '7.1.6', 2, 1);
        PRINT '✓ Domanda 7.1.6.2 inserita';
    END
END

-- ============================================================================
-- DOMANDE SEZIONE 7.2 (Competenza)
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.2' AND standard_id = 1)
BEGIN
    PRINT '⚠️ Sezione 7.2 mancante - skip domande';
END
ELSE
BEGIN
    -- Verifica se domande già esistono (potrebbero essere state inserite manualmente)
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.2' AND standard_id = 1)
    BEGIN
        -- Nessuna domanda 7.2 esistente, ne inseriamo almeno una generica
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('L''organizzazione ha determinato la competenza necessaria delle persone che svolgono attività che influenzano le prestazioni del SGQ e assicura che tali persone siano competenti sulla base di appropriati istruzione, formazione o esperienza?', 'conformity', '7.2', 1, 1);
        PRINT '✓ Domanda 7.2.1 inserita';
    END
    ELSE
    BEGIN
        PRINT '✓ Domande sezione 7.2 già presenti - skip';
    END
END

-- ============================================================================
-- VERIFICA FINALE
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'VERIFICA FINALE';
PRINT '============================================================================';

DECLARE @finalCount INT, @inserted INT;
SELECT @finalCount = COUNT(*) FROM checklist_questions WHERE standard_id = 1;
SET @inserted = @finalCount - @currentCount;

PRINT 'Domande iniziali: ' + CAST(@currentCount AS VARCHAR(10));
PRINT 'Domande finali: ' + CAST(@finalCount AS VARCHAR(10));
PRINT 'Nuove domande inserite: ' + CAST(@inserted AS VARCHAR(10));
PRINT '';

IF @finalCount >= 77
BEGIN
    PRINT '✓ SUCCESSO: Checklist ISO 9001 completa (≥77 domande)';
END
ELSE
BEGIN
    PRINT '⚠️ INCOMPLETO: Mancano ancora ' + CAST(77 - @finalCount AS VARCHAR(10)) + ' domande';
    PRINT 'Verificare sezioni mancanti con:';
    PRINT 'SELECT DISTINCT section_code FROM checklist_sections WHERE standard_id = 1 AND section_code NOT IN (SELECT DISTINCT section_code FROM checklist_questions WHERE standard_id = 1);';
END

PRINT '============================================================================';

GO
