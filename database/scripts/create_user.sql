-- =============================================================================
-- Script: Creazione utenti SGQ - Sistema Gestione ISO 9001
-- Uso: Eseguire in SSMS sul database SGQ_ISO9001
-- 
-- ISTRUZIONI:
-- 1. Modificare le variabili nella sezione "CONFIGURAZIONE" sotto
-- 2. Eseguire l'intero script (F5)
-- 3. Controllare il messaggio di output per conferma o errori
--
-- ESEMPI DI CONFIGURAZIONE:
--
--   Super utente (admin senza studio):
--     @role = 'admin', @auditor_org_id = NULL
--
--   Auditor (appartenente a uno studio):
--     @role = 'auditor', @auditor_org_id = 1  (id da: SELECT id, name FROM auditor_orgs)
--
--   Viewer (sola lettura):
--     @role = 'viewer', @auditor_org_id = 1
--
-- Per generare un hash password diverso da "Password123!":
--   cd backend
--   node -e "console.log(require('bcryptjs').hashSync('TuaPassword',10))"
-- =============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

-- =============================================================================
-- CONFIGURAZIONE — Modificare questi valori
-- =============================================================================

DECLARE @email          NVARCHAR(255) = 'auditor@studio-rossi.it';
DECLARE @full_name      NVARCHAR(255) = 'Mario Rossi';
DECLARE @role           NVARCHAR(20)  = 'auditor';        -- 'admin' | 'auditor' | 'viewer'
DECLARE @organization_id INT          = 1;                -- Di solito 1 per QS Studio
DECLARE @auditor_org_id INT           = 1;                -- NULL per superadmin, oppure id da auditor_orgs
DECLARE @password_hash  NVARCHAR(255) = '$2a$10$qLceC7M705fB7RPhnRlmMenKSVjW/vN5lumo3W8gZut7HwQKoQMcm';  -- Password123!

-- =============================================================================
-- VALIDAZIONI — Non modificare
-- =============================================================================

-- Verifica email non vuota
IF LEN(LTRIM(RTRIM(@email))) = 0
BEGIN
    RAISERROR('ERRORE: email obbligatoria.', 16, 1);
    RETURN;
END

-- Verifica ruolo valido
IF @role NOT IN ('admin', 'auditor', 'viewer')
BEGIN
    RAISERROR('ERRORE: role deve essere admin, auditor o viewer.', 16, 1);
    RETURN;
END

-- Verifica organizzazione esiste
IF NOT EXISTS (SELECT 1 FROM organizations WHERE organization_id = @organization_id AND is_active = 1)
BEGIN
    RAISERROR('ERRORE: organization_id %d non trovato o non attivo.', 16, 1, @organization_id);
    RETURN;
END

-- Se auditor_org_id fornito, verifica che esista e appartenga all'organizzazione
IF @auditor_org_id IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM auditor_orgs 
        WHERE id = @auditor_org_id AND organization_id = @organization_id AND is_active = 1
    )
    BEGIN
        RAISERROR('ERRORE: auditor_org_id %d non trovato o non appartiene all''organizzazione.', 16, 1, @auditor_org_id);
        RETURN;
    END
END

-- Verifica email unica per organizzazione
IF EXISTS (
    SELECT 1 FROM users 
    WHERE email = LTRIM(RTRIM(@email)) AND organization_id = @organization_id
)
BEGIN
    RAISERROR('ERRORE: email "%s" già registrata per questa organizzazione.', 16, 1, @email);
    RETURN;
END

-- Verifica hash password non vuoto
IF LEN(LTRIM(RTRIM(@password_hash))) < 50
BEGIN
    RAISERROR('ERRORE: password_hash non valido. Usa bcrypt con almeno 10 round.', 16, 1);
    RETURN;
END

-- =============================================================================
-- INSERIMENTO
-- =============================================================================

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        organization_id,
        auditor_org_id,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        LTRIM(RTRIM(@email)),
        @password_hash,
        LTRIM(RTRIM(@full_name)),
        @role,
        @organization_id,
        @auditor_org_id,
        1,
        GETDATE(),
        GETDATE()
    );

    DECLARE @new_user_id INT = SCOPE_IDENTITY();

    COMMIT TRANSACTION;

    PRINT '';
    PRINT '=============================================================================';
    PRINT 'UTENTE CREATO CON SUCCESSO';
    PRINT '=============================================================================';
    PRINT '  user_id:         ' + CAST(@new_user_id AS NVARCHAR(10));
    PRINT '  email:           ' + @email;
    PRINT '  full_name:       ' + @full_name;
    PRINT '  role:            ' + @role;
    PRINT '  organization_id: ' + CAST(@organization_id AS NVARCHAR(10));
    PRINT '  auditor_org_id:  ' + ISNULL(CAST(@auditor_org_id AS NVARCHAR(10)), 'NULL');
    PRINT '=============================================================================';
    PRINT '  Password predefinita: Password123!';
    PRINT '  Cambia la password al primo accesso.';
    PRINT '=============================================================================';
    PRINT '';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    DECLARE @errMsg NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @errSeverity INT = ERROR_SEVERITY();
    DECLARE @errState INT = ERROR_STATE();

    PRINT '';
    PRINT 'ERRORE durante la creazione utente:';
    PRINT @errMsg;
    PRINT '';

    RAISERROR(@errMsg, @errSeverity, @errState);
END CATCH;

GO

-- =============================================================================
-- QUERY DI VERIFICA (opzionale — decommentare per controllare)
-- =============================================================================

/*
SELECT user_id, email, full_name, role, organization_id, auditor_org_id, is_active, created_at
FROM users
WHERE email = 'auditor@studio-rossi.it';
*/
