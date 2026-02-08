-- ============================================================================
-- Migration 010: Depreca audits.standard_id (transizione a audit_standards)
-- ============================================================================
-- Descrizione:
--   Depreca la colonna audits.standard_id in favore della tabella 
--   audit_standards (N:M). La colonna viene mantenuta per backward
--   compatibility ma marcata come deprecata.
--
-- Autore: Sistema Gestione ISO 9001 - QS Studio
-- Data: 8 Febbraio 2026
-- Versione: 1.0
--
-- Dipendenze:
--   - Migration 009 eseguita (audit_standards esistente)
--
-- Rollback:
--   -- Riabilita FK (se rimossa)
--   ALTER TABLE audits ADD CONSTRAINT FK_audits_standard 
--       FOREIGN KEY (standard_id) REFERENCES standards(standard_id);
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;
PRINT '';
PRINT '================================================================================';
PRINT 'Migration 010: Depreca audits.standard_id';
PRINT '================================================================================';
PRINT '';

-- ============================================================================
-- STEP 1: Verifica prerequisiti
-- ============================================================================

PRINT '🔍 STEP 1: Verifica prerequisiti...';

-- Verifica esistenza tabella audit_standards
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_standards')
BEGIN
    RAISERROR('❌ ERRORE: Tabella audit_standards non trovata. Esegui prima Migration 009.', 16, 1);
    RETURN;
END
PRINT '  ✅ Tabella audit_standards trovata';

-- Verifica esistenza colonna audits.standard_id
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('audits') 
    AND name = 'standard_id'
)
BEGIN
    PRINT '  ⚠️  Colonna audits.standard_id non trovata (già rimossa?)';
    PRINT '';
    PRINT '✅ Migration 010 già applicata. Nessuna azione necessaria.';
    RETURN;
END
PRINT '  ✅ Colonna audits.standard_id trovata';

PRINT '';

-- ============================================================================
-- STEP 2: Verifica consistenza dati
-- ============================================================================

PRINT '🔍 STEP 2: Verifica consistenza dati...';

-- Verifica: tutti gli audit con standard_id hanno record in audit_standards
DECLARE @missingInAuditStandards INT;
SELECT @missingInAuditStandards = COUNT(*)
FROM audits a
WHERE a.standard_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 
    FROM audit_standards ast 
    WHERE ast.audit_id = a.audit_id 
    AND ast.standard_id = a.standard_id
);

IF @missingInAuditStandards > 0
BEGIN
    PRINT '  ⚠️  WARNING: ' + CAST(@missingInAuditStandards AS NVARCHAR(10)) + 
          ' audit con standard_id non presente in audit_standards';
    PRINT '  🔧 Recupero dati mancanti...';
    
    -- Inserisci record mancanti
    INSERT INTO audit_standards (audit_id, standard_id, is_primary)
    SELECT 
        a.audit_id, 
        a.standard_id, 
        1  -- Assume primario
    FROM audits a
    WHERE a.standard_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM audit_standards ast 
        WHERE ast.audit_id = a.audit_id 
        AND ast.standard_id = a.standard_id
    );
    
    PRINT '  ✅ Recuperati ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' record';
END
ELSE
BEGIN
    PRINT '  ✅ Consistenza dati: OK (tutti gli audit migrati)';
END

PRINT '';

-- ============================================================================
-- STEP 3: Rimuovi FK constraint
-- ============================================================================

PRINT '🔧 STEP 3: Rimozione FK constraint...';

-- Trova il nome del constraint FK
DECLARE @constraintName NVARCHAR(255);

SELECT @constraintName = fk.name
FROM sys.foreign_keys fk
INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
WHERE t.name = 'audits'
AND fk.name LIKE '%standard%';

IF @constraintName IS NOT NULL
BEGIN
    DECLARE @sql NVARCHAR(MAX) = 'ALTER TABLE audits DROP CONSTRAINT [' + @constraintName + ']';
    EXEC sp_executesql @sql;
    PRINT '  ✅ FK constraint rimosso: ' + @constraintName;
END
ELSE
BEGIN
    PRINT '  ℹ️  Nessun FK constraint trovato (già rimosso)';
END

PRINT '';

-- ============================================================================
-- STEP 4: Marca colonna come deprecata
-- ============================================================================

PRINT '📝 STEP 4: Marcatura colonna come DEPRECATA...';

-- Rimuovi descrizione esistente (se presente)
IF EXISTS (
    SELECT 1 
    FROM sys.extended_properties 
    WHERE major_id = OBJECT_ID('audits') 
    AND name = 'MS_Description'
    AND minor_id = (
        SELECT column_id 
        FROM sys.columns 
        WHERE name = 'standard_id' 
        AND object_id = OBJECT_ID('audits')
    )
)
BEGIN
    EXEC sp_dropextendedproperty 
        @name = 'MS_Description',
        @level0type = 'SCHEMA', @level0name = 'dbo',
        @level1type = 'TABLE',  @level1name = 'audits',
        @level2type = 'COLUMN', @level2name = 'standard_id';
    PRINT '  ℹ️  Rimossa descrizione precedente';
END

-- Aggiungi descrizione deprecazione
EXEC sp_addextendedproperty 
    @name = 'MS_Description',
    @value = '⚠️ DEPRECATED (Migration 010): Usare audit_standards table invece (relazione N:M). Colonna mantenuta per backward compatibility. NON popolare in nuovi audit.',
    @level0type = 'SCHEMA', @level0name = 'dbo',
    @level1type = 'TABLE',  @level1name = 'audits',
    @level2type = 'COLUMN', @level2name = 'standard_id';

PRINT '  ✅ Colonna standard_id marcata come DEPRECATED';

PRINT '';

-- ============================================================================
-- STEP 5: Aggiorna viste esistenti (se presenti)
-- ============================================================================

PRINT '🔄 STEP 5: Aggiornamento viste...';

-- Verifica esistenza view vw_audit_dashboard
IF OBJECT_ID('vw_audit_dashboard', 'V') IS NOT NULL
BEGIN
    PRINT '  🔧 Aggiornamento vw_audit_dashboard...';
    
    -- Drop old view
    DROP VIEW vw_audit_dashboard;
    
    -- Ricrea view con audit_standards
    EXEC('
    CREATE VIEW vw_audit_dashboard AS
    SELECT 
        a.audit_id,
        a.audit_uuid,
        a.audit_number,
        a.client_name,
        a.audit_date,
        a.status,
        a.completion_percentage,
        a.answered_questions,
        a.total_questions,
        
        -- Standard primario
        (SELECT s.standard_code 
         FROM audit_standards ast
         INNER JOIN standards s ON ast.standard_id = s.standard_id
         WHERE ast.audit_id = a.audit_id AND ast.is_primary = 1
        ) AS primary_standard_code,
        
        -- Tutti gli standard (comma-separated)
        STUFF((
            SELECT '', '' + s.standard_code
            FROM audit_standards ast
            INNER JOIN standards s ON ast.standard_id = s.standard_id
            WHERE ast.audit_id = a.audit_id
            ORDER BY ast.is_primary DESC, s.standard_code
            FOR XML PATH('''')
        ), 1, 2, '''') AS all_standards,
        
        -- Conta standard
        (SELECT COUNT(*) 
         FROM audit_standards ast 
         WHERE ast.audit_id = a.audit_id
        ) AS standards_count,
        
        -- Utente creatore
        u.full_name AS created_by_name,
        u.email AS created_by_email,
        
        -- Timestamp
        a.created_at,
        a.updated_at
    FROM audits a
    LEFT JOIN users u ON a.created_by = u.user_id
    ');
    
    PRINT '  ✅ View vw_audit_dashboard aggiornata';
END
ELSE
BEGIN
    PRINT '  ℹ️  View vw_audit_dashboard non trovata (non presente o già aggiornata)';
END

PRINT '';

-- ============================================================================
-- STEP 6: Crea trigger per sincronizzazione (opzionale)
-- ============================================================================

PRINT '🔧 STEP 6: Creazione trigger sincronizzazione (opzionale)...';

-- Trigger per mantenere audits.standard_id sincronizzato con audit_standards
-- (per backward compatibility con codice legacy)
IF OBJECT_ID('tr_audit_standards_sync_to_audits', 'TR') IS NOT NULL
BEGIN
    DROP TRIGGER tr_audit_standards_sync_to_audits;
    PRINT '  ℹ️  Rimosso trigger esistente';
END

EXEC('
CREATE TRIGGER tr_audit_standards_sync_to_audits
ON audit_standards
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- UPDATE audits.standard_id con standard primario (per backward compatibility)
    UPDATE a
    SET 
        a.standard_id = (
            SELECT TOP 1 ast.standard_id
            FROM audit_standards ast
            WHERE ast.audit_id = a.audit_id
            AND ast.is_primary = 1
        )
    FROM audits a
    WHERE a.audit_id IN (
        SELECT audit_id FROM inserted
        UNION
        SELECT audit_id FROM deleted
    );
END
');

PRINT '  ✅ Trigger tr_audit_standards_sync_to_audits creato';
PRINT '  ℹ️  audits.standard_id sarà automaticamente sincronizzato con standard primario';

PRINT '';

-- ============================================================================
-- STEP 7: Statistiche finali
-- ============================================================================

PRINT '📊 STEP 7: Statistiche finali...';
PRINT '';

-- Conta audit
DECLARE @totalAudits INT;
SELECT @totalAudits = COUNT(*) FROM audits;
PRINT '  📋 Totale audit: ' + CAST(@totalAudits AS NVARCHAR(10));

-- Conta audit con standard in audit_standards
DECLARE @auditsWithStandards INT;
SELECT @auditsWithStandards = COUNT(DISTINCT audit_id) FROM audit_standards;
PRINT '  ✅ Audit con standard in audit_standards: ' + CAST(@auditsWithStandards AS NVARCHAR(10));

-- Conta audit ancora con solo standard_id
DECLARE @legacyAudits INT;
SELECT @legacyAudits = COUNT(*)
FROM audits a
WHERE a.standard_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM audit_standards ast WHERE ast.audit_id = a.audit_id
);
PRINT '  ⚠️  Audit legacy (solo standard_id, no audit_standards): ' + CAST(@legacyAudits AS NVARCHAR(10));

IF @legacyAudits > 0
BEGIN
    PRINT '';
    PRINT '  ⚠️  WARNING: Trovati audit non migrati!';
    PRINT '      Eseguire manualmente:';
    PRINT '      INSERT INTO audit_standards (audit_id, standard_id, is_primary)';
    PRINT '      SELECT audit_id, standard_id, 1';
    PRINT '      FROM audits WHERE standard_id IS NOT NULL';
    PRINT '      AND NOT EXISTS (SELECT 1 FROM audit_standards WHERE audit_id = audits.audit_id)';
END

-- Distribuzione multi-standard
DECLARE @multiStandardCount INT;
SELECT @multiStandardCount = COUNT(*)
FROM (
    SELECT audit_id
    FROM audit_standards
    GROUP BY audit_id
    HAVING COUNT(*) > 1
) AS multi;
PRINT '  🔗 Audit multi-standard: ' + CAST(@multiStandardCount AS NVARCHAR(10));

-- ============================================================================
-- COMPLETAMENTO
-- ============================================================================

PRINT '';
PRINT '================================================================================';
PRINT '✅ Migration 010 completata con successo!';
PRINT '================================================================================';
PRINT '';
PRINT '📌 COSA È CAMBIATO:';
PRINT '  - audits.standard_id: FK rimosso, colonna DEPRECATED';
PRINT '  - audit_standards: nuova fonte di verità per audit ↔ standard';
PRINT '  - Trigger sincronizzazione attivo (backward compatibility)';
PRINT '  - View vw_audit_dashboard aggiornata (se esistente)';
PRINT '';
PRINT '📌 PROSSIMI PASSI:';
PRINT '  1. Backend: aggiornare query per usare audit_standards';
PRINT '  2. Backend: endpoint GET /standards/:id/questions';
PRINT '  3. Frontend: UI multi-select standard';
PRINT '  4. Frontend: carica checklist dinamica da API';
PRINT '  5. Test E2E: audit multi-standard (ISO 9001 + ISO 14001)';
PRINT '';
PRINT '⚠️  NOTE IMPORTANTI:';
PRINT '  - La colonna audits.standard_id è MANTENUTA (non eliminata)';
PRINT '  - Trigger mantiene standard_id sincronizzato con standard primario';
PRINT '  - Codice legacy continuerà a funzionare (backward compatibility)';
PRINT '  - Nuovi audit devono popolare audit_standards (non standard_id)';
PRINT '';
PRINT '🔧 PER RIMUOVERE COMPLETAMENTE standard_id (futuro):';
PRINT '  - Verificare TUTTO il codice backend non usa più audits.standard_id';
PRINT '  - DROP TRIGGER tr_audit_standards_sync_to_audits;';
PRINT '  - ALTER TABLE audits DROP COLUMN standard_id;';
PRINT '';

GO
