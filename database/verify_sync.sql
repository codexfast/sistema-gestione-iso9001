-- ============================================================================
-- VERIFICA SINCRONIZZAZIONE AUDIT E RISPOSTE
-- ============================================================================
-- Query per verificare se i dati compilati nel frontend
-- sono stati correttamente salvati nel database
-- ============================================================================

USE SGQ_ISO9001;
GO

PRINT '============================================================================';
PRINT 'VERIFICA SINCRONIZZAZIONE DATI AUDIT';
PRINT '============================================================================';
PRINT '';

-- ============================================================================
-- 1. LISTA AUDIT DISPONIBILI
-- ============================================================================

PRINT '--- 1. AUDIT PRESENTI NEL DATABASE ---';
PRINT '';

SELECT 
    audit_id,
    audit_number,
    client_name,
    audit_date,
    auditor_name,
    status,
    answered_questions,
    total_questions,
    completion_percentage,
    created_at,
    updated_at
FROM audits
WHERE is_deleted = 0
ORDER BY created_at DESC;

PRINT '';

-- ============================================================================
-- 2. RISPOSTE PER OGNI AUDIT (ultima sincronizzazione)
-- ============================================================================

PRINT '--- 2. CONTEGGIO RISPOSTE PER AUDIT ---';
PRINT '';

SELECT 
    a.audit_id,
    a.audit_number,
    a.client_name,
    COUNT(ar.response_id) as risposte_salvate,
    COUNT(CASE WHEN ar.is_answered = 1 THEN 1 END) as risposte_completate,
    MAX(ar.answered_at) as ultima_risposta
FROM audits a
LEFT JOIN audit_responses ar ON a.audit_id = ar.audit_id
WHERE a.is_deleted = 0
GROUP BY a.audit_id, a.audit_number, a.client_name
ORDER BY a.audit_id DESC;

PRINT '';

-- ============================================================================
-- 3. DETTAGLIO RISPOSTE ULTIMO AUDIT
-- ============================================================================

PRINT '--- 3. DETTAGLIO RISPOSTE ULTIMO AUDIT ---';
PRINT '';

DECLARE @lastAuditId INT;
SELECT TOP 1 @lastAuditId = audit_id FROM audits WHERE is_deleted = 0 ORDER BY created_at DESC;

IF @lastAuditId IS NOT NULL
BEGIN
    PRINT 'Audit ID: ' + CAST(@lastAuditId AS VARCHAR(10));
    PRINT '';
    
    SELECT 
        ar.response_id,
        cs.section_code,
        cs.section_title,
        LEFT(cq.question_text, 80) + '...' as domanda,
        ar.conformity_status,
        ar.response_notes,
        ar.is_answered,
        ar.answered_at,
        u.full_name as answered_by_user
    FROM audit_responses ar
    INNER JOIN checklist_questions cq ON ar.question_id = cq.question_id
    INNER JOIN checklist_sections cs ON cq.section_code = cs.section_code AND cq.standard_id = cs.standard_id
    LEFT JOIN users u ON ar.answered_by = u.user_id
    WHERE ar.audit_id = @lastAuditId
    ORDER BY cs.section_code, cq.display_order;
    
    PRINT '';
    PRINT 'Totale risposte per questo audit: ';
    SELECT COUNT(*) as total FROM audit_responses WHERE audit_id = @lastAuditId;
END
ELSE
BEGIN
    PRINT '⚠️ Nessun audit trovato nel database';
END

PRINT '';

-- ============================================================================
-- 4. VERIFICA TIMESTAMP SINCRONIZZAZIONE
-- ============================================================================

PRINT '--- 4. TIMESTAMP ULTIMA MODIFICA (per audit) ---';
PRINT '';

SELECT 
    a.audit_id,
    a.audit_number,
    a.created_at as audit_creato,
    a.updated_at as audit_modificato,
    MAX(ar.answered_at) as ultima_risposta_salvata,
    DATEDIFF(MINUTE, MAX(ar.answered_at), GETDATE()) as minuti_fa
FROM audits a
LEFT JOIN audit_responses ar ON a.audit_id = ar.audit_id
WHERE a.is_deleted = 0
GROUP BY a.audit_id, a.audit_number, a.created_at, a.updated_at
ORDER BY a.updated_at DESC;

PRINT '';

-- ============================================================================
-- 5. VERIFICA RISPOSTE PER SEZIONE (ultimo audit)
-- ============================================================================

PRINT '--- 5. DISTRIBUZIONE RISPOSTE PER SEZIONE (ultimo audit) ---';
PRINT '';

IF @lastAuditId IS NOT NULL
BEGIN
    SELECT 
        cs.section_code,
        cs.section_title,
        COUNT(ar.response_id) as risposte_date,
        COUNT(CASE WHEN ar.conformity_status = 'C' THEN 1 END) as conformi,
        COUNT(CASE WHEN ar.conformity_status = 'NC' THEN 1 END) as non_conformi,
        COUNT(CASE WHEN ar.conformity_status = 'OBS' THEN 1 END) as osservazioni,
        COUNT(CASE WHEN ar.conformity_status = 'NA' THEN 1 END) as non_applicabili
    FROM checklist_sections cs
    INNER JOIN checklist_questions cq ON cs.section_code = cq.section_code AND cs.standard_id = cq.standard_id
    LEFT JOIN audit_responses ar ON cq.question_id = ar.question_id AND ar.audit_id = @lastAuditId
    WHERE cs.standard_id = 1 -- ISO 9001
    GROUP BY cs.section_code, cs.section_title
    HAVING COUNT(ar.response_id) > 0
    ORDER BY cs.section_code;
END

PRINT '';
PRINT '============================================================================';
PRINT 'VERIFICA COMPLETATA';
PRINT '============================================================================';
PRINT '';
PRINT 'COME INTERPRETARE I RISULTATI:';
PRINT '';
PRINT '1. Se "risposte_salvate" > 0 → il frontend ha sincronizzato al backend ✅';
PRINT '2. Se "ultima_risposta_salvata" è recente → sync funziona ✅';
PRINT '3. Se vedi sezioni con risposte (conformi/NC/OBS) → compilazione OK ✅';
PRINT '4. Se "risposte_salvate" = 0 → la compilazione non è stata sincronizzata ❌';
PRINT '';
PRINT '============================================================================';

GO
