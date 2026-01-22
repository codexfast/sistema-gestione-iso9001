-- =============================================
-- Migration 006: Tabella Master Opzioni Risposta
-- Data: 10 gennaio 2026
-- Scopo: Normalizzare le 6 opzioni di risposta checklist
-- Riferimento: ADR-003 Sezione 1.4
-- =============================================

USE SGQ_ISO9001;
GO

-- Verifica se tabella esiste già
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'response_options')
BEGIN
    PRINT '📦 Creazione tabella response_options...';
    
    CREATE TABLE dbo.response_options (
        option_id INT IDENTITY(1,1) PRIMARY KEY,
        option_code NVARCHAR(10) NOT NULL UNIQUE,
        option_name_it NVARCHAR(100) NOT NULL,
        option_name_en NVARCHAR(100) NOT NULL,
        option_description NVARCHAR(500) NULL,
        
        -- Livello gravità per ordinamento (0=NA/NV, 1=C, 2=OSS/OM, 3=NC)
        severity_level INT NOT NULL DEFAULT 0,
        
        -- Peso per calcolo conformità percentuale
        weight_percentage DECIMAL(5,2) NULL,
        
        -- Flag esclusione da calcolo (NA, NV non contano)
        exclude_from_calc BIT NOT NULL DEFAULT 0,
        
        -- Ordinamento UI
        display_order INT NOT NULL,
        
        -- Status
        is_active BIT NOT NULL DEFAULT 1,
        
        -- Audit trail
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    PRINT '✅ Tabella response_options creata';
END
ELSE
BEGIN
    PRINT '⚠️ Tabella response_options già esistente, skip creazione';
END
GO

-- Seed dati (6 opzioni)
IF NOT EXISTS (SELECT * FROM dbo.response_options WHERE option_code = 'C')
BEGIN
    PRINT '📝 Inserimento opzioni risposta...';
    
    INSERT INTO dbo.response_options (
        option_code, 
        option_name_it, 
        option_name_en,
        option_description,
        severity_level,
        weight_percentage,
        exclude_from_calc,
        display_order
    )
    VALUES
    -- Conforme (Soddisfatto)
    (
        'C',
        'Conforme (Soddisfatto)',
        'Conforming (Satisfactory)',
        'Requisito pienamente soddisfatto senza osservazioni',
        1,      -- severity_level
        100.00, -- weight 100%
        0,      -- exclude_from_calc = NO
        1       -- display_order
    ),
    
    -- Osservazione (Parzialmente Soddisfatto)
    (
        'OSS',
        'Osservazione (Parzialmente Sodd.)',
        'Observation (Partially Satisfactory)',
        'Requisito soddisfatto con margini di miglioramento',
        2,      -- severity_level
        50.00,  -- weight 50%
        0,      -- exclude_from_calc = NO
        2       -- display_order
    ),
    
    -- Non Conformità (Non Soddisfatto)
    (
        'NC',
        'Non Conforme (Non Soddisfatto)',
        'Non-Conformity (Unsatisfactory)',
        'Requisito NON soddisfatto - richiede azione correttiva obbligatoria',
        3,      -- severity_level (massimo)
        0.00,   -- weight 0%
        0,      -- exclude_from_calc = NO
        3       -- display_order
    ),
    
    -- Opportunità di Miglioramento
    (
        'OM',
        'Opportunità di Miglioramento',
        'Opportunity for Improvement',
        'Requisito soddisfatto ma con potenziale di ottimizzazione',
        2,      -- severity_level
        75.00,  -- weight 75%
        0,      -- exclude_from_calc = NO
        4       -- display_order
    ),
    
    -- Non Applicabile
    (
        'NA',
        'Non Applicabile',
        'Not Applicable',
        'Requisito escluso dal campo di applicazione del SGQ',
        0,      -- severity_level
        NULL,   -- weight NULL (non conta)
        1,      -- exclude_from_calc = SÌ
        5       -- display_order
    ),
    
    -- Non Verificato
    (
        'NV',
        'Non Verificato',
        'Not Verified',
        'Requisito non ancora valutato durante l''audit',
        0,      -- severity_level
        NULL,   -- weight NULL (non conta)
        1,      -- exclude_from_calc = SÌ
        6       -- display_order
    );
    
    PRINT '✅ 6 opzioni risposta inserite';
END
ELSE
BEGIN
    PRINT '⚠️ Opzioni risposta già presenti, skip inserimento';
END
GO

-- Crea indice per performance lookup
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_response_options_code')
BEGIN
    CREATE NONCLUSTERED INDEX IX_response_options_code
    ON dbo.response_options(option_code)
    WHERE is_active = 1;
    
    PRINT '✅ Indice IX_response_options_code creato';
END
GO

-- Trigger per aggiornamento timestamp
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_response_options_updated')
BEGIN
    EXEC('
    CREATE TRIGGER trg_response_options_updated
    ON dbo.response_options
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        
        UPDATE dbo.response_options
        SET updated_at = GETDATE()
        FROM dbo.response_options ro
        INNER JOIN inserted i ON ro.option_id = i.option_id;
    END
    ');
    
    PRINT '✅ Trigger trg_response_options_updated creato';
END
GO

-- Verifica finale
PRINT '';
PRINT '====================================';
PRINT '   MIGRATION 006 COMPLETATA';
PRINT '====================================';
PRINT '';

SELECT 
    COUNT(*) AS total_options,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_options
FROM dbo.response_options;

PRINT '';
PRINT '📊 Opzioni disponibili:';
SELECT 
    option_code AS Codice,
    option_name_it AS [Nome IT],
    weight_percentage AS [Peso %],
    CASE WHEN exclude_from_calc = 1 THEN 'Sì' ELSE 'No' END AS [Escludi Calcolo],
    display_order AS Ordine
FROM dbo.response_options
WHERE is_active = 1
ORDER BY display_order;

PRINT '';
PRINT '✅ Migration 006 SUCCESS';
PRINT 'Prossimo step: Verifica in SSMS con query SELECT';
GO
