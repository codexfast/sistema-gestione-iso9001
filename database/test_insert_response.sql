-- Test inserimento risposta audit per debug

USE SGQ_ISO9001;
GO

-- Test INSERT manuale
BEGIN TRY
    INSERT INTO audit_responses (
        audit_id,
        question_id,
        conformity_status,
        notes,
        evidence,
        is_answered,
        answered_at,
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        1003,              -- audit_id esistente
        3,                 -- question_id esistente (sezione 4.1)
        'C',               -- conformity_status
        'Test risposta conforme',  -- notes
        'Documento X rev. 2',      -- evidence
        1,                 -- is_answered
        GETDATE(),         -- answered_at
        1,                 -- created_by (user admin)
        GETDATE(),         -- created_at
        GETDATE()          -- updated_at
    );
    
    PRINT '✓ Risposta inserita con successo';
    
    -- Mostra risultato
    SELECT TOP 1 * FROM audit_responses WHERE audit_id = 1003 ORDER BY created_at DESC;
    
END TRY
BEGIN CATCH
    PRINT '✗ ERRORE:';
    PRINT 'Messaggio: ' + ERROR_MESSAGE();
    PRINT 'Numero: ' + CAST(ERROR_NUMBER() AS VARCHAR);
    PRINT 'Riga: ' + CAST(ERROR_LINE() AS VARCHAR);
END CATCH
