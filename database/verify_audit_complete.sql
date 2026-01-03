-- ============================================================================
-- VERIFICA COMPLETEZZA AUDIT - Raccorderia Piacentina 2025-01
-- ============================================================================
-- Query diagnostica completa per verificare TUTTI i dati dell'audit:
-- 1. Dati generali audit
-- 2. Risposte checklist (78 domande ISO 9001)
-- 3. Note e osservazioni
-- 4. Allegati (immagini, documenti, audio)
-- 5. Non conformità (NC) se presenti
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

PRINT '============================================================================';
PRINT 'VERIFICA COMPLETEZZA AUDIT - 2025-01 Raccorderia Piacentina';
PRINT '============================================================================';
PRINT '';

-- ============================================================================
-- 1. DATI GENERALI AUDIT
-- ============================================================================

PRINT '--- 1. DATI GENERALI AUDIT ---';
PRINT '';

DECLARE @auditId INT;
DECLARE @auditNumber NVARCHAR(50) = '2025-01';

-- Trova ID audit
SELECT @auditId = audit_id 
FROM audits 
WHERE audit_number = @auditNumber AND is_deleted = 0;

IF @auditId IS NULL
BEGIN
    PRINT '❌ ERRORE: Audit ' + @auditNumber + ' non trovato nel database!';
    PRINT '============================================================================';
    RETURN;
END

-- Mostra dati audit
SELECT 
    audit_id,
    audit_number,
    client_name,
    audit_date,
    auditor_name,
    audit_type,
    status,
    total_questions,
    answered_questions,
    conformities_count,
    non_conformities_count,
    completion_percentage,
    created_at,
    updated_at,
    created_by
FROM audits
WHERE audit_id = @auditId AND is_deleted = 0;

PRINT '';
PRINT 'Audit ID identificato: ' + CAST(@auditId AS VARCHAR(10));
PRINT '';

-- ============================================================================
-- 2. RISPOSTE CHECKLIST (78 domande ISO 9001)
-- ============================================================================

PRINT '--- 2. RISPOSTE CHECKLIST ---';
PRINT '';

-- Conteggio risposte per stato
SELECT 
    'RIEPILOGO RISPOSTE' as Tipo,
    COUNT(*) as totale_risposte,
    COUNT(CASE WHEN is_answered = 1 THEN 1 END) as risposte_completate,
    COUNT(CASE WHEN conformity_status = 'C' THEN 1 END) as conformi,
    COUNT(CASE WHEN conformity_status = 'NC' THEN 1 END) as non_conformi,
    COUNT(CASE WHEN conformity_status = 'OBS' THEN 1 END) as osservazioni,
    COUNT(CASE WHEN conformity_status = 'NA' THEN 1 END) as non_applicabili,
    COUNT(CASE WHEN notes IS NOT NULL AND DATALENGTH(notes) > 0 THEN 1 END) as con_note
FROM audit_responses
WHERE audit_id = @auditId;

PRINT '';

-- Distribuzione per sezione
PRINT 'Distribuzione risposte per sezione ISO 9001:';
PRINT '';

SELECT 
    cs.section_code,
    cs.section_title,
    COUNT(ar.response_id) as risposte,
    COUNT(CASE WHEN ar.conformity_status = 'C' THEN 1 END) as C,
    COUNT(CASE WHEN ar.conformity_status = 'NC' THEN 1 END) as NC,
    COUNT(CASE WHEN ar.conformity_status = 'OBS' THEN 1 END) as OBS,
    COUNT(CASE WHEN ar.conformity_status = 'NA' THEN 1 END) as NA
FROM checklist_sections cs
INNER JOIN checklist_questions cq ON cs.section_code = cq.section_code AND cs.standard_id = cq.standard_id
LEFT JOIN audit_responses ar ON cq.question_id = ar.question_id AND ar.audit_id = @auditId
WHERE cs.standard_id = 1 -- ISO 9001
GROUP BY cs.section_code, cs.section_title
HAVING COUNT(ar.response_id) > 0
ORDER BY cs.section_code;

PRINT '';

-- ============================================================================
-- 3. DETTAGLIO RISPOSTE CON NOTE
-- ============================================================================

PRINT '--- 3. RISPOSTE CON NOTE/OSSERVAZIONI ---';
PRINT '';

DECLARE @countNotes INT;
SELECT @countNotes = COUNT(*) 
FROM audit_responses 
WHERE audit_id = @auditId 
AND notes IS NOT NULL 
AND DATALENGTH(notes) > 0;

IF @countNotes > 0
BEGIN
    PRINT 'Totale risposte con note: ' + CAST(@countNotes AS VARCHAR(10));
    PRINT '';
    
    SELECT TOP 10
        cs.section_code,
        LEFT(cq.question_text, 60) + '...' as domanda,
        ar.conformity_status as stato,
        LEFT(ar.notes, 100) + '...' as note,
        ar.answered_at,
        u.full_name as answered_by
    FROM audit_responses ar
    INNER JOIN checklist_questions cq ON ar.question_id = cq.question_id
    INNER JOIN checklist_sections cs ON cq.section_code = cs.section_code AND cq.standard_id = cs.standard_id
    LEFT JOIN users u ON ar.created_by = u.user_id
    WHERE ar.audit_id = @auditId
    AND ar.notes IS NOT NULL 
    AND DATALENGTH(ar.notes) > 0
    ORDER BY ar.answered_at DESC;
    
    IF @countNotes > 10
        PRINT CHAR(13) + CHAR(10) + '... e altre ' + CAST(@countNotes - 10 AS VARCHAR(10)) + ' risposte con note';
END
ELSE
BEGIN
    PRINT 'Nessuna risposta con note trovata.';
END

PRINT '';

-- ============================================================================
-- 4. ALLEGATI (Attachments)
-- ============================================================================

PRINT '--- 4. ALLEGATI ---';
PRINT '';

DECLARE @countAttachments INT;
SELECT @countAttachments = COUNT(*) 
FROM attachments 
WHERE audit_id = @auditId;

IF @countAttachments > 0
BEGIN
    PRINT 'Totale allegati: ' + CAST(@countAttachments AS VARCHAR(10));
    PRINT '';
    
    SELECT 
        attachment_id,
        file_name,
        file_type,
        file_size,
        category,
        description,
        created_at,
        uploaded_by
    FROM attachments
    WHERE audit_id = @auditId
    ORDER BY created_at DESC;
    
    -- Riepilogo per tipo
    PRINT '';
    PRINT 'Distribuzione allegati per categoria:';
    PRINT '';
    
    SELECT 
        category,
        COUNT(*) as numero_allegati,
        SUM(file_size) as dimensione_totale_bytes,
        CAST(SUM(file_size) / 1024.0 / 1024.0 AS DECIMAL(10,2)) as dimensione_MB
    FROM attachments
    WHERE audit_id = @auditId
    GROUP BY category
    ORDER BY numero_allegati DESC;
END
ELSE
BEGIN
    PRINT 'Nessun allegato trovato per questo audit.';
END

PRINT '';

-- ============================================================================
-- 5. NON CONFORMITÀ (NC)
-- ============================================================================

PRINT '--- 5. NON CONFORMITÀ (NC) ---';
PRINT '';

DECLARE @countNC INT;
SELECT @countNC = COUNT(*) 
FROM non_conformities 
WHERE audit_id = @auditId;

IF @countNC > 0
BEGIN
    PRINT 'Totale non conformità rilevate: ' + CAST(@countNC AS VARCHAR(10));
    PRINT '';
    
    SELECT 
        nc_id,
        nc_number,
        severity,
        section_code,
        LEFT(description, 100) + '...' as descrizione,
        responsible_person,
        due_date,
        status,
        created_at
    FROM non_conformities
    WHERE audit_id = @auditId
    ORDER BY severity, created_at;
    
    -- Riepilogo NC per tipo
    PRINT '';
    PRINT 'Distribuzione NC per tipo:';
    PRINT '';
    
    SELECT 
        severity,
        COUNT(*) as numero_nc,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as aperte,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as chiuse
    FROM non_conformities
    WHERE audit_id = @auditId
    GROUP BY severity
    ORDER BY severity;
END
ELSE
BEGIN
    PRINT 'Nessuna non conformità registrata.';
END

PRINT '';

-- ============================================================================
-- 6. VERIFICA INTEGRITÀ DATI
-- ============================================================================

PRINT '--- 6. VERIFICA INTEGRITÀ DATI ---';
PRINT '';

-- Verifica completezza rispetto alle 78 domande
DECLARE @expectedQuestions INT = 78;
DECLARE @actualResponses INT;
SELECT @actualResponses = COUNT(*) FROM audit_responses WHERE audit_id = @auditId;

PRINT 'Domande attese ISO 9001: ' + CAST(@expectedQuestions AS VARCHAR(10));
PRINT 'Risposte salvate nel DB: ' + CAST(@actualResponses AS VARCHAR(10));

IF @actualResponses = @expectedQuestions
    PRINT '✅ COMPLETO: Tutte le 78 domande hanno risposta nel database!';
ELSE IF @actualResponses > 0
    PRINT '⚠️ PARZIALE: Mancano ' + CAST(@expectedQuestions - @actualResponses AS VARCHAR(10)) + ' risposte';
ELSE
    PRINT '❌ VUOTO: Nessuna risposta salvata nel database!';

PRINT '';

-- Verifica timestamp coerenza
PRINT 'Verifica timestamp sincronizzazione:';
PRINT '';

SELECT 
    'Audit creato' as evento,
    created_at as timestamp,
    DATEDIFF(DAY, created_at, GETDATE()) as giorni_fa
FROM audits WHERE audit_id = @auditId

UNION ALL

SELECT 
    'Audit ultima modifica' as evento,
    updated_at as timestamp,
    DATEDIFF(DAY, updated_at, GETDATE()) as giorni_fa
FROM audits WHERE audit_id = @auditId

UNION ALL

SELECT 
    'Prima risposta' as evento,
    MIN(answered_at) as timestamp,
    DATEDIFF(DAY, MIN(answered_at), GETDATE()) as giorni_fa
FROM audit_responses WHERE audit_id = @auditId AND answered_at IS NOT NULL

UNION ALL

SELECT 
    'Ultima risposta' as evento,
    MAX(answered_at) as timestamp,
    DATEDIFF(DAY, MAX(answered_at), GETDATE()) as giorni_fa
FROM audit_responses WHERE audit_id = @auditId AND answered_at IS NOT NULL;

PRINT '';

-- ============================================================================
-- 7. RIEPILOGO FINALE
-- ============================================================================

PRINT '============================================================================';
PRINT 'RIEPILOGO FINALE - AUDIT ' + @auditNumber;
PRINT '============================================================================';
PRINT '';

DECLARE @summary NVARCHAR(MAX) = '';
SET @summary = @summary + 'Audit ID: ' + CAST(@auditId AS VARCHAR(10)) + CHAR(13) + CHAR(10);
SET @summary = @summary + 'Cliente: Raccorderia Piacentina' + CHAR(13) + CHAR(10);
SET @summary = @summary + 'Risposte: ' + CAST(@actualResponses AS VARCHAR(10)) + '/78' + CHAR(13) + CHAR(10);
SET @summary = @summary + 'Note: ' + CAST(@countNotes AS VARCHAR(10)) + CHAR(13) + CHAR(10);
SET @summary = @summary + 'Allegati: ' + CAST(@countAttachments AS VARCHAR(10)) + CHAR(13) + CHAR(10);
SET @summary = @summary + 'NC: ' + CAST(@countNC AS VARCHAR(10));

PRINT @summary;

PRINT '';
PRINT '============================================================================';
PRINT 'VERIFICA COMPLETATA';
PRINT '============================================================================';

GO
