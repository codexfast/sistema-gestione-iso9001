-- =============================================================================
-- Script: Aggiorna password Marco Camellini
-- Password: Camellini2026!
-- Eseguire in SSMS su SGQ_ISO9001
-- =============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

-- 1. Verifica utente esiste
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'marcocamellini@gmail.com')
BEGIN
    PRINT 'ERRORE: Utente marcocamellini@gmail.com non trovato.';
    RETURN;
END

-- 2. Verifica utente attivo
DECLARE @is_active BIT;
SELECT @is_active = is_active FROM users WHERE email = 'marcocamellini@gmail.com';
IF @is_active = 0
BEGIN
    PRINT 'Utente disattivato. Riattivazione...';
    UPDATE users SET is_active = 1 WHERE email = 'marcocamellini@gmail.com';
    PRINT 'Utente riattivato.';
END

-- 3. Aggiorna password (hash per Camellini2026! - verificato)
UPDATE users
SET password_hash = '$2a$10$X0OZh7ud4QSLRzwPiSWdKODheo5SyUNW.v3B/ZeeRCb0lxBw69Tuu',
    updated_at = GETDATE()
WHERE email = 'marcocamellini@gmail.com';

IF @@ROWCOUNT > 0
BEGIN
    PRINT '';
    PRINT '=============================================================================';
    PRINT 'PASSWORD AGGIORNATA CON SUCCESSO';
    PRINT '=============================================================================';
    PRINT '  Email:    marcocamellini@gmail.com';
    PRINT '  Password: Camellini2026!';
    PRINT '=============================================================================';
    PRINT '';
END
ELSE
BEGIN
    PRINT 'ERRORE: Nessuna riga aggiornata.';
END

-- 4. Verifica finale
SELECT user_id, email, full_name, role, is_active, auditor_org_id
FROM users
WHERE email = 'marcocamellini@gmail.com';

GO
