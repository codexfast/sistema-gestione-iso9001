-- ============================================================================
-- VERIFICA DOMANDE PER STANDARD
-- ============================================================================
-- Conta quante domande sono presenti per ogni standard nel database
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'CONTEGGIO DOMANDE PER STANDARD';
PRINT '============================================================================';
PRINT '';

-- Verifica esistenza colonna standard_id in checklist_questions
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('checklist_questions') AND name = 'standard_id')
BEGIN
    -- Conteggio per standard
    SELECT 
        s.standard_id,
        s.standard_name,
        s.standard_code,
        COUNT(cq.question_id) as num_domande
    FROM standards s
    LEFT JOIN checklist_questions cq ON s.standard_id = cq.standard_id
    GROUP BY s.standard_id, s.standard_name, s.standard_code
    ORDER BY s.standard_id;
    
    PRINT '';
    PRINT 'Dettaglio ISO 9001:2015:';
    
    -- Conteggio totale ISO 9001
    DECLARE @iso9001_count INT;
    SELECT @iso9001_count = COUNT(*) 
    FROM checklist_questions 
    WHERE standard_id = 1;
    
    PRINT 'Totale domande ISO 9001:2015: ' + CAST(@iso9001_count AS VARCHAR(10));
END
ELSE
BEGIN
    PRINT '⚠️ Colonna standard_id non trovata in checklist_questions';
    PRINT 'Conteggio tutte le domande:';
    
    SELECT COUNT(*) as totale_domande
    FROM checklist_questions;
END

PRINT '';
PRINT '============================================================================';

GO
