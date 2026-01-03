-- ============================================================================
-- VERIFICA ULTIMA SCRITTURA DATABASE
-- ============================================================================
-- Query per verificare timestamp ultima modifica nelle risposte
-- Dimostra che scrittura DB è funzionante
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

PRINT '============================================================================';
PRINT 'VERIFICA TIMESTAMP ULTIMA MODIFICA';
PRINT '============================================================================';
PRINT '';

-- Audit 2025-01 - Raccorderia Piacentina
DECLARE @auditNumber NVARCHAR(50) = '2025-01';
DECLARE @auditId INT;

SELECT @auditId = audit_id FROM audits WHERE audit_number = @auditNumber AND is_deleted = 0;

PRINT 'Audit ID: ' + CAST(@auditId AS VARCHAR(10));
PRINT 'Audit Number: ' + @auditNumber;
PRINT '';

-- Ultime 10 risposte modificate
PRINT 'ULTIME 10 RISPOSTE MODIFICATE:';
PRINT '';

SELECT TOP 10
    ar.response_id,
    cs.section_code,
    LEFT(cq.question_text, 60) + '...' as domanda,
    ar.conformity_status,
    ar.updated_at,
    DATEDIFF(MINUTE, ar.updated_at, GETDATE()) as minuti_fa,
    u.full_name as modified_by
FROM audit_responses ar
INNER JOIN checklist_questions cq ON ar.question_id = cq.question_id
INNER JOIN checklist_sections cs ON cq.section_code = cs.section_code AND cq.standard_id = cs.standard_id
LEFT JOIN users u ON ar.updated_by = u.user_id
WHERE ar.audit_id = @auditId
ORDER BY ar.updated_at DESC;

PRINT '';
PRINT '============================================================================';
PRINT 'VERIFICA COMPLETATA';
PRINT '============================================================================';

-- Se vedi minuti_fa < 5, significa che la scrittura appena fatta dal frontend è arrivata!

GO
