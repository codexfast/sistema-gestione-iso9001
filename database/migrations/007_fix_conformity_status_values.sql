-- ============================================
-- Migration 007: Fix Conformity Status Values
-- Data: 2026-01-10
-- Autore: System Architect
-- 
-- Problema: audit_responses contiene status in formato lungo
-- invece dei codici brevi definiti in response_options
--
-- Mapping richiesto:
--   compliant → C
--   non_compliant → NC
--   observation → OSS
--   opportunity → OM
--   not_applicable → NA
--   not_verified → NV
--
-- Riferimento: ISO 9001:2015 punto 7.5.3 (Integrità dati)
-- ============================================

USE SGQ_ISO9001;
GO

PRINT '🔧 Migration 007: Fix Conformity Status Values';
PRINT '================================================';

-- ============================================
-- STEP 1: Verifica Dati Corrotti
-- ============================================

PRINT '1️⃣ Verifica dati corrotti...';
PRINT '';

DECLARE @corruptedCount INT;

SELECT @corruptedCount = COUNT(*)
FROM dbo.audit_responses
WHERE conformity_status NOT IN ('C', 'OSS', 'NC', 'OM', 'NA', 'NV')
  AND conformity_status IS NOT NULL
  AND conformity_status != 'NOT_ANSWERED';

IF @corruptedCount > 0
BEGIN
    PRINT '⚠️  Trovate ' + CAST(@corruptedCount AS NVARCHAR(10)) + ' risposte con status non valido';
    PRINT '';
    
    -- Mostra distribuzione valori errati
    PRINT 'Valori errati trovati:';
    SELECT 
        conformity_status,
        COUNT(*) AS count
    FROM dbo.audit_responses
    WHERE conformity_status NOT IN ('C', 'OSS', 'NC', 'OM', 'NA', 'NV')
      AND conformity_status IS NOT NULL
      AND conformity_status != 'NOT_ANSWERED'
    GROUP BY conformity_status
    ORDER BY COUNT(*) DESC;
    PRINT '';
END
ELSE
BEGIN
    PRINT '✅ Nessun dato corrotto trovato';
    PRINT '   Migration non necessaria, skip.';
    RETURN;
END;

-- ============================================
-- STEP 2: Backup Dati Prima della Modifica
-- ============================================

PRINT '2️⃣ Backup dati corrotti...';

-- Crea tabella temporanea backup
IF OBJECT_ID('tempdb..#backup_responses') IS NOT NULL
    DROP TABLE #backup_responses;

SELECT 
    response_id,
    audit_id,
    question_id,
    conformity_status AS old_status,
    notes,
    updated_at
INTO #backup_responses
FROM dbo.audit_responses
WHERE conformity_status NOT IN ('C', 'OSS', 'NC', 'OM', 'NA', 'NV')
  AND conformity_status IS NOT NULL
  AND conformity_status != 'NOT_ANSWERED';

DECLARE @backupCount INT;
SELECT @backupCount = COUNT(*) FROM #backup_responses;

PRINT '✅ Backup ' + CAST(@backupCount AS NVARCHAR(10)) + ' record in #backup_responses';
PRINT '';

-- ============================================
-- STEP 3: Normalizza Valori
-- ============================================

PRINT '3️⃣ Normalizzazione valori conformity_status...';
PRINT '';

DECLARE @updated INT;

-- compliant → C
UPDATE dbo.audit_responses
SET conformity_status = 'C',
    updated_at = GETDATE()
WHERE conformity_status IN ('compliant', 'COMPLIANT', 'Conforme', 'conforme');

SET @updated = @@ROWCOUNT;
IF @updated > 0
    PRINT '   ✅ compliant → C: ' + CAST(@updated AS NVARCHAR(10)) + ' record';

-- non_compliant → NC
UPDATE dbo.audit_responses
SET conformity_status = 'NC',
    updated_at = GETDATE()
WHERE conformity_status IN ('non_compliant', 'NON_COMPLIANT', 'Non Conforme', 'non conforme', 'non-conforme');

SET @updated = @@ROWCOUNT;
IF @updated > 0
    PRINT '   ✅ non_compliant → NC: ' + CAST(@updated AS NVARCHAR(10)) + ' record';

-- observation → OSS
UPDATE dbo.audit_responses
SET conformity_status = 'OSS',
    updated_at = GETDATE()
WHERE conformity_status IN ('observation', 'OBSERVATION', 'Osservazione', 'osservazione', 'obs', 'OBS');

SET @updated = @@ROWCOUNT;
IF @updated > 0
    PRINT '   ✅ observation → OSS: ' + CAST(@updated AS NVARCHAR(10)) + ' record';

-- opportunity → OM
UPDATE dbo.audit_responses
SET conformity_status = 'OM',
    updated_at = GETDATE()
WHERE conformity_status IN ('opportunity', 'OPPORTUNITY', 'Opportunità', 'opportunita', 'opportunità di miglioramento');

SET @updated = @@ROWCOUNT;
IF @updated > 0
    PRINT '   ✅ opportunity → OM: ' + CAST(@updated AS NVARCHAR(10)) + ' record';

-- not_applicable → NA
UPDATE dbo.audit_responses
SET conformity_status = 'NA',
    updated_at = GETDATE()
WHERE conformity_status IN ('not_applicable', 'NOT_APPLICABLE', 'Non Applicabile', 'non applicabile', 'N/A', 'n/a');

SET @updated = @@ROWCOUNT;
IF @updated > 0
    PRINT '   ✅ not_applicable → NA: ' + CAST(@updated AS NVARCHAR(10)) + ' record';

-- not_verified → NV
UPDATE dbo.audit_responses
SET conformity_status = 'NV',
    updated_at = GETDATE()
WHERE conformity_status IN ('not_verified', 'NOT_VERIFIED', 'Non Verificato', 'non verificato');

SET @updated = @@ROWCOUNT;
IF @updated > 0
    PRINT '   ✅ not_verified → NV: ' + CAST(@updated AS NVARCHAR(10)) + ' record';

PRINT '';

-- ============================================
-- STEP 4: Verifica Risultato
-- ============================================

PRINT '4️⃣ Verifica normalizzazione...';
PRINT '';

-- Controlla se rimangono valori non validi
DECLARE @remainingCorrupted INT;

SELECT @remainingCorrupted = COUNT(*)
FROM dbo.audit_responses
WHERE conformity_status NOT IN ('C', 'OSS', 'NC', 'OM', 'NA', 'NV')
  AND conformity_status IS NOT NULL
  AND conformity_status != 'NOT_ANSWERED';

IF @remainingCorrupted > 0
BEGIN
    PRINT '⚠️  ATTENZIONE: ' + CAST(@remainingCorrupted AS NVARCHAR(10)) + ' record ancora non validi!';
    PRINT '';
    PRINT 'Valori non riconosciuti:';
    SELECT 
        conformity_status,
        COUNT(*) AS count
    FROM dbo.audit_responses
    WHERE conformity_status NOT IN ('C', 'OSS', 'NC', 'OM', 'NA', 'NV')
      AND conformity_status IS NOT NULL
      AND conformity_status != 'NOT_ANSWERED'
    GROUP BY conformity_status;
    PRINT '';
    PRINT '❌ Migration PARZIALMENTE RIUSCITA';
    PRINT '   → Correggi manualmente i valori sopra';
END
ELSE
BEGIN
    PRINT '✅ Tutti i valori conformity_status sono ora conformi a response_options';
    PRINT '';
    
    -- Distribuzione finale
    PRINT 'Distribuzione finale:';
    SELECT 
        ar.conformity_status,
        ro.option_name_it,
        COUNT(*) AS count
    FROM dbo.audit_responses ar
    INNER JOIN dbo.response_options ro ON ar.conformity_status = ro.option_code
    WHERE ar.conformity_status IS NOT NULL
    GROUP BY ar.conformity_status, ro.option_name_it, ro.display_order
    ORDER BY ro.display_order;
    PRINT '';
    
    PRINT '✅ Migration 007 COMPLETATA con successo';
END;

-- ============================================
-- STEP 5: Aggiorna Statistiche Audit
-- ============================================

PRINT '';
PRINT '5️⃣ Aggiornamento statistiche audit...';

-- Lista audit impattati
DECLARE @affectedAudits TABLE (audit_id INT);

INSERT INTO @affectedAudits (audit_id)
SELECT DISTINCT ar.audit_id
FROM #backup_responses br
INNER JOIN dbo.audit_responses ar ON br.response_id = ar.response_id;

DECLARE @auditCount INT;
SELECT @auditCount = COUNT(*) FROM @affectedAudits;

PRINT 'Audit impattati: ' + CAST(@auditCount AS NVARCHAR(10));
PRINT '';

-- Ricalcola statistiche per ogni audit
DECLARE @currentAuditId INT;
DECLARE @totalQuestions INT;
DECLARE @answeredQuestions INT;
DECLARE @conformitiesCount INT;
DECLARE @nonConformitiesCount INT;
DECLARE @completionPct DECIMAL(5,2);

DECLARE audit_cursor CURSOR FOR
SELECT audit_id FROM @affectedAudits;

OPEN audit_cursor;
FETCH NEXT FROM audit_cursor INTO @currentAuditId;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Conta risposte per audit
    SELECT 
        @totalQuestions = COUNT(DISTINCT ar.question_id),
        @answeredQuestions = SUM(CASE WHEN ar.is_answered = 1 THEN 1 ELSE 0 END),
        @conformitiesCount = SUM(CASE WHEN ar.conformity_status = 'C' THEN 1 ELSE 0 END),
        @nonConformitiesCount = SUM(CASE WHEN ar.conformity_status = 'NC' THEN 1 ELSE 0 END)
    FROM dbo.audit_responses ar
    WHERE ar.audit_id = @currentAuditId;
    
    -- Calcola percentuale completamento
    IF @totalQuestions > 0
        SET @completionPct = CAST(@answeredQuestions AS DECIMAL(10,2)) / @totalQuestions * 100;
    ELSE
        SET @completionPct = 0;
    
    -- Aggiorna audit
    UPDATE dbo.audits
    SET answered_questions = @answeredQuestions,
        conformities_count = @conformitiesCount,
        non_conformities_count = @nonConformitiesCount,
        completion_percentage = @completionPct,
        updated_at = GETDATE()
    WHERE audit_id = @currentAuditId;
    
    FETCH NEXT FROM audit_cursor INTO @currentAuditId;
END;

CLOSE audit_cursor;
DEALLOCATE audit_cursor;

PRINT '✅ Statistiche aggiornate per ' + CAST(@auditCount AS NVARCHAR(10)) + ' audit';
PRINT '';

-- ============================================
-- STEP 6: Summary
-- ============================================

PRINT '============================================';
PRINT 'Migration 007 Summary';
PRINT '============================================';
PRINT 'Data esecuzione: ' + CONVERT(NVARCHAR(30), GETDATE(), 120);
PRINT 'Record corretti: ' + CAST(@backupCount AS NVARCHAR(10));
PRINT 'Audit impattati: ' + CAST(@auditCount AS NVARCHAR(10));
PRINT 'Valori residui non validi: ' + CAST(@remainingCorrupted AS NVARCHAR(10));
PRINT '';

IF @remainingCorrupted = 0
    PRINT '✅ SUCCESSO: Tutti i dati normalizzati correttamente';
ELSE
    PRINT '⚠️  PARZIALE: Alcuni valori richiedono correzione manuale';

PRINT '============================================';
GO
