-- ============================================================================
-- FIX ULTIME 2 DOMANDE CHECKLIST ISO 9001
-- ============================================================================
-- Inserisce le ultime 2 domande mancanti per sezioni 7.3 e 7.4
-- STATO: 75/77 domande presenti
-- TARGET: 77/77 domande complete
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'FIX ULTIME 2 DOMANDE CHECKLIST ISO 9001';
PRINT '============================================================================';
PRINT '';

-- Verifica stato iniziale
DECLARE @currentCount INT;
SELECT @currentCount = COUNT(*) FROM checklist_questions WHERE standard_id = 1;
PRINT 'Domande attuali ISO 9001: ' + CAST(@currentCount AS VARCHAR(10));
PRINT '';

-- Verifica quali sezioni non hanno domande
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
PRINT 'Inserimento domande mancanti...';
PRINT '';

-- ============================================================================
-- SEZIONE 7.3 (Consapevolezza)
-- ============================================================================

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.3' AND standard_id = 1)
AND NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.3' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
    VALUES 
    ('L''organizzazione assicura che le persone che svolgono attività sotto il controllo dell''organizzazione siano consapevoli della politica per la qualità, degli obiettivi per la qualità pertinenti, del loro contributo all''efficacia del SGQ e delle implicazioni del non essere conformi ai requisiti del SGQ?', 'conformity', '7.3', 1, 1);
    PRINT '✓ Domanda 7.3.1 inserita';
END
ELSE IF EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.3' AND standard_id = 1)
BEGIN
    PRINT '✓ Domande sezione 7.3 già presenti - skip';
END
ELSE
BEGIN
    PRINT '⚠️ Sezione 7.3 non esiste - impossibile inserire domanda';
END

-- ============================================================================
-- SEZIONE 7.4 (Comunicazione)
-- ============================================================================

IF EXISTS (SELECT 1 FROM checklist_sections WHERE section_code = '7.4' AND standard_id = 1)
AND NOT EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.4' AND standard_id = 1)
BEGIN
    INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
    VALUES 
    ('L''organizzazione ha determinato le comunicazioni interne ed esterne pertinenti al SGQ, compreso cosa comunicare, quando, a chi, come e chi comunica?', 'conformity', '7.4', 1, 1);
    PRINT '✓ Domanda 7.4.1 inserita';
END
ELSE IF EXISTS (SELECT 1 FROM checklist_questions WHERE section_code = '7.4' AND standard_id = 1)
BEGIN
    PRINT '✓ Domande sezione 7.4 già presenti - skip';
END
ELSE
BEGIN
    PRINT '⚠️ Sezione 7.4 non esiste - impossibile inserire domanda';
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
    PRINT '✅ SUCCESSO: Checklist ISO 9001 COMPLETA (77/77 domande)';
END
ELSE
BEGIN
    PRINT '⚠️ INCOMPLETO: Mancano ancora ' + CAST(77 - @finalCount AS VARCHAR(10)) + ' domande';
    PRINT '';
    PRINT 'Sezioni ancora senza domande:';
    SELECT cs.section_code, cs.section_title
    FROM checklist_sections cs
    WHERE cs.standard_id = 1
    AND NOT EXISTS (
        SELECT 1 FROM checklist_questions cq 
        WHERE cq.section_code = cs.section_code 
        AND cq.standard_id = 1
    )
    ORDER BY cs.section_code;
END

PRINT '';
PRINT '============================================================================';

GO
