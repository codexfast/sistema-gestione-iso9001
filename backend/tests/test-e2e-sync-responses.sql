-- ============================================
-- TEST E2E: Sync Risposte Checklist
-- Sistema Gestione ISO 9001 - QS Studio
-- ============================================
-- 
-- Scopo: Verifica flusso completo salvataggio risposte
-- da frontend (IndexedDB) → backend API → SQL Server
--
-- Esegui PRIMA del test frontend, poi RE-esegui DOPO
-- per verificare che i dati siano arrivati nel DB.
--
-- ============================================

USE SGQ_ISO9001;
GO

-- ============================================
-- STEP 1: Verifica Tabelle Esistenti
-- ============================================

PRINT '📋 STEP 1: Verifica struttura tabelle';
PRINT '';

-- Verifica response_options (deve avere 6 righe)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'response_options')
BEGIN
    PRINT '❌ ERRORE: Tabella response_options non esiste!';
    PRINT '   → Esegui Migration 006 prima di continuare';
END
ELSE
BEGIN
    DECLARE @optionCount INT;
    SELECT @optionCount = COUNT(*) FROM dbo.response_options WHERE is_active = 1;
    
    IF @optionCount = 6
        PRINT '✅ response_options: 6 opzioni attive (C, OSS, NC, OM, NA, NV)';
    ELSE
        PRINT '⚠️  response_options: ' + CAST(@optionCount AS NVARCHAR(10)) + ' opzioni (atteso: 6)';
END;
PRINT '';

-- Verifica audit_responses
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_responses')
BEGIN
    PRINT '❌ ERRORE: Tabella audit_responses non esiste!';
END
ELSE
BEGIN
    PRINT '✅ Tabella audit_responses esiste';
END;
PRINT '';

-- ============================================
-- STEP 2: Stato Audit Test (1010 - Raccorderia)
-- ============================================

PRINT '📋 STEP 2: Audit 1010 (Raccorderia Piacentina)';
PRINT '';

DECLARE @auditId INT = 1010;

IF NOT EXISTS (SELECT 1 FROM dbo.audits WHERE audit_id = @auditId)
BEGIN
    PRINT '❌ ERRORE: Audit 1010 non trovato nel database!';
    PRINT '   → Verifica che l''audit sia stato creato';
END
ELSE
BEGIN
    SELECT 
        audit_id,
        audit_number,
        client_name,
        audit_date,
        status,
        answered_questions,
        total_questions,
        completion_percentage,
        conformities_count,
        non_conformities_count,
        updated_at
    FROM dbo.audits
    WHERE audit_id = @auditId;
    
    PRINT '✅ Audit 1010 trovato';
END;
PRINT '';

-- ============================================
-- STEP 3: Risposte Salvate
-- ============================================

PRINT '📋 STEP 3: Risposte checklist salvate per audit 1010';
PRINT '';

DECLARE @responsesCount INT;
SELECT @responsesCount = COUNT(*) FROM dbo.audit_responses WHERE audit_id = @auditId;

IF @responsesCount = 0
BEGIN
    PRINT '⚠️  ZERO risposte trovate nel database';
    PRINT '   → PROBLEMA: Frontend NON ha sincronizzato i dati';
    PRINT '';
    PRINT 'Possibili cause:';
    PRINT '   1. SyncService NON processato la coda';
    PRINT '   2. Frontend offline (navigator.onLine = false)';
    PRINT '   3. Errore nella chiamata POST /audits/1010/responses/bulk';
    PRINT '   4. updateCurrentAudit() NON chiamato quando checklist modificata';
    PRINT '';
    PRINT 'Azioni correttive:';
    PRINT '   1. Apri DevTools → Console → cerca "[SYNC]"';
    PRINT '   2. Apri DevTools → Network → filtra "responses/bulk"';
    PRINT '   3. Apri DevTools → Application → IndexedDB → syncQueue';
    PRINT '   4. Verifica browser log per errori JS';
END
ELSE
BEGIN
    PRINT '✅ Trovate ' + CAST(@responsesCount AS NVARCHAR(10)) + ' risposte salvate';
    PRINT '';
    
    -- Distribuzione per status
    PRINT 'Distribuzione conformità:';
    SELECT 
        conformity_status,
        COUNT(*) AS count,
        CAST(COUNT(*) * 100.0 / @responsesCount AS DECIMAL(5,2)) AS percentage
    FROM dbo.audit_responses
    WHERE audit_id = @auditId
    GROUP BY conformity_status
    ORDER BY 
        CASE conformity_status
            WHEN 'C' THEN 1
            WHEN 'OSS' THEN 2
            WHEN 'NC' THEN 3
            WHEN 'OM' THEN 4
            WHEN 'NA' THEN 5
            WHEN 'NV' THEN 6
        END;
    PRINT '';
    
    -- Ultime 10 risposte salvate
    PRINT 'Ultime 10 risposte salvate:';
    SELECT TOP 10
        ar.response_id,
        cq.section_code AS clause_ref,
        ar.conformity_status,
        LEFT(ar.notes, 50) AS notes_preview,
        ar.answered_at,
        ar.created_at,
        ar.updated_at
    FROM dbo.audit_responses ar
    INNER JOIN dbo.checklist_questions cq ON ar.question_id = cq.question_id
    WHERE ar.audit_id = @auditId
    ORDER BY ar.updated_at DESC;
END;
PRINT '';

-- ============================================
-- STEP 4: Verifica Integrità Referenziale
-- ============================================

PRINT '📋 STEP 4: Integrità referenziale';
PRINT '';

-- Risposte con question_id non valido
DECLARE @orphanedResponses INT;
SELECT @orphanedResponses = COUNT(*)
FROM dbo.audit_responses ar
LEFT JOIN dbo.checklist_questions cq ON ar.question_id = cq.question_id
WHERE ar.audit_id = @auditId AND cq.question_id IS NULL;

IF @orphanedResponses > 0
    PRINT '⚠️  ' + CAST(@orphanedResponses AS NVARCHAR(10)) + ' risposte con question_id non valido';
ELSE
    PRINT '✅ Tutte le risposte hanno question_id valido';

-- Risposte con conformity_status non valido
DECLARE @invalidStatus INT;
SELECT @invalidStatus = COUNT(*)
FROM dbo.audit_responses ar
LEFT JOIN dbo.response_options ro ON ar.conformity_status = ro.option_code
WHERE ar.audit_id = @auditId 
  AND ar.conformity_status IS NOT NULL
  AND ro.option_code IS NULL;

IF @invalidStatus > 0
    PRINT '⚠️  ' + CAST(@invalidStatus AS NVARCHAR(10)) + ' risposte con conformity_status non valido';
ELSE
    PRINT '✅ Tutti i conformity_status sono validi';

PRINT '';

-- ============================================
-- STEP 5: Verifica Statistiche Audit
-- ============================================

PRINT '📋 STEP 5: Statistiche audit aggiornate';
PRINT '';

-- Calcola atteso da audit_responses
DECLARE @expectedAnswered INT;
DECLARE @expectedConformities INT;
DECLARE @expectedNC INT;
DECLARE @expectedOSS INT;

SELECT 
    @expectedAnswered = COUNT(*),
    @expectedConformities = SUM(CASE WHEN conformity_status = 'C' THEN 1 ELSE 0 END),
    @expectedNC = SUM(CASE WHEN conformity_status = 'NC' THEN 1 ELSE 0 END),
    @expectedOSS = SUM(CASE WHEN conformity_status = 'OSS' THEN 1 ELSE 0 END)
FROM dbo.audit_responses
WHERE audit_id = @auditId AND is_answered = 1;

-- Confronta con audits.answered_questions
DECLARE @actualAnswered INT;
DECLARE @actualConformities INT;
DECLARE @actualNC INT;

SELECT 
    @actualAnswered = answered_questions,
    @actualConformities = conformities_count,
    @actualNC = non_conformities_count
FROM dbo.audits
WHERE audit_id = @auditId;

IF @expectedAnswered = @actualAnswered
    PRINT '✅ answered_questions aggiornato correttamente (' + CAST(@actualAnswered AS NVARCHAR(10)) + ')';
ELSE
    PRINT '⚠️  answered_questions NON aggiornato (atteso: ' + CAST(@expectedAnswered AS NVARCHAR(10)) + ', attuale: ' + CAST(@actualAnswered AS NVARCHAR(10)) + ')';

IF @expectedConformities = @actualConformities
    PRINT '✅ conformities_count aggiornato correttamente (' + CAST(@actualConformities AS NVARCHAR(10)) + ')';
ELSE
    PRINT '⚠️  conformities_count NON aggiornato (atteso: ' + CAST(@expectedConformities AS NVARCHAR(10)) + ', attuale: ' + CAST(@actualConformities AS NVARCHAR(10)) + ')';

IF @expectedNC = @actualNC
    PRINT '✅ non_conformities_count aggiornato correttamente (' + CAST(@actualNC AS NVARCHAR(10)) + ')';
ELSE
    PRINT '⚠️  non_conformities_count NON aggiornato (atteso: ' + CAST(@expectedNC AS NVARCHAR(10)) + ', attuale: ' + CAST(@actualNC AS NVARCHAR(10)) + ')';

IF @expectedOSS > 0
    PRINT 'ℹ️  Osservazioni (OSS): ' + CAST(@expectedOSS AS NVARCHAR(10)) + ' trovate nelle risposte';

PRINT '';

-- ============================================
-- STEP 6: Azioni Suggerite
-- ============================================

PRINT '📋 STEP 6: Azioni suggerite';
PRINT '';

IF @responsesCount = 0
BEGIN
    PRINT 'NEXT STEPS:';
    PRINT '1. Apri frontend: https://systemgest.netlify.app';
    PRINT '2. Login admin';
    PRINT '3. Apri audit Raccorderia (1010)';
    PRINT '4. Modifica 5+ risposte checklist con status diversi (C, NC, OSS, OM)';
    PRINT '5. Attendi 30 secondi (auto-sync)';
    PRINT '6. Controlla Console browser → cerca log "[SYNC]"';
    PRINT '7. Re-esegui questo script SQL per verificare salvataggio';
END
ELSE IF @responsesCount < 20
BEGIN
    PRINT 'PARZIALE: Solo ' + CAST(@responsesCount AS NVARCHAR(10)) + ' risposte salvate';
    PRINT '→ Continua compilazione checklist (target: ~78 domande ISO 9001)';
END
ELSE IF @responsesCount >= 78
BEGIN
    PRINT '✅ SUCCESSO COMPLETO!';
    PRINT '   Tutte le 78 domande ISO 9001 hanno risposta salvata';
    PRINT '';
    PRINT 'Prossimo step:';
    PRINT '→ Test ISO 14001 / ISO 45001 (dopo import checklist)';
END
ELSE
BEGIN
    PRINT 'IN PROGRESS: ' + CAST(@responsesCount AS NVARCHAR(10)) + ' risposte salvate';
    PRINT '→ Continua compilazione checklist';
END;

PRINT '';
PRINT '============================================';
PRINT 'Test completato: ' + CONVERT(NVARCHAR(30), GETDATE(), 120);
PRINT '============================================';
GO
