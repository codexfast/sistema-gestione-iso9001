-- ============================================================================
-- FIX COMPLETO: Sezioni 7.1.2, 7.1.3, 7.1.4 + Relative Domande
-- ============================================================================
-- STEP 1: Inserisce le 3 sezioni mancanti
-- STEP 2: Inserisce le 3 domande corrispondenti
-- TARGET: 75 → 78 domande complete
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'FIX COMPLETO: Sezioni + Domande 7.1.2, 7.1.3, 7.1.4';
PRINT '============================================================================';
PRINT '';

-- Verifica stato iniziale
DECLARE @currentSections INT, @currentQuestions INT;
SELECT @currentSections = COUNT(*) FROM checklist_sections WHERE standard_id = 1;
SELECT @currentQuestions = COUNT(*) FROM checklist_questions WHERE standard_id = 1;

PRINT 'Sezioni attuali: ' + CAST(@currentSections AS VARCHAR(10));
PRINT 'Domande attuali: ' + CAST(@currentQuestions AS VARCHAR(10));
PRINT '';

-- ============================================================================
-- STEP 1: INSERIMENTO SEZIONI MANCANTI
-- ============================================================================

PRINT '--- STEP 1: Inserimento Sezioni ---';
PRINT '';

-- Sezione 7.1.2 (Persone)
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.2' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.1.2', 'Persone', '7.1', 2, 1, 1);
    PRINT '✓ Sezione 7.1.2 (Persone) inserita';
END
ELSE
BEGIN
    PRINT '✓ Sezione 7.1.2 già presente';
END

-- Sezione 7.1.3 (Infrastrutture)
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.3' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.1.3', 'Infrastrutture', '7.1', 3, 1, 1);
    PRINT '✓ Sezione 7.1.3 (Infrastrutture) inserita';
END
ELSE
BEGIN
    PRINT '✓ Sezione 7.1.3 già presente';
END

-- Sezione 7.1.4 (Ambiente per il funzionamento dei processi)
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.4' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
    VALUES ('7.1.4', 'Ambiente per il funzionamento dei processi', '7.1', 4, 1, 1);
    PRINT '✓ Sezione 7.1.4 (Ambiente processi) inserita';
END
ELSE
BEGIN
    PRINT '✓ Sezione 7.1.4 già presente';
END

PRINT '';

-- ============================================================================
-- STEP 2: INSERIMENTO DOMANDE
-- ============================================================================

PRINT '--- STEP 2: Inserimento Domande ---';
PRINT '';

-- Domanda 7.1.2
IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.2' AND standard_id = 1)
AND NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.2' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
    VALUES 
    ('L''organizzazione ha determinato e fornito le persone necessarie per l''efficace attuazione del SGQ e per il funzionamento dei processi?', 'conformity', '7.1.2', 1, 1);
    PRINT '✓ Domanda 7.1.2.1 inserita';
END
ELSE IF EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.2' AND standard_id = 1)
BEGIN
    PRINT '✓ Domanda 7.1.2 già presente';
END
ELSE
BEGIN
    PRINT '⚠️ Errore: sezione 7.1.2 non trovata dopo INSERT';
END

-- Domanda 7.1.3
IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.3' AND standard_id = 1)
AND NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.3' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
    VALUES 
    ('L''organizzazione ha determinato, fornito e mantenuto le infrastrutture necessarie per il funzionamento dei processi?', 'conformity', '7.1.3', 1, 1);
    PRINT '✓ Domanda 7.1.3.1 inserita';
END
ELSE IF EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.3' AND standard_id = 1)
BEGIN
    PRINT '✓ Domanda 7.1.3 già presente';
END
ELSE
BEGIN
    PRINT '⚠️ Errore: sezione 7.1.3 non trovata dopo INSERT';
END

-- Domanda 7.1.4
IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.4' AND standard_id = 1)
AND NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.4' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
    VALUES 
    ('L''organizzazione ha determinato, fornito e mantenuto l''ambiente necessario per il funzionamento dei processi e per conseguire la conformità di prodotti e servizi?', 'conformity', '7.1.4', 1, 1);
    PRINT '✓ Domanda 7.1.4.1 inserita';
END
ELSE IF EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.4' AND standard_id = 1)
BEGIN
    PRINT '✓ Domanda 7.1.4 già presente';
END
ELSE
BEGIN
    PRINT '⚠️ Errore: sezione 7.1.4 non trovata dopo INSERT';
END

-- ============================================================================
-- VERIFICA FINALE
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'VERIFICA FINALE';
PRINT '============================================================================';

DECLARE @finalSections INT, @finalQuestions INT;
SELECT @finalSections = COUNT(*) FROM checklist_sections WHERE standard_id = 1;
SELECT @finalQuestions = COUNT(*) FROM checklist_questions WHERE standard_id = 1;

PRINT 'Sezioni iniziali: ' + CAST(@currentSections AS VARCHAR(10));
PRINT 'Sezioni finali: ' + CAST(@finalSections AS VARCHAR(10));
PRINT 'Sezioni inserite: ' + CAST(@finalSections - @currentSections AS VARCHAR(10));
PRINT '';
PRINT 'Domande iniziali: ' + CAST(@currentQuestions AS VARCHAR(10));
PRINT 'Domande finali: ' + CAST(@finalQuestions AS VARCHAR(10));
PRINT 'Domande inserite: ' + CAST(@finalQuestions - @currentQuestions AS VARCHAR(10));
PRINT '';

IF @finalQuestions >= 78
BEGIN
    PRINT '✅ SUCCESSO: Checklist ISO 9001 COMPLETA (78/78 domande)';
    PRINT '';
    PRINT 'Verifica sezioni 7.1.x (tutte):';
    SELECT 
        cs.section_code,
        cs.section_title,
        COUNT(cq.question_id) as num_domande
    FROM checklist_sections cs
    LEFT JOIN checklist_questions cq ON cs.section_code = cq.section_code AND cs.standard_id = cq.standard_id
    WHERE cs.section_code LIKE '7.1%' AND cs.standard_id = 1
    GROUP BY cs.section_code, cs.section_title
    ORDER BY cs.section_code;
END
ELSE
BEGIN
    PRINT '⚠️ Stato attuale: ' + CAST(@finalQuestions AS VARCHAR(10)) + '/78 domande';
    PRINT 'Mancano ancora: ' + CAST(78 - @finalQuestions AS VARCHAR(10)) + ' domande';
END

PRINT '';
PRINT '============================================================================';

GO
