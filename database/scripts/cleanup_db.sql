-- =============================================================================
-- Script: cleanup_db.sql
-- Scopo: Hard delete di uno o più audit (e dati collegati) per audit_number
-- Uso:
--   - Modifica la tabella @AuditNumbers con i numeri da eliminare
--   - Esegui in SSMS sul DB SGQ_ISO9001
-- =============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

BEGIN TRY

    PRINT '====================================================================';
    PRINT 'PULIZIA AUDIT PER NUMERO';
    PRINT '====================================================================';

    -------------------------------------------------------------------------
    -- 1. Configurazione: numeri audit da eliminare
    -------------------------------------------------------------------------
    DECLARE @AuditNumbers TABLE (audit_number NVARCHAR(50));
    INSERT INTO @AuditNumbers (audit_number)
    VALUES
        ('2026-06'),
        ('2026-07');
        -- Aggiungi qui altri numeri se necessario

    -------------------------------------------------------------------------
    -- 2. Risoluzione audit_id
    -------------------------------------------------------------------------
    DECLARE @AuditIds TABLE (audit_id INT, audit_number NVARCHAR(50));

    INSERT INTO @AuditIds (audit_id, audit_number)
    SELECT a.audit_id, a.audit_number
    FROM audits a
    INNER JOIN @AuditNumbers n ON a.audit_number = n.audit_number;

    PRINT 'Audit individuati:';
    SELECT * FROM @AuditIds;

    -------------------------------------------------------------------------
    -- 3. Eliminazione dati collegati (ordine importante)
    -------------------------------------------------------------------------

    -- Allegati
    PRINT 'STEP A: DELETE attachments...';
    DELETE FROM attachments
    WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' attachments eliminati';

    -- Risposte checklist standard
    PRINT 'STEP B: DELETE audit_responses...';
    DELETE FROM audit_responses
    WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' audit_responses eliminati';

    -- Risposte checklist personalizzate
    PRINT 'STEP C: DELETE audit_custom_checklist_responses...';
    DELETE FROM audit_custom_checklist_responses
    WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' audit_custom_checklist_responses eliminati';

    -- Rilievi pendenti
    PRINT 'STEP D: DELETE pending_issues...';
    DELETE FROM pending_issues
    WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' pending_issues eliminati';

    -- Non conformità
    PRINT 'STEP E: DELETE non_conformities...';
    DELETE FROM non_conformities
    WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' non_conformities eliminati';

    -- Relazioni standard
    PRINT 'STEP F: DELETE audit_standards...';
    DELETE FROM audit_standards
    WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' audit_standards eliminati';

    -- Eventuale audit_history
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_history')
    BEGIN
        PRINT 'STEP G: DELETE audit_history...';
        DELETE FROM audit_history
        WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
        PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' audit_history eliminati';
    END

    -------------------------------------------------------------------------
    -- 4. Eliminazione audit
    -------------------------------------------------------------------------
    PRINT 'STEP H: DELETE audits...';
    DELETE FROM audits
    WHERE audit_id IN (SELECT audit_id FROM @AuditIds);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' audits eliminati';

    -------------------------------------------------------------------------
    -- 5. Verifica finale
    -------------------------------------------------------------------------
    PRINT '--- Verifica finale audit ---';
    SELECT audit_id, audit_number, client_name, status, is_deleted
    FROM audits
    WHERE audit_number IN (SELECT audit_number FROM @AuditNumbers);

    COMMIT TRANSACTION;
    PRINT '====================================================================';
    PRINT 'PULIZIA COMPLETATA';
    PRINT '====================================================================';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT 'ERRORE: ' + @msg;
    RAISERROR(@msg, 16, 1);
END CATCH;
GO
