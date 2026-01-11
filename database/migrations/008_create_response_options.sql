-- =============================================
-- Migration 008: Creazione Tabella Master response_options
-- Data: 11 gennaio 2026
-- Scopo: Normalizzare le 6 opzioni di risposta checklist (aggiungi NV)
-- Riferimento: ADR-002 Project Structure
-- =============================================

USE SGQ_ISO9001;
GO

PRINT '🔧 Migration 008: Creazione tabella response_options';
PRINT '====================================================';

-- ============================================================================
-- STEP 1: Creazione tabella master response_options
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'response_options')
BEGIN
    PRINT '📦 Creazione tabella response_options...';
    
    CREATE TABLE dbo.response_options (
        option_id INT IDENTITY(1,1) PRIMARY KEY,
        option_code NVARCHAR(10) NOT NULL UNIQUE,  -- 'C', 'NC', 'OSS', 'OM', 'NA', 'NV'
        option_name_it NVARCHAR(100) NOT NULL,
        option_name_en NVARCHAR(100) NOT NULL,
        option_description NVARCHAR(500) NULL,
        
        -- Metriche calcolo
        severity_level INT NOT NULL DEFAULT 0,  -- 0=NA/NV, 1=C, 2=OSS/OM, 3=NC
        weight_percentage DECIMAL(5,2) NULL,    -- Peso nel calcolo completion (es: NA/NV = 0%, C=100%, OSS=50%)
        exclude_from_calc BIT NOT NULL DEFAULT 0,  -- TRUE per NA/NV (esclusi da conteggio)
        
        -- UI rendering
        display_order INT NOT NULL,
        icon_class NVARCHAR(50) NULL,  -- CSS class per icone UI
        color_hex NVARCHAR(7) NULL,    -- Colore badge (es: #28a745 per C)
        
        -- Gestione
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        INDEX idx_response_options_code (option_code),
        INDEX idx_response_options_active (is_active)
    );

    PRINT '✅ Tabella response_options creata';
END
ELSE
BEGIN
    PRINT '⚠️ Tabella response_options già esistente, skip creazione';
END
GO

-- ============================================================================
-- STEP 2: Seed dati - 6 opzioni standard
-- ============================================================================

IF NOT EXISTS (SELECT * FROM dbo.response_options WHERE option_code = 'C')
BEGIN
    PRINT '📝 Inserimento opzioni risposta...';
    
    INSERT INTO dbo.response_options (
        option_code, option_name_it, option_name_en, option_description,
        severity_level, weight_percentage, exclude_from_calc,
        display_order, icon_class, color_hex
    )
    VALUES
    (
        'C', 
        'Conforme (Soddisfatto)', 
        'Conforming (Satisfactory)',
        'Requisito completamente soddisfatto, nessuna azione richiesta',
        1,    -- severity
        100.00,  -- peso 100% (conteggio pieno)
        0,    -- includi nel calcolo
        1,    -- ordine UI
        'icon-check-circle',
        '#28a745'  -- verde
    ),
    (
        'OSS', 
        'Osservazione (Parzialmente Soddisfatto)', 
        'Observation (Partial Conformity)',
        'Requisito parzialmente soddisfatto, richiede attenzione/miglioramento',
        2,
        50.00,   -- peso 50% (conformità parziale)
        0,
        2,
        'icon-alert-circle',
        '#ffc107'  -- giallo
    ),
    (
        'NC', 
        'Non Conforme (Non Soddisfatto)', 
        'Non-Conformity (Unsatisfactory)',
        'Requisito non soddisfatto, richiede azione correttiva obbligatoria (punto 10.2 ISO 9001)',
        3,
        0.00,    -- peso 0% (non conforme)
        0,
        3,
        'icon-x-circle',
        '#dc3545'  -- rosso
    ),
    (
        'OM', 
        'Opportunità di Miglioramento', 
        'Opportunity for Improvement',
        'Suggerimento di miglioramento processo, non obbligatorio ma raccomandato',
        2,
        75.00,   -- peso 75% (conforme ma migliorabile)
        0,
        4,
        'icon-lightbulb',
        '#17a2b8'  -- azzurro
    ),
    (
        'NA', 
        'Non Applicabile', 
        'Not Applicable',
        'Requisito non pertinente per questa organizzazione/contesto (escluso da calcoli)',
        0,
        NULL,  -- escluso da calcolo
        1,     -- exclude_from_calc = TRUE
        5,
        'icon-slash',
        '#6c757d'  -- grigio
    ),
    (
        'NV', 
        'Non Verificato', 
        'Not Verified',
        'Requisito non ancora esaminato durante questo audit (da completare successivamente)',
        0,
        NULL,  -- escluso da calcolo
        1,     -- exclude_from_calc = TRUE
        6,
        'icon-help-circle',
        '#6c757d'  -- grigio
    );

    PRINT '✅ Seed completato: 6 opzioni inserite';
END
ELSE
BEGIN
    PRINT 'ℹ️ Opzioni già presenti, skip seed';
END
GO

-- ============================================================================
-- STEP 3: Aggiorna constraint su audit_responses (aggiungi NV)
-- ============================================================================

PRINT '';
PRINT '🔧 Aggiornamento constraint conformity_status...';

-- Rimuovi constraint esistente se presente
DECLARE @constraintName NVARCHAR(255);
SELECT @constraintName = cc.name
FROM sys.check_constraints cc
INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
WHERE t.name = 'audit_responses'
AND cc.definition LIKE '%conformity_status%';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE audit_responses DROP CONSTRAINT [' + @constraintName + ']');
    PRINT '✅ Constraint obsoleto rimosso: ' + @constraintName;
END
ELSE
BEGIN
    PRINT 'ℹ️ Nessun constraint esistente da rimuovere';
END

-- Aggiungi nuovo constraint con NV
IF NOT EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE name = 'CK_audit_responses_conformity_status_v2'
)
BEGIN
    ALTER TABLE audit_responses 
    ADD CONSTRAINT CK_audit_responses_conformity_status_v2 
        CHECK ([conformity_status] IN ('C', 'NC', 'OSS', 'OM', 'NA', 'NV', NULL));

    PRINT '✅ Constraint aggiornato: ora supporta C, NC, OSS, OM, NA, NV';
END
ELSE
BEGIN
    PRINT 'ℹ️ Constraint CK_audit_responses_conformity_status_v2 già esistente';
END
GO

-- ============================================================================
-- STEP 4: Verifica finale
-- ============================================================================

PRINT '';
PRINT '📊 VERIFICA CONFIGURAZIONE:';
PRINT '';

SELECT 
    option_code AS [Codice],
    option_name_it AS [Nome Italiano],
    severity_level AS [Severità],
    weight_percentage AS [Peso %],
    exclude_from_calc AS [Escludi Calc],
    display_order AS [Ordine],
    color_hex AS [Colore]
FROM response_options
ORDER BY display_order;

PRINT '';
PRINT '✅ Migration 008 completata!';
PRINT '';
PRINT '🚀 Prossimi passi:';
PRINT '   1. Backend: Creare GET /api/v1/response-options';
PRINT '   2. Frontend: Caricare opzioni da API invece di hardcoded';
PRINT '   3. UI: Aggiungere opzione NV in ChecklistModule.jsx';
PRINT '';
GO
