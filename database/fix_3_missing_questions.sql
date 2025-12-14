-- ============================================================================
-- FIX 3 DOMANDE MANCANTI - Sezioni 7.1.2, 7.1.3, 7.1.4
-- ============================================================================
-- Inserisce le 3 domande mancanti dalle sezioni Risorse (Persone, Infrastrutture, Ambiente)
-- Queste erano nello script seed ma non sono state inserite
-- STATO: 75/77 (in realtà 75/78) → TARGET: 78/78
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'FIX 3 DOMANDE MANCANTI - Sezioni 7.1.2, 7.1.3, 7.1.4';
PRINT '============================================================================';
PRINT '';

-- Verifica stato iniziale
DECLARE @currentCount INT;
SELECT @currentCount = COUNT(*) FROM checklist_questions WHERE standard_id = 1;
PRINT 'Domande attuali ISO 9001: ' + CAST(@currentCount AS VARCHAR(10));
PRINT '';

-- ============================================================================
-- SEZIONE 7.1.2 (Persone)
-- ============================================================================

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.2' AND standard_id = 1)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.2' AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('L''organizzazione ha determinato e fornito le persone necessarie per l''efficace attuazione del SGQ e per il funzionamento dei processi?', 'conformity', '7.1.2', 1, 1);
        PRINT '✓ Domanda 7.1.2.1 inserita';
    END
    ELSE
    BEGIN
        PRINT '✓ Domanda 7.1.2 già presente - skip';
    END
END
ELSE
BEGIN
    PRINT '⚠️ Sezione 7.1.2 non esiste - impossibile inserire domanda';
END

-- ============================================================================
-- SEZIONE 7.1.3 (Infrastrutture)
-- ============================================================================

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.3' AND standard_id = 1)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.3' AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('L''organizzazione ha determinato, fornito e mantenuto le infrastrutture necessarie per il funzionamento dei processi?', 'conformity', '7.1.3', 1, 1);
        PRINT '✓ Domanda 7.1.3.1 inserita';
    END
    ELSE
    BEGIN
        PRINT '✓ Domanda 7.1.3 già presente - skip';
    END
END
ELSE
BEGIN
    PRINT '⚠️ Sezione 7.1.3 non esiste - impossibile inserire domanda';
END

-- ============================================================================
-- SEZIONE 7.1.4 (Ambiente per il funzionamento dei processi)
-- ============================================================================

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.1.4' AND standard_id = 1)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.1.4' AND standard_id = 1)
    BEGIN
        INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
        VALUES 
        ('L''organizzazione ha determinato, fornito e mantenuto l''ambiente necessario per il funzionamento dei processi e per conseguire la conformità di prodotti e servizi?', 'conformity', '7.1.4', 1, 1);
        PRINT '✓ Domanda 7.1.4.1 inserita';
    END
    ELSE
    BEGIN
        PRINT '✓ Domanda 7.1.4 già presente - skip';
    END
END
ELSE
BEGIN
    PRINT '⚠️ Sezione 7.1.4 non esiste - impossibile inserire domanda';
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

IF @finalCount >= 78
BEGIN
    PRINT '✅ SUCCESSO: Checklist ISO 9001 COMPLETA (78/78 domande)';
    PRINT '';
    PRINT 'Verifica sezioni 7.1.x:';
    SELECT 
        section_code,
        COUNT(*) as num_domande
    FROM checklist_questions
    WHERE section_code LIKE '7.1.%' AND standard_id = 1
    GROUP BY section_code
    ORDER BY section_code;
END
ELSE
BEGIN
    PRINT '⚠️ Stato: ' + CAST(@finalCount AS VARCHAR(10)) + '/78 domande (atteso seed: 77, ma DB mostra 78 necessarie)';
END

PRINT '';
PRINT '============================================================================';

GO
