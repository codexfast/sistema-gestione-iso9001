-- =============================================================================
-- Migrazione Multi-Tenant: Supporto Multi-Azienda
-- Sistema Gestione ISO 9001
-- 
-- Data: 1 dicembre 2025
-- Versione: 2.0
-- 
-- DESCRIZIONE:
-- Aggiunge supporto multi-tenant per separare dati tra aziende clienti diverse.
-- Ogni organizzazione ha utenti e audit isolati.
--
-- BREAKING CHANGES:
-- - audits.client_name diventa DEPRECATED (usare organizations.organization_name)
-- - Tutti gli utenti devono appartenere a un'organizzazione
-- - Query devono filtrare per organization_id
-- =============================================================================

USE [SGQ_ISO9001];
GO

PRINT '🏢 Inizio migrazione multi-tenant...';
PRINT '';

-- =============================================================================
-- STEP 1: CREAZIONE TABELLA ORGANIZATIONS
-- =============================================================================

PRINT '📋 STEP 1/5: Creazione tabella organizations...';

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[organizations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[organizations] (
        [organization_id] INT IDENTITY(1,1) NOT NULL,
        [organization_code] NVARCHAR(50) NOT NULL,
        [organization_name] NVARCHAR(255) NOT NULL,
        [vat_number] NVARCHAR(50) NULL,
        [address] NVARCHAR(500) NULL,
        [city] NVARCHAR(100) NULL,
        [country] NVARCHAR(100) NULL,
        [contact_email] NVARCHAR(255) NULL,
        [contact_phone] NVARCHAR(50) NULL,
        [is_active] BIT NOT NULL DEFAULT 1,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_organizations] PRIMARY KEY CLUSTERED ([organization_id]),
        CONSTRAINT [UQ_organizations_code] UNIQUE NONCLUSTERED ([organization_code])
    );
    
    CREATE INDEX [IX_organizations_name] ON [dbo].[organizations] ([organization_name]);
    CREATE INDEX [IX_organizations_active] ON [dbo].[organizations] ([is_active]) WHERE [is_active] = 1;
    
    PRINT '   ✅ Tabella organizations creata';
END
ELSE
BEGIN
    PRINT '   ⚠️  Tabella organizations già esistente';
END
GO

-- Popola organizzazione di default per dati esistenti
IF NOT EXISTS (SELECT * FROM [dbo].[organizations])
BEGIN
    INSERT INTO [dbo].[organizations] (
        [organization_code],
        [organization_name],
        [contact_email],
        [is_active]
    )
    VALUES (
        'DEFAULT_ORG',
        'Organizzazione Predefinita',
        'admin@sgq.local',
        1
    );
    
    PRINT '   ✅ Organizzazione predefinita creata';
END
GO

PRINT '';

-- =============================================================================
-- STEP 2: MODIFICA TABELLA USERS
-- =============================================================================

PRINT '📋 STEP 2/5: Aggiunta organization_id a users...';

-- Aggiungi colonna organization_id
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[users]') 
    AND name = 'organization_id'
)
BEGIN
    ALTER TABLE [dbo].[users]
    ADD [organization_id] INT NULL;
    
    PRINT '   ✅ Colonna organization_id aggiunta';
END
ELSE
BEGIN
    PRINT '   ⚠️  Colonna organization_id già esistente';
END
GO

-- Popola organization_id per utenti esistenti
UPDATE [dbo].[users]
SET [organization_id] = (SELECT TOP 1 [organization_id] FROM [dbo].[organizations] WHERE [organization_code] = 'DEFAULT_ORG')
WHERE [organization_id] IS NULL;

PRINT '   ✅ Utenti esistenti associati a organizzazione predefinita';
GO

-- Rendi organization_id NOT NULL
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[users]') 
    AND name = 'organization_id'
    AND is_nullable = 1
)
BEGIN
    ALTER TABLE [dbo].[users]
    ALTER COLUMN [organization_id] INT NOT NULL;
    
    PRINT '   ✅ organization_id impostato NOT NULL';
END
GO

-- Aggiungi foreign key
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_users_organization')
BEGIN
    ALTER TABLE [dbo].[users]
    ADD CONSTRAINT [FK_users_organization] 
        FOREIGN KEY ([organization_id]) 
        REFERENCES [dbo].[organizations]([organization_id])
        ON DELETE NO ACTION;
    
    PRINT '   ✅ FK_users_organization creata';
END
GO

-- Crea indice
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_users_organization'
    AND object_id = OBJECT_ID(N'[dbo].[users]')
)
BEGIN
    CREATE INDEX [IX_users_organization] 
    ON [dbo].[users] ([organization_id]);
    
    PRINT '   ✅ IX_users_organization creato';
END
GO

PRINT '';

-- =============================================================================
-- STEP 3: MODIFICA TABELLA AUDITS
-- =============================================================================

PRINT '📋 STEP 3/5: Aggiunta organization_id a audits...';

-- Aggiungi colonna organization_id
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[audits]') 
    AND name = 'organization_id'
)
BEGIN
    ALTER TABLE [dbo].[audits]
    ADD [organization_id] INT NULL;
    
    PRINT '   ✅ Colonna organization_id aggiunta';
END
GO

-- Popola organization_id per audit esistenti
UPDATE [dbo].[audits]
SET [organization_id] = (SELECT TOP 1 [organization_id] FROM [dbo].[organizations] WHERE [organization_code] = 'DEFAULT_ORG')
WHERE [organization_id] IS NULL;

PRINT '   ✅ Audit esistenti associati a organizzazione predefinita';
GO

-- Rendi organization_id NOT NULL
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[audits]') 
    AND name = 'organization_id'
    AND is_nullable = 1
)
BEGIN
    ALTER TABLE [dbo].[audits]
    ALTER COLUMN [organization_id] INT NOT NULL;
    
    PRINT '   ✅ organization_id impostato NOT NULL';
END
GO

-- Aggiungi foreign key
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_audits_organization')
BEGIN
    ALTER TABLE [dbo].[audits]
    ADD CONSTRAINT [FK_audits_organization] 
        FOREIGN KEY ([organization_id]) 
        REFERENCES [dbo].[organizations]([organization_id])
        ON DELETE NO ACTION;
    
    PRINT '   ✅ FK_audits_organization creata';
END
GO

-- Crea indice
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_audits_organization'
    AND object_id = OBJECT_ID(N'[dbo].[audits]')
)
BEGIN
    CREATE INDEX [IX_audits_organization] 
    ON [dbo].[audits] ([organization_id]);
    
    PRINT '   ✅ IX_audits_organization creato';
END
GO

PRINT '';

-- =============================================================================
-- STEP 4: AGGIORNAMENTO VIEW VW_AUDIT_DASHBOARD
-- =============================================================================

PRINT '📋 STEP 4/5: Aggiornamento view vw_audit_dashboard con organizations...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_audit_dashboard')
BEGIN
    DROP VIEW [dbo].[vw_audit_dashboard];
    PRINT '   ✅ View esistente rimossa';
END
GO

CREATE VIEW [dbo].[vw_audit_dashboard]
AS
SELECT 
    a.[audit_id],
    a.[audit_uuid],
    a.[audit_number],
    a.[client_name],
    a.[project_year],
    a.[audit_date],
    a.[auditor_name],
    a.[audit_type],
    a.[status],
    a.[total_questions],
    a.[answered_questions],
    a.[conformities_count],
    a.[non_conformities_count],
    a.[completion_percentage],
    a.[created_at],
    a.[updated_at],
    
    -- Organization info
    a.[organization_id],
    o.[organization_code],
    o.[organization_name],
    o.[is_active] AS organization_active,
    
    -- Standard info
    a.[standard_id],
    s.[standard_code],
    s.[standard_name],
    s.[category] AS standard_category,
    
    -- Multi-standard flag
    CASE 
        WHEN EXISTS (SELECT 1 FROM [dbo].[audit_standards] WHERE [audit_id] = a.[audit_id])
        THEN 1 
        ELSE 0 
    END AS is_multi_standard,
    
    -- User info
    u.[full_name] AS created_by_name,
    u.[email] AS created_by_email,
    u.[organization_id] AS creator_organization_id,
    
    -- Aggregates
    (SELECT COUNT(*) FROM [dbo].[attachments] WHERE [audit_id] = a.[audit_id]) AS attachments_count,
    (SELECT COUNT(*) FROM [dbo].[non_conformities] WHERE [audit_id] = a.[audit_id] AND [status] = 'open') AS open_nc_count
FROM [dbo].[audits] a
INNER JOIN [dbo].[users] u ON a.[created_by] = u.[user_id]
INNER JOIN [dbo].[organizations] o ON a.[organization_id] = o.[organization_id]
LEFT JOIN [dbo].[standards] s ON a.[standard_id] = s.[standard_id]
WHERE a.[is_deleted] = 0;
GO

PRINT '   ✅ View vw_audit_dashboard aggiornata con multi-tenant';
GO

PRINT '';

-- =============================================================================
-- STEP 5: CREAZIONE POLICY RLS (Row-Level Security) - OPZIONALE
-- =============================================================================

PRINT '📋 STEP 5/5: Preparazione Row-Level Security (RLS)...';

-- Funzione predicate per RLS
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_UserOrganizationPredicate]'))
BEGIN
    EXEC('
    CREATE FUNCTION dbo.fn_UserOrganizationPredicate(@organization_id INT)
    RETURNS TABLE
    WITH SCHEMABINDING
    AS
    RETURN SELECT 1 AS fn_UserOrganizationPredicate_result
    WHERE 
        @organization_id = CAST(SESSION_CONTEXT(N''OrganizationId'') AS INT)
        OR IS_MEMBER(''db_owner'') = 1
        OR IS_MEMBER(''admin'') = 1;
    ');
    
    PRINT '   ✅ Funzione RLS fn_UserOrganizationPredicate creata';
    PRINT '   ℹ️  Per attivare RLS:';
    PRINT '      CREATE SECURITY POLICY OrganizationFilter';
    PRINT '      ADD FILTER PREDICATE dbo.fn_UserOrganizationPredicate(organization_id)';
    PRINT '      ON dbo.audits, dbo.users WITH (STATE = ON);';
END
ELSE
BEGIN
    PRINT '   ⚠️  Funzione RLS già esistente';
END
GO

PRINT '';

-- =============================================================================
-- VERIFICA FINALE
-- =============================================================================

PRINT '========================================';
PRINT '✅ MIGRAZIONE MULTI-TENANT COMPLETATA';
PRINT '========================================';
PRINT '';

-- Verifica struttura
PRINT '📊 ORGANIZZAZIONI:';
SELECT 
    organization_id AS ID,
    organization_code AS Codice,
    organization_name AS Nome,
    is_active AS Attivo
FROM organizations
ORDER BY organization_id;

PRINT '';

PRINT '📊 UTENTI PER ORGANIZZAZIONE:';
SELECT 
    o.organization_name AS Organizzazione,
    COUNT(u.user_id) AS [Num Utenti]
FROM organizations o
LEFT JOIN users u ON o.organization_id = u.organization_id
GROUP BY o.organization_id, o.organization_name
ORDER BY o.organization_id;

PRINT '';

PRINT '📊 AUDIT PER ORGANIZZAZIONE:';
SELECT 
    o.organization_name AS Organizzazione,
    COUNT(a.audit_id) AS [Num Audit]
FROM organizations o
LEFT JOIN audits a ON o.organization_id = a.organization_id AND a.is_deleted = 0
GROUP BY o.organization_id, o.organization_name
ORDER BY o.organization_id;

PRINT '';
PRINT '✅ Database pronto per multi-tenant!';
PRINT '';
PRINT '⚠️  IMPORTANTE - Modifiche Backend Necessarie:';
PRINT '   1. Login deve restituire organization_id';
PRINT '   2. Ogni query deve filtrare: WHERE organization_id = @userOrgId';
PRINT '   3. Frontend deve salvare organization_id nel token JWT';
PRINT '';
PRINT '📖 ESEMPIO QUERY SICURA:';
PRINT '   SELECT * FROM vw_audit_dashboard';
PRINT '   WHERE organization_id = @currentUserOrganizationId;';
PRINT '';

GO
