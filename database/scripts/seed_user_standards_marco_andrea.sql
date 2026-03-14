-- =============================================================================
-- Seed: Assegnazione standard a Marco Camellini e Andrea Mason
-- Eseguire DOPO Migration 022 (user_standards).
--
-- Marco Camellini (marcocamellini@gmail.com): ISO 9001, 14001, 45001 (standard_id 1,2,3)
-- Andrea Mason (andrea.mason@mason-cs.com): ISO 3834-2 (standard_id 6)
-- =============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

DECLARE @marco_user_id INT, @andrea_user_id INT;

SELECT @marco_user_id = user_id FROM users WHERE email = 'marcocamellini@gmail.com';
SELECT @andrea_user_id = user_id FROM users WHERE email = 'andrea.mason@mason-cs.com';

-- Marco: 9001, 14001, 45001 (solo se non già presenti)
IF @marco_user_id IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_standards WHERE user_id = @marco_user_id AND standard_id = 1)
        INSERT INTO user_standards (user_id, standard_id) VALUES (@marco_user_id, 1);
    IF NOT EXISTS (SELECT 1 FROM user_standards WHERE user_id = @marco_user_id AND standard_id = 2)
        INSERT INTO user_standards (user_id, standard_id) VALUES (@marco_user_id, 2);
    IF NOT EXISTS (SELECT 1 FROM user_standards WHERE user_id = @marco_user_id AND standard_id = 3)
        INSERT INTO user_standards (user_id, standard_id) VALUES (@marco_user_id, 3);
    PRINT '  ✅ Standard 1,2,3 assegnati a Marco Camellini (user_id=' + CAST(@marco_user_id AS NVARCHAR) + ')';
END
ELSE
    PRINT '  ⚠️  Utente marcocamellini@gmail.com non trovato. Eseguire seed dopo creazione.';

-- Andrea: 3834-2 (standard_id 6)
IF @andrea_user_id IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_standards WHERE user_id = @andrea_user_id AND standard_id = 6)
        INSERT INTO user_standards (user_id, standard_id) VALUES (@andrea_user_id, 6);
    PRINT '  ✅ Standard 6 (ISO 3834-2) assegnato a Andrea Mason (user_id=' + CAST(@andrea_user_id AS NVARCHAR) + ')';
END
ELSE
    PRINT '  ⚠️  Utente andrea.mason@mason-cs.com non trovato. Eseguire seed dopo creazione.';

PRINT '';
PRINT 'Fine seed user_standards.';
