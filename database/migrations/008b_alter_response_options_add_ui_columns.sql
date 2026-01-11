-- =============================================
-- Migration 008b: Aggiungi colonne UI a response_options
-- Data: 11 gennaio 2026
-- Scopo: Aggiungere color_hex e icon_class per rendering frontend
-- =============================================

USE SGQ_ISO9001;
GO

PRINT '🔧 Migration 008b: Aggiungi colonne UI a response_options';
PRINT '==========================================================';

-- Aggiungi color_hex se non esiste
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'response_options' AND COLUMN_NAME = 'color_hex'
)
BEGIN
    ALTER TABLE dbo.response_options
    ADD color_hex NVARCHAR(7) NULL;
    
    PRINT '✅ Colonna color_hex aggiunta';
END
ELSE
BEGIN
    PRINT 'ℹ️ Colonna color_hex già esistente';
END

-- Aggiungi icon_class se non esiste
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'response_options' AND COLUMN_NAME = 'icon_class'
)
BEGIN
    ALTER TABLE dbo.response_options
    ADD icon_class NVARCHAR(50) NULL;
    
    PRINT '✅ Colonna icon_class aggiunta';
END
ELSE
BEGIN
    PRINT 'ℹ️ Colonna icon_class già esistente';
END
GO

-- Popola valori color_hex e icon_class
PRINT '';
PRINT '📝 Popolamento valori UI...';

UPDATE dbo.response_options SET color_hex = '#28a745', icon_class = 'icon-check-circle' WHERE option_code = 'C';
UPDATE dbo.response_options SET color_hex = '#ffc107', icon_class = 'icon-alert-circle' WHERE option_code = 'OSS';
UPDATE dbo.response_options SET color_hex = '#dc3545', icon_class = 'icon-x-circle' WHERE option_code = 'NC';
UPDATE dbo.response_options SET color_hex = '#17a2b8', icon_class = 'icon-lightbulb' WHERE option_code = 'OM';
UPDATE dbo.response_options SET color_hex = '#6c757d', icon_class = 'icon-slash' WHERE option_code = 'NA';
UPDATE dbo.response_options SET color_hex = '#6c757d', icon_class = 'icon-help-circle' WHERE option_code = 'NV';

PRINT '✅ Valori UI popolati';
GO

-- Verifica finale
PRINT '';
PRINT '📊 VERIFICA CONFIGURAZIONE:';

SELECT 
    option_code AS [Codice],
    option_name_it AS [Nome],
    color_hex AS [Colore],
    icon_class AS [Icona]
FROM response_options
ORDER BY display_order;

PRINT '';
PRINT '✅ Migration 008b completata!';
GO
