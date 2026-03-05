-- =============================================================================
-- Script: Pulizia DB - rimozione dati di test e correlazione audit ERAM
-- Data: 06/03/2026
-- Eseguire in SSMS su SGQ_ISO9001
-- =============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

BEGIN TRY

    PRINT '====================================================================';
    PRINT 'PULIZIA DB - inizio';
    PRINT '====================================================================';

    -- =====================================================================
    -- STEP 1: Elimina allegati (file fisici da rimuovere sul server a parte)
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 1: Elimina allegati di test (attachment_id 3 e 4)...';
    DELETE FROM attachments WHERE attachment_id IN (3, 4);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' allegati eliminati';

    -- =====================================================================
    -- STEP 2: Elimina risposte audit di test
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 2: Elimina risposte audit di test (3914, 4914)...';
    DELETE FROM audit_responses WHERE audit_id IN (3914, 4914);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' risposte eliminate';

    -- =====================================================================
    -- STEP 3: Elimina audit_standards di test
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 3: Elimina audit_standards di test...';
    DELETE FROM audit_standards WHERE audit_id IN (3914, 4914);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' record eliminati';

    -- =====================================================================
    -- STEP 4: Elimina audit di test (hard delete - erano solo bozze)
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 4: Elimina audit di test (3914, 4914)...';
    DELETE FROM audits WHERE audit_id IN (3914, 4914);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' audit eliminati';

    -- =====================================================================
    -- STEP 5: Elimina aziende di test
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 5: Elimina aziende di test (id 1, 2, 3, 5)...';
    DELETE FROM companies WHERE id IN (1, 2, 3, 5);
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' aziende eliminate';

    -- =====================================================================
    -- STEP 6: Elimina organizzazione di test
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 6: Elimina organizzazione di test (id 2)...';
    DELETE FROM organizations WHERE organization_id = 2;
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' organizzazioni eliminate';

    -- =====================================================================
    -- STEP 7: Elimina utente di test
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 7: Elimina utente di test (test@sgq.local)...';
    DELETE FROM users WHERE email = 'test@sgq.local';
    PRINT '  OK - ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' utenti eliminati';

    -- =====================================================================
    -- STEP 8: Crea azienda ERAM TECHNOLOGIES per studio Camellini (auditor_org_id=3)
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 8: Crea azienda ERAM TECHNOLOGIES per studio Camellini...';

    DECLARE @eram_id INT;

    INSERT INTO companies (auditor_org_id, name, is_active, updated_at)
    VALUES (3, N'ERAM TECHNOLOGIES', 1, GETDATE());

    SET @eram_id = SCOPE_IDENTITY();
    PRINT '  OK - ERAM TECHNOLOGIES creata con id ' + CAST(@eram_id AS NVARCHAR);

    -- =====================================================================
    -- STEP 9: Collega audit 4915 all'azienda ERAM TECHNOLOGIES
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 9: Collega audit 4915 (ERAM TECHNOLOGIES) all''azienda...';
    UPDATE audits
    SET company_id = @eram_id,
        updated_at = GETDATE()
    WHERE audit_id = 4915;
    PRINT '  OK - audit 4915 collegato a company_id ' + CAST(@eram_id AS NVARCHAR);

    -- =====================================================================
    -- STEP 10: Rinomina auditor_org 1 per chiarezza
    -- =====================================================================
    PRINT '';
    PRINT 'STEP 10: Rinomina auditor_org 1 in "QS Studio (Interno)"...';
    UPDATE auditor_orgs SET name = N'QS Studio (Interno)', updated_at = GETDATE() WHERE id = 1;
    PRINT '  OK';

    COMMIT TRANSACTION;

    PRINT '';
    PRINT '====================================================================';
    PRINT 'PULIZIA COMPLETATA CON SUCCESSO';
    PRINT '====================================================================';

    -- Verifica finale
    PRINT '';
    PRINT '--- Stato finale ---';
    SELECT 'organizations' AS tabella, COUNT(*) AS record FROM organizations
    UNION ALL SELECT 'users', COUNT(*) FROM users
    UNION ALL SELECT 'auditor_orgs', COUNT(*) FROM auditor_orgs
    UNION ALL SELECT 'companies', COUNT(*) FROM companies
    UNION ALL SELECT 'audits (attivi)', COUNT(*) FROM audits WHERE is_deleted=0
    UNION ALL SELECT 'audit_responses', COUNT(*) FROM audit_responses
    UNION ALL SELECT 'attachments', COUNT(*) FROM attachments;

    PRINT '';
    PRINT 'Audit conservato:';
    SELECT audit_id, audit_number, client_name, company_id, status FROM audits WHERE audit_id = 4915;

    PRINT '';
    PRINT 'Aziende attive:';
    SELECT id, name, auditor_org_id FROM companies WHERE is_active = 1;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT '';
    PRINT 'ERRORE: ' + @msg;
    RAISERROR(@msg, 16, 1);
END CATCH;

GO
