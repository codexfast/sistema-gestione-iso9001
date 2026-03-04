-- ============================================================================
-- Migration 020: Fase 1 — Fondamenta Multi-Tenant e RBAC
-- ============================================================================
-- Descrizione:
--   Crea le tabelle per il modello SaaS multi-tenant:
--   - auditor_orgs: studi di consulenza (nostri clienti, sotto QS Studio)
--   - companies: aziende auditate (clienti degli auditor)
--   - user_org_roles: ruoli per utente per organizzazione (superadmin|admin|auditor|viewer)
--   - subscriptions: abbonamenti per standard per auditor_org
--
--   Modifiche tabelle esistenti:
--   - users.auditor_org_id (nullable, FK auditor_standards)
--   - audits.company_id (nullable, FK companies) — client_name resta per retrocompatibilità
--
-- Riferimento: docs/PROJECT_ROADMAP.md § Fase 1
-- Autore: Sistema Gestione ISO 9001 - QS Studio
-- Data: 4 Marzo 2026
--
-- ⚠️ ESEGUIRE SU DB DI TEST PRIMA DI PRODUZIONE
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;
PRINT '';
PRINT '================================================================================';
PRINT 'Migration 020: Fase 1 — Fondamenta Multi-Tenant (auditor_orgs, companies, ecc.)';
PRINT '================================================================================';
PRINT '';

-- ============================================================================
-- STEP 1: Verifica prerequisiti
-- ============================================================================

PRINT '🔍 STEP 1: Verifica prerequisiti...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'organizations')
BEGIN
    RAISERROR('❌ ERRORE: Tabella organizations non trovata.', 16, 1);
    RETURN;
END
PRINT '  ✅ organizations';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
BEGIN
    RAISERROR('❌ ERRORE: Tabella users non trovata.', 16, 1);
    RETURN;
END
PRINT '  ✅ users';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audits')
BEGIN
    RAISERROR('❌ ERRORE: Tabella audits non trovata.', 16, 1);
    RETURN;
END
PRINT '  ✅ audits';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'standards')
BEGIN
    RAISERROR('❌ ERRORE: Tabella standards non trovata.', 16, 1);
    RETURN;
END
PRINT '  ✅ standards';

PRINT '';

-- ============================================================================
-- STEP 2: Crea tabella auditor_orgs
-- ============================================================================

PRINT '🛠️  STEP 2: Tabella auditor_orgs...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'auditor_orgs')
BEGIN
    CREATE TABLE dbo.auditor_orgs (
        id INT IDENTITY(1,1) NOT NULL,
        organization_id INT NOT NULL,
        name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NULL,
        subscription_plan NVARCHAR(50) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_auditor_orgs PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_auditor_orgs_organization
            FOREIGN KEY (organization_id) REFERENCES dbo.organizations(organization_id)
    );

    CREATE NONCLUSTERED INDEX IX_auditor_orgs_organization
        ON dbo.auditor_orgs(organization_id);
    CREATE NONCLUSTERED INDEX IX_auditor_orgs_active
        ON dbo.auditor_orgs(is_active) WHERE is_active = 1;

    PRINT '  ✅ auditor_orgs creata';
END
ELSE
    PRINT '  ⚠️  auditor_orgs già esistente';

PRINT '';

-- ============================================================================
-- STEP 3: Crea tabella companies
-- ============================================================================

PRINT '🛠️  STEP 3: Tabella companies...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'companies')
BEGIN
    CREATE TABLE dbo.companies (
        id INT IDENTITY(1,1) NOT NULL,
        auditor_org_id INT NOT NULL,
        name NVARCHAR(255) NOT NULL,
        vat_number NVARCHAR(50) NULL,
        sector NVARCHAR(255) NULL,
        address NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_companies PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_companies_auditor_org
            FOREIGN KEY (auditor_org_id) REFERENCES dbo.auditor_orgs(id)
    );

    CREATE NONCLUSTERED INDEX IX_companies_auditor_org
        ON dbo.companies(auditor_org_id);
    CREATE NONCLUSTERED INDEX IX_companies_name
        ON dbo.companies(name);
    CREATE NONCLUSTERED INDEX IX_companies_vat
        ON dbo.companies(vat_number) WHERE vat_number IS NOT NULL;

    PRINT '  ✅ companies creata';
END
ELSE
    PRINT '  ⚠️  companies già esistente';

PRINT '';

-- ============================================================================
-- STEP 4: Crea tabella user_org_roles
-- ============================================================================

PRINT '🛠️  STEP 4: Tabella user_org_roles...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_org_roles')
BEGIN
    CREATE TABLE dbo.user_org_roles (
        user_id INT NOT NULL,
        org_id INT NOT NULL,
        role NVARCHAR(30) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_user_org_roles PRIMARY KEY CLUSTERED (user_id, org_id),
        CONSTRAINT FK_user_org_roles_user
            FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
        CONSTRAINT FK_user_org_roles_org
            FOREIGN KEY (org_id) REFERENCES dbo.organizations(organization_id) ON DELETE CASCADE,
        CONSTRAINT CK_user_org_roles_role
            CHECK (role IN ('superadmin', 'admin', 'auditor', 'viewer'))
    );

    CREATE NONCLUSTERED INDEX IX_user_org_roles_org
        ON dbo.user_org_roles(org_id);

    PRINT '  ✅ user_org_roles creata';
END
ELSE
    PRINT '  ⚠️  user_org_roles già esistente';

PRINT '';

-- ============================================================================
-- STEP 5: Crea tabella subscriptions
-- ============================================================================

PRINT '🛠️  STEP 5: Tabella subscriptions...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'subscriptions')
BEGIN
    CREATE TABLE dbo.subscriptions (
        id INT IDENTITY(1,1) NOT NULL,
        auditor_org_id INT NOT NULL,
        standard_id INT NOT NULL,
        [plan] NVARCHAR(50) NULL,
        valid_from DATE NOT NULL,
        valid_to DATE NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_subscriptions PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_subscriptions_auditor_org
            FOREIGN KEY (auditor_org_id) REFERENCES dbo.auditor_orgs(id) ON DELETE CASCADE,
        CONSTRAINT FK_subscriptions_standard
            FOREIGN KEY (standard_id) REFERENCES dbo.standards(standard_id),
        CONSTRAINT UQ_subscriptions_auditor_standard
            UNIQUE (auditor_org_id, standard_id)
    );

    CREATE NONCLUSTERED INDEX IX_subscriptions_auditor_org
        ON dbo.subscriptions(auditor_org_id);
    CREATE NONCLUSTERED INDEX IX_subscriptions_valid
        ON dbo.subscriptions(valid_from, valid_to) WHERE is_active = 1;

    PRINT '  ✅ subscriptions creata';
END
ELSE
    PRINT '  ⚠️  subscriptions già esistente';

PRINT '';

-- ============================================================================
-- STEP 6: ALTER users — aggiungi auditor_org_id
-- ============================================================================

PRINT '🛠️  STEP 6: ALTER users.auditor_org_id...';

PRINT '🛠️  STEP 6: ALTER users.auditor_org_id...';

-- Batch separati (GO) per evitare "Invalid column name" — SQL Server valida il batch prima dell'esecuzione
IF NOT EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'users' AND c.name = 'auditor_org_id'
)
BEGIN
    ALTER TABLE dbo.users ADD auditor_org_id INT NULL;
    PRINT '  ✅ users.auditor_org_id colonna aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_users_auditor_org')
BEGIN
    ALTER TABLE dbo.users ADD CONSTRAINT FK_users_auditor_org
        FOREIGN KEY (auditor_org_id) REFERENCES dbo.auditor_orgs(id);
    PRINT '  ✅ FK_users_auditor_org aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i
    INNER JOIN sys.tables t ON i.object_id = t.object_id
    WHERE t.name = 'users' AND i.name = 'IX_users_auditor_org')
BEGIN
    CREATE NONCLUSTERED INDEX IX_users_auditor_org
        ON dbo.users(auditor_org_id) WHERE auditor_org_id IS NOT NULL;
    PRINT '  ✅ IX_users_auditor_org creato';
END
GO

-- ============================================================================
-- STEP 7: ALTER audits — aggiungi company_id (batch separati)
-- ============================================================================

PRINT '🛠️  STEP 7: ALTER audits.company_id...';

IF NOT EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'audits' AND c.name = 'company_id'
)
BEGIN
    ALTER TABLE dbo.audits ADD company_id INT NULL;
    PRINT '  ✅ audits.company_id colonna aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_audits_company')
BEGIN
    ALTER TABLE dbo.audits ADD CONSTRAINT FK_audits_company
        FOREIGN KEY (company_id) REFERENCES dbo.companies(id);
    PRINT '  ✅ FK_audits_company aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i
    INNER JOIN sys.tables t ON i.object_id = t.object_id
    WHERE t.name = 'audits' AND i.name = 'IX_audits_company')
BEGIN
    CREATE NONCLUSTERED INDEX IX_audits_company
        ON dbo.audits(company_id) WHERE company_id IS NOT NULL;
    PRINT '  ✅ IX_audits_company creato';
END
GO

-- ============================================================================
-- STEP 8: Seed iniziale (opzionale — solo se auditor_orgs vuota)
-- ============================================================================

PRINT '🛠️  STEP 8: Seed iniziale...';

-- Crea un auditor_org di default per l'organizzazione esistente (org_id=1)
-- così gli audit esistenti possono essere associati in futuro
DECLARE @orgId INT = 1;
DECLARE @auditorOrgCount INT;

SELECT @auditorOrgCount = COUNT(*) FROM dbo.auditor_orgs;

IF @auditorOrgCount = 0 AND EXISTS (SELECT 1 FROM dbo.organizations WHERE organization_id = @orgId)
BEGIN
    INSERT INTO dbo.auditor_orgs (organization_id, name, email, subscription_plan, is_active)
    VALUES (@orgId, N'QS Studio (Default)', 'admin@sgq.local', 'full', 1);

    PRINT '  ✅ Seed auditor_org creato per organization_id=1';
END
ELSE
    PRINT '  ℹ️  Seed non necessario (auditor_orgs già popolata o org non trovata)';

PRINT '';

-- ============================================================================
-- STEP 9: Verifica finale
-- ============================================================================

PRINT '✔️  STEP 9: Verifica finale...';

DECLARE @tablesOk INT = 0;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'auditor_orgs') SET @tablesOk += 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'companies') SET @tablesOk += 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_org_roles') SET @tablesOk += 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'subscriptions') SET @tablesOk += 1;

IF @tablesOk = 4
    PRINT '  ✅ Tutte le 4 tabelle presenti';
ELSE
    RAISERROR('❌ Verifica fallita: %d/4 tabelle create', 16, 1, @tablesOk);

PRINT '';
PRINT '================================================================================';
PRINT '✅ Migration 020 completata con successo!';
PRINT '================================================================================';
PRINT '';
PRINT '📌 PROSSIMI PASSI:';
PRINT '  1. Backend: middleware RBAC che verifica user_org_roles + auditor_org_id';
PRINT '  2. Backend: endpoint CRUD companies, auditor_orgs, subscriptions';
PRINT '  3. Frontend: pagina Anagrafica Aziende';
PRINT '  4. Migrazione graduale: audits.client_name → audits.company_id';
PRINT '';
PRINT '⚠️  RETROCOMPATIBILITÀ:';
PRINT '  - audits.client_name resta invariato (non toccato)';
PRINT '  - audits.company_id nullable — audit esistenti continuano a funzionare';
PRINT '  - users.auditor_org_id nullable — utenti esistenti senza auditor_org';
PRINT '';

GO
