-- =============================================================================
-- Script di Creazione Database: SGQ_ISO9001
-- Sistema Gestione Qualità ISO 9001:2015
-- 
-- Autore: Sistema Gestione ISO 9001
-- Data: 28 novembre 2025
-- Versione: 1.0
-- 
-- DESCRIZIONE:
-- Questo script crea il database SGQ_ISO9001 con tutte le tabelle, vincoli,
-- indici, trigger, stored procedures e views necessarie per il sistema di
-- gestione audit ISO 9001:2015.
--
-- PREREQUISITI:
-- - SQL Server Express 2022 o superiore installato
-- - Accesso con privilegi SA o amministratore
-- - Minimo 2GB spazio disco disponibile
--
-- UTILIZZO:
-- sqlcmd -S localhost -U sa -i create_database.sql
-- 
-- NOTA: Lo script è idempotente (può essere eseguito più volte senza errori)
-- =============================================================================

USE master;
GO

-- =============================================================================
-- SEZIONE 1: CREAZIONE DATABASE
-- =============================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SGQ_ISO9001')
BEGIN
    PRINT '📦 Creazione database SGQ_ISO9001...';
    
    CREATE DATABASE [SGQ_ISO9001]
    ON PRIMARY (
        NAME = N'SGQ_ISO9001_Data',
        FILENAME = N'/var/opt/mssql/data/SGQ_ISO9001_Data.mdf',
        SIZE = 100MB,
        MAXSIZE = 5GB,
        FILEGROWTH = 10MB
    )
    LOG ON (
        NAME = N'SGQ_ISO9001_Log',
        FILENAME = N'/var/opt/mssql/data/SGQ_ISO9001_Log.ldf',
        SIZE = 50MB,
        MAXSIZE = 1GB,
        FILEGROWTH = 10MB
    );
    
    PRINT '✅ Database SGQ_ISO9001 creato con successo';
END
ELSE
BEGIN
    PRINT '⚠️  Database SGQ_ISO9001 già esistente, skip creazione';
END
GO

-- Imposta il database corrente
USE [SGQ_ISO9001];
GO

PRINT '🔧 Configurazione database in corso...';

-- Imposta recovery model SIMPLE per ambiente development
IF DATABASEPROPERTYEX(DB_NAME(), 'Recovery') <> 'SIMPLE'
BEGIN
    ALTER DATABASE [SGQ_ISO9001] SET RECOVERY SIMPLE;
    PRINT '✅ Recovery model impostato a SIMPLE';
END
GO

-- =============================================================================
-- SEZIONE 2: CREAZIONE UTENTE API
-- =============================================================================

PRINT '👤 Creazione utente API...';

-- Crea login per l'applicazione (se non esiste)
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'sgq_api_user')
BEGIN
    CREATE LOGIN [sgq_api_user] 
    WITH PASSWORD = N'SgqApi2025!SecurePassword', 
    DEFAULT_DATABASE = [SGQ_ISO9001],
    CHECK_POLICY = ON,
    CHECK_EXPIRATION = OFF;
    
    PRINT '✅ Login sgq_api_user creato';
END
ELSE
BEGIN
    PRINT '⚠️  Login sgq_api_user già esistente';
END
GO

-- Crea user nel database
USE [SGQ_ISO9001];
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'sgq_api_user')
BEGIN
    CREATE USER [sgq_api_user] FOR LOGIN [sgq_api_user];
    PRINT '✅ User sgq_api_user creato nel database';
END
ELSE
BEGIN
    PRINT '⚠️  User sgq_api_user già esistente';
END
GO

-- Assegna ruoli necessari
ALTER ROLE db_datareader ADD MEMBER [sgq_api_user];
ALTER ROLE db_datawriter ADD MEMBER [sgq_api_user];
GRANT EXECUTE TO [sgq_api_user];
PRINT '✅ Privilegi assegnati a sgq_api_user';
GO

-- =============================================================================
-- SEZIONE 3: CREAZIONE TABELLE
-- =============================================================================

PRINT '📋 Creazione tabelle...';

-- -----------------------------------------------------------------------------
-- Tabella: users
-- Descrizione: Auditori e utenti del sistema con autenticazione
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[users] (
        [user_id] INT IDENTITY(1,1) NOT NULL,
        [user_uuid] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [email] NVARCHAR(255) NOT NULL,
        [password_hash] NVARCHAR(255) NOT NULL,
        [full_name] NVARCHAR(255) NOT NULL,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'auditor' CHECK ([role] IN ('admin', 'auditor', 'viewer')),
        [is_active] BIT NOT NULL DEFAULT 1,
        [last_login] DATETIME2 NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_users] PRIMARY KEY CLUSTERED ([user_id]),
        CONSTRAINT [UQ_users_uuid] UNIQUE NONCLUSTERED ([user_uuid]),
        CONSTRAINT [UQ_users_email] UNIQUE NONCLUSTERED ([email])
    );
    
    CREATE INDEX [IX_users_email] ON [dbo].[users] ([email]);
    CREATE INDEX [IX_users_role] ON [dbo].[users] ([role]);
    
    PRINT '✅ Tabella users creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: checklist_sections
-- Descrizione: Sezioni della norma ISO 9001:2015 (4, 5, 6, 7, 8, 9, 10)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[checklist_sections]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[checklist_sections] (
        [section_id] INT IDENTITY(1,1) NOT NULL,
        [section_code] NVARCHAR(10) NOT NULL,
        [section_title] NVARCHAR(500) NOT NULL,
        [parent_section_code] NVARCHAR(10) NULL,
        [display_order] INT NOT NULL DEFAULT 0,
        [is_active] BIT NOT NULL DEFAULT 1,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_checklist_sections] PRIMARY KEY CLUSTERED ([section_id]),
        CONSTRAINT [UQ_checklist_sections_code] UNIQUE NONCLUSTERED ([section_code])
    );
    
    CREATE INDEX [IX_checklist_sections_parent] ON [dbo].[checklist_sections] ([parent_section_code]);
    CREATE INDEX [IX_checklist_sections_order] ON [dbo].[checklist_sections] ([display_order]);
    
    PRINT '✅ Tabella checklist_sections creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: checklist_questions
-- Descrizione: Domande di audit per ogni sezione ISO
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[checklist_questions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[checklist_questions] (
        [question_id] INT IDENTITY(1,1) NOT NULL,
        [question_uuid] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [section_code] NVARCHAR(10) NOT NULL,
        [question_text] NVARCHAR(MAX) NOT NULL,
        [question_type] NVARCHAR(50) NOT NULL DEFAULT 'yes_no' CHECK ([question_type] IN ('yes_no', 'conformity', 'text', 'numeric')),
        [display_order] INT NOT NULL DEFAULT 0,
        [is_mandatory] BIT NOT NULL DEFAULT 0,
        [is_active] BIT NOT NULL DEFAULT 1,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_checklist_questions] PRIMARY KEY CLUSTERED ([question_id]),
        CONSTRAINT [UQ_checklist_questions_uuid] UNIQUE NONCLUSTERED ([question_uuid]),
        CONSTRAINT [FK_checklist_questions_section] FOREIGN KEY ([section_code])
            REFERENCES [dbo].[checklist_sections]([section_code])
            ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE INDEX [IX_checklist_questions_section] ON [dbo].[checklist_questions] ([section_code]);
    CREATE INDEX [IX_checklist_questions_order] ON [dbo].[checklist_questions] ([display_order]);
    
    PRINT '✅ Tabella checklist_questions creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: audits
-- Descrizione: Audit principali con metriche aggregate
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audits]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[audits] (
        [audit_id] INT IDENTITY(1,1) NOT NULL,
        [audit_uuid] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [audit_number] NVARCHAR(50) NOT NULL,
        [client_name] NVARCHAR(255) NOT NULL,
        [project_year] INT NOT NULL,
        [audit_date] DATE NOT NULL,
        [auditor_name] NVARCHAR(255) NOT NULL,
        [audit_type] NVARCHAR(100) NOT NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'draft' CHECK ([status] IN ('draft', 'in_progress', 'completed', 'approved')),
        [total_questions] INT NOT NULL DEFAULT 0,
        [answered_questions] INT NOT NULL DEFAULT 0,
        [conformities_count] INT NOT NULL DEFAULT 0,
        [non_conformities_count] INT NOT NULL DEFAULT 0,
        [completion_percentage] DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        [notes] NVARCHAR(MAX) NULL,
        [is_deleted] BIT NOT NULL DEFAULT 0,
        [deleted_at] DATETIME2 NULL,
        [created_by] INT NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_audits] PRIMARY KEY CLUSTERED ([audit_id]),
        CONSTRAINT [UQ_audits_uuid] UNIQUE NONCLUSTERED ([audit_uuid]),
        CONSTRAINT [UQ_audits_number] UNIQUE NONCLUSTERED ([audit_number]),
        CONSTRAINT [FK_audits_created_by] FOREIGN KEY ([created_by])
            REFERENCES [dbo].[users]([user_id])
            ON DELETE NO ACTION ON UPDATE NO ACTION
    );
    
    CREATE INDEX [IX_audits_client] ON [dbo].[audits] ([client_name]);
    CREATE INDEX [IX_audits_date] ON [dbo].[audits] ([audit_date] DESC);
    CREATE INDEX [IX_audits_status] ON [dbo].[audits] ([status]);
    CREATE INDEX [IX_audits_created_by] ON [dbo].[audits] ([created_by]);
    CREATE INDEX [IX_audits_deleted] ON [dbo].[audits] ([is_deleted]) WHERE [is_deleted] = 0;
    
    PRINT '✅ Tabella audits creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: audit_responses
-- Descrizione: Risposte alle domande della checklist per ogni audit
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audit_responses]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[audit_responses] (
        [response_id] INT IDENTITY(1,1) NOT NULL,
        [response_uuid] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [audit_id] INT NOT NULL,
        [question_id] INT NOT NULL,
        [answer_value] NVARCHAR(50) NULL,
        [conformity_status] NVARCHAR(20) NULL CHECK ([conformity_status] IN ('C', 'NC', 'OM', 'NA', NULL)),
        [notes] NVARCHAR(MAX) NULL,
        [is_answered] BIT NOT NULL DEFAULT 0,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_audit_responses] PRIMARY KEY CLUSTERED ([response_id]),
        CONSTRAINT [UQ_audit_responses_uuid] UNIQUE NONCLUSTERED ([response_uuid]),
        CONSTRAINT [UQ_audit_responses_audit_question] UNIQUE NONCLUSTERED ([audit_id], [question_id]),
        CONSTRAINT [FK_audit_responses_audit] FOREIGN KEY ([audit_id])
            REFERENCES [dbo].[audits]([audit_id])
            ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT [FK_audit_responses_question] FOREIGN KEY ([question_id])
            REFERENCES [dbo].[checklist_questions]([question_id])
            ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE INDEX [IX_audit_responses_audit] ON [dbo].[audit_responses] ([audit_id]);
    CREATE INDEX [IX_audit_responses_question] ON [dbo].[audit_responses] ([question_id]);
    CREATE INDEX [IX_audit_responses_conformity] ON [dbo].[audit_responses] ([conformity_status]);
    
    PRINT '✅ Tabella audit_responses creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: non_conformities
-- Descrizione: Non conformità rilevate durante gli audit
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[non_conformities]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[non_conformities] (
        [nc_id] INT IDENTITY(1,1) NOT NULL,
        [nc_uuid] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [audit_id] INT NOT NULL,
        [nc_number] NVARCHAR(50) NOT NULL,
        [section_code] NVARCHAR(10) NOT NULL,
        [description] NVARCHAR(MAX) NOT NULL,
        [severity] NVARCHAR(20) NOT NULL DEFAULT 'minor' CHECK ([severity] IN ('major', 'minor', 'observation')),
        [corrective_action] NVARCHAR(MAX) NULL,
        [responsible_person] NVARCHAR(255) NULL,
        [due_date] DATE NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'open' CHECK ([status] IN ('open', 'in_progress', 'resolved', 'verified', 'closed')),
        [resolution_date] DATE NULL,
        [verification_notes] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_non_conformities] PRIMARY KEY CLUSTERED ([nc_id]),
        CONSTRAINT [UQ_non_conformities_uuid] UNIQUE NONCLUSTERED ([nc_uuid]),
        CONSTRAINT [UQ_non_conformities_number] UNIQUE NONCLUSTERED ([nc_number]),
        CONSTRAINT [FK_non_conformities_audit] FOREIGN KEY ([audit_id])
            REFERENCES [dbo].[audits]([audit_id])
            ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT [FK_non_conformities_section] FOREIGN KEY ([section_code])
            REFERENCES [dbo].[checklist_sections]([section_code])
            ON DELETE NO ACTION ON UPDATE NO ACTION
    );
    
    CREATE INDEX [IX_non_conformities_audit] ON [dbo].[non_conformities] ([audit_id]);
    CREATE INDEX [IX_non_conformities_status] ON [dbo].[non_conformities] ([status]);
    CREATE INDEX [IX_non_conformities_severity] ON [dbo].[non_conformities] ([severity]);
    CREATE INDEX [IX_non_conformities_due_date] ON [dbo].[non_conformities] ([due_date]);
    
    PRINT '✅ Tabella non_conformities creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: attachments
-- Descrizione: Allegati (foto, audio, video, documenti) per audit e NC
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[attachments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[attachments] (
        [attachment_id] INT IDENTITY(1,1) NOT NULL,
        [attachment_uuid] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [audit_id] INT NULL,
        [nc_id] INT NULL,
        [file_name] NVARCHAR(255) NOT NULL,
        [file_type] NVARCHAR(50) NOT NULL,
        [file_size] INT NOT NULL,
        [mime_type] NVARCHAR(100) NOT NULL,
        [storage_path] NVARCHAR(500) NOT NULL,
        [category] NVARCHAR(50) NOT NULL DEFAULT 'evidence' CHECK ([category] IN ('evidence', 'photo', 'audio', 'video', 'document')),
        [description] NVARCHAR(500) NULL,
        [uploaded_by] INT NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_attachments] PRIMARY KEY CLUSTERED ([attachment_id]),
        CONSTRAINT [UQ_attachments_uuid] UNIQUE NONCLUSTERED ([attachment_uuid]),
        CONSTRAINT [FK_attachments_audit] FOREIGN KEY ([audit_id])
            REFERENCES [dbo].[audits]([audit_id])
            ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT [FK_attachments_nc] FOREIGN KEY ([nc_id])
            REFERENCES [dbo].[non_conformities]([nc_id])
            ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [FK_attachments_uploaded_by] FOREIGN KEY ([uploaded_by])
            REFERENCES [dbo].[users]([user_id])
            ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [CHK_attachments_parent] CHECK (
            ([audit_id] IS NOT NULL AND [nc_id] IS NULL) OR
            ([audit_id] IS NULL AND [nc_id] IS NOT NULL)
        )
    );
    
    CREATE INDEX [IX_attachments_audit] ON [dbo].[attachments] ([audit_id]);
    CREATE INDEX [IX_attachments_nc] ON [dbo].[attachments] ([nc_id]);
    CREATE INDEX [IX_attachments_category] ON [dbo].[attachments] ([category]);
    CREATE INDEX [IX_attachments_uploaded_by] ON [dbo].[attachments] ([uploaded_by]);
    
    PRINT '✅ Tabella attachments creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: audit_history
-- Descrizione: Log delle modifiche agli audit (audit trail)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audit_history]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[audit_history] (
        [history_id] INT IDENTITY(1,1) NOT NULL,
        [audit_id] INT NOT NULL,
        [action] NVARCHAR(50) NOT NULL CHECK ([action] IN ('created', 'updated', 'deleted', 'status_changed', 'approved')),
        [changed_by] INT NOT NULL,
        [changed_fields] NVARCHAR(MAX) NULL,
        [old_values] NVARCHAR(MAX) NULL,
        [new_values] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_audit_history] PRIMARY KEY CLUSTERED ([history_id]),
        CONSTRAINT [FK_audit_history_audit] FOREIGN KEY ([audit_id])
            REFERENCES [dbo].[audits]([audit_id])
            ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT [FK_audit_history_changed_by] FOREIGN KEY ([changed_by])
            REFERENCES [dbo].[users]([user_id])
            ON DELETE NO ACTION ON UPDATE NO ACTION
    );
    
    CREATE INDEX [IX_audit_history_audit] ON [dbo].[audit_history] ([audit_id]);
    CREATE INDEX [IX_audit_history_changed_by] ON [dbo].[audit_history] ([changed_by]);
    CREATE INDEX [IX_audit_history_action] ON [dbo].[audit_history] ([action]);
    CREATE INDEX [IX_audit_history_created_at] ON [dbo].[audit_history] ([created_at] DESC);
    
    PRINT '✅ Tabella audit_history creata';
END
GO

-- -----------------------------------------------------------------------------
-- Tabella: sync_metadata
-- Descrizione: Metadati per sincronizzazione offline-first con frontend
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sync_metadata]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[sync_metadata] (
        [sync_id] INT IDENTITY(1,1) NOT NULL,
        [entity_type] NVARCHAR(50) NOT NULL CHECK ([entity_type] IN ('audit', 'response', 'nc', 'attachment')),
        [entity_id] INT NOT NULL,
        [entity_uuid] UNIQUEIDENTIFIER NOT NULL,
        [last_sync_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [sync_version] INT NOT NULL DEFAULT 1,
        [is_deleted] BIT NOT NULL DEFAULT 0,
        [device_id] NVARCHAR(255) NULL,
        CONSTRAINT [PK_sync_metadata] PRIMARY KEY CLUSTERED ([sync_id]),
        CONSTRAINT [UQ_sync_metadata_entity] UNIQUE NONCLUSTERED ([entity_type], [entity_id])
    );
    
    CREATE INDEX [IX_sync_metadata_entity_uuid] ON [dbo].[sync_metadata] ([entity_uuid]);
    CREATE INDEX [IX_sync_metadata_last_sync] ON [dbo].[sync_metadata] ([last_sync_at] DESC);
    CREATE INDEX [IX_sync_metadata_device] ON [dbo].[sync_metadata] ([device_id]);
    
    PRINT '✅ Tabella sync_metadata creata';
END
GO

-- =============================================================================
-- SEZIONE 4: TRIGGER
-- =============================================================================

PRINT '⚡ Creazione trigger...';

-- -----------------------------------------------------------------------------
-- Trigger: trg_users_updated_at
-- Descrizione: Aggiorna automaticamente updated_at su modifica
-- -----------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_users_updated_at')
    DROP TRIGGER [dbo].[trg_users_updated_at];
GO

CREATE TRIGGER [dbo].[trg_users_updated_at]
ON [dbo].[users]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[users]
    SET [updated_at] = GETDATE()
    FROM [dbo].[users] u
    INNER JOIN inserted i ON u.[user_id] = i.[user_id];
END;
GO
PRINT '✅ Trigger trg_users_updated_at creato';

-- -----------------------------------------------------------------------------
-- Trigger: trg_audits_updated_at
-- Descrizione: Aggiorna automaticamente updated_at su modifica
-- -----------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_audits_updated_at')
    DROP TRIGGER [dbo].[trg_audits_updated_at];
GO

CREATE TRIGGER [dbo].[trg_audits_updated_at]
ON [dbo].[audits]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[audits]
    SET [updated_at] = GETDATE()
    FROM [dbo].[audits] a
    INNER JOIN inserted i ON a.[audit_id] = i.[audit_id];
END;
GO
PRINT '✅ Trigger trg_audits_updated_at creato';

-- -----------------------------------------------------------------------------
-- Trigger: trg_audit_responses_metrics
-- Descrizione: Ricalcola metriche audit su modifica risposte
-- -----------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_audit_responses_metrics')
    DROP TRIGGER [dbo].[trg_audit_responses_metrics];
GO

CREATE TRIGGER [dbo].[trg_audit_responses_metrics]
ON [dbo].[audit_responses]
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Aggiorna metriche per audit modificati
    UPDATE a
    SET 
        [answered_questions] = (
            SELECT COUNT(*) 
            FROM [dbo].[audit_responses] 
            WHERE [audit_id] = a.[audit_id] AND [is_answered] = 1
        ),
        [conformities_count] = (
            SELECT COUNT(*) 
            FROM [dbo].[audit_responses] 
            WHERE [audit_id] = a.[audit_id] AND [conformity_status] = 'C'
        ),
        [non_conformities_count] = (
            SELECT COUNT(*) 
            FROM [dbo].[audit_responses] 
            WHERE [audit_id] = a.[audit_id] AND [conformity_status] = 'NC'
        ),
        [completion_percentage] = CASE 
            WHEN a.[total_questions] > 0 THEN 
                CAST((SELECT COUNT(*) FROM [dbo].[audit_responses] WHERE [audit_id] = a.[audit_id] AND [is_answered] = 1) AS DECIMAL(5,2)) 
                / CAST(a.[total_questions] AS DECIMAL(5,2)) * 100
            ELSE 0
        END
    FROM [dbo].[audits] a
    WHERE a.[audit_id] IN (
        SELECT [audit_id] FROM inserted
        UNION
        SELECT [audit_id] FROM deleted
    );
END;
GO
PRINT '✅ Trigger trg_audit_responses_metrics creato';

-- =============================================================================
-- SEZIONE 5: STORED PROCEDURES
-- =============================================================================

PRINT '🔧 Creazione stored procedures...';

-- -----------------------------------------------------------------------------
-- Stored Procedure: sp_create_audit
-- Descrizione: Crea nuovo audit con gestione transazionale
-- -----------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_create_audit')
    DROP PROCEDURE [dbo].[sp_create_audit];
GO

CREATE PROCEDURE [dbo].[sp_create_audit]
    @audit_number NVARCHAR(50),
    @client_name NVARCHAR(255),
    @project_year INT,
    @audit_date DATE,
    @auditor_name NVARCHAR(255),
    @audit_type NVARCHAR(100),
    @created_by INT,
    @audit_id INT OUTPUT,
    @audit_uuid UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Crea audit
        INSERT INTO [dbo].[audits] (
            [audit_number], [client_name], [project_year], [audit_date],
            [auditor_name], [audit_type], [created_by]
        )
        VALUES (
            @audit_number, @client_name, @project_year, @audit_date,
            @auditor_name, @audit_type, @created_by
        );
        
        SET @audit_id = SCOPE_IDENTITY();
        
        SELECT @audit_uuid = [audit_uuid]
        FROM [dbo].[audits]
        WHERE [audit_id] = @audit_id;
        
        -- Inizializza risposte per tutte le domande attive
        INSERT INTO [dbo].[audit_responses] ([audit_id], [question_id])
        SELECT @audit_id, [question_id]
        FROM [dbo].[checklist_questions]
        WHERE [is_active] = 1;
        
        -- Aggiorna totale domande
        UPDATE [dbo].[audits]
        SET [total_questions] = (
            SELECT COUNT(*) 
            FROM [dbo].[audit_responses] 
            WHERE [audit_id] = @audit_id
        )
        WHERE [audit_id] = @audit_id;
        
        -- Log history
        INSERT INTO [dbo].[audit_history] (
            [audit_id], [action], [changed_by]
        )
        VALUES (@audit_id, 'created', @created_by);
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
PRINT '✅ Stored procedure sp_create_audit creata';

-- =============================================================================
-- SEZIONE 6: VIEWS
-- =============================================================================

PRINT '👁️  Creazione views...';

-- -----------------------------------------------------------------------------
-- View: vw_audit_dashboard
-- Descrizione: Vista aggregata per dashboard audit
-- -----------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_audit_dashboard')
    DROP VIEW [dbo].[vw_audit_dashboard];
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
    u.[full_name] AS created_by_name,
    u.[email] AS created_by_email,
    (SELECT COUNT(*) FROM [dbo].[attachments] WHERE [audit_id] = a.[audit_id]) AS attachments_count,
    (SELECT COUNT(*) FROM [dbo].[non_conformities] WHERE [audit_id] = a.[audit_id] AND [status] = 'open') AS open_nc_count
FROM [dbo].[audits] a
INNER JOIN [dbo].[users] u ON a.[created_by] = u.[user_id]
WHERE a.[is_deleted] = 0;
GO
PRINT '✅ View vw_audit_dashboard creata';

-- =============================================================================
-- SEZIONE 7: DATI INIZIALI (ISO 9001:2015 SECTIONS)
-- =============================================================================

PRINT '📝 Inserimento dati iniziali...';

-- Sezioni ISO 9001:2015
IF NOT EXISTS (SELECT * FROM [dbo].[checklist_sections])
BEGIN
    SET IDENTITY_INSERT [dbo].[checklist_sections] ON;
    
    INSERT INTO [dbo].[checklist_sections] ([section_id], [section_code], [section_title], [parent_section_code], [display_order])
    VALUES
    (1, '4', 'Contesto dell''organizzazione', NULL, 4),
    (2, '4.1', 'Comprendere l''organizzazione e il suo contesto', '4', 1),
    (3, '4.2', 'Comprendere le esigenze e le aspettative delle parti interessate', '4', 2),
    (4, '4.3', 'Determinare il campo di applicazione del sistema di gestione per la qualità', '4', 3),
    (5, '4.4', 'Sistema di gestione per la qualità e relativi processi', '4', 4),
    
    (6, '5', 'Leadership', NULL, 5),
    (7, '5.1', 'Leadership e impegno', '5', 1),
    (8, '5.2', 'Politica', '5', 2),
    (9, '5.3', 'Ruoli, responsabilità e autorità nell''organizzazione', '5', 3),
    
    (10, '6', 'Pianificazione', NULL, 6),
    (11, '6.1', 'Azioni per affrontare rischi e opportunità', '6', 1),
    (12, '6.2', 'Obiettivi per la qualità e pianificazione per il loro raggiungimento', '6', 2),
    (13, '6.3', 'Pianificazione delle modifiche', '6', 3),
    
    (14, '7', 'Supporto', NULL, 7),
    (15, '7.1', 'Risorse', '7', 1),
    (16, '7.2', 'Competenza', '7', 2),
    (17, '7.3', 'Consapevolezza', '7', 3),
    (18, '7.4', 'Comunicazione', '7', 4),
    (19, '7.5', 'Informazioni documentate', '7', 5),
    
    (20, '8', 'Attività operative', NULL, 8),
    (21, '8.1', 'Pianificazione e controllo operativi', '8', 1),
    (22, '8.2', 'Requisiti per i prodotti e i servizi', '8', 2),
    (23, '8.3', 'Progettazione e sviluppo di prodotti e servizi', '8', 3),
    (24, '8.4', 'Controllo dei processi, prodotti e servizi forniti dall''esterno', '8', 4),
    (25, '8.5', 'Produzione ed erogazione dei servizi', '8', 5),
    (26, '8.6', 'Rilascio di prodotti e servizi', '8', 6),
    (27, '8.7', 'Controllo degli output non conformi', '8', 7),
    
    (28, '9', 'Valutazione delle prestazioni', NULL, 9),
    (29, '9.1', 'Monitoraggio, misurazione, analisi e valutazione', '9', 1),
    (30, '9.2', 'Audit interno', '9', 2),
    (31, '9.3', 'Riesame di direzione', '9', 3),
    
    (32, '10', 'Miglioramento', NULL, 10),
    (33, '10.1', 'Generalità', '10', 1),
    (34, '10.2', 'Non conformità e azioni correttive', '10', 2),
    (35, '10.3', 'Miglioramento continuo', '10', 3);
    
    SET IDENTITY_INSERT [dbo].[checklist_sections] OFF;
    
    PRINT '✅ Sezioni ISO 9001:2015 inserite';
END
ELSE
BEGIN
    PRINT '⚠️  Sezioni ISO 9001:2015 già presenti';
END
GO

-- Utente amministratore di default
IF NOT EXISTS (SELECT * FROM [dbo].[users] WHERE [email] = 'admin@sgq.local')
BEGIN
    -- Password: Admin2025! (hash bcrypt)
    INSERT INTO [dbo].[users] ([email], [password_hash], [full_name], [role])
    VALUES (
        'admin@sgq.local',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Amministratore SGQ',
        'admin'
    );
    
    PRINT '✅ Utente amministratore creato (email: admin@sgq.local, password: Admin2025!)';
END
ELSE
BEGIN
    PRINT '⚠️  Utente amministratore già esistente';
END
GO

-- =============================================================================
-- SEZIONE 8: VERIFICA FINALE
-- =============================================================================

PRINT '';
PRINT '========================================';
PRINT '🎉 INSTALLAZIONE COMPLETATA CON SUCCESSO';
PRINT '========================================';
PRINT '';

-- Mostra riepilogo tabelle
PRINT '📊 TABELLE CREATE:';
SELECT 
    TABLE_NAME AS 'Nome Tabella',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) AS 'Colonne'
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

PRINT '';
PRINT '📊 INDICI CREATI:';
SELECT 
    OBJECT_NAME(object_id) AS 'Tabella',
    name AS 'Nome Indice',
    type_desc AS 'Tipo'
FROM sys.indexes
WHERE object_id IN (SELECT object_id FROM sys.tables)
AND name IS NOT NULL
ORDER BY OBJECT_NAME(object_id), name;

PRINT '';
PRINT '✅ DATABASE: SGQ_ISO9001';
PRINT '✅ UTENTE API: sgq_api_user';
PRINT '✅ TABELLE: 9';
PRINT '✅ TRIGGER: 3';
PRINT '✅ STORED PROCEDURES: 1';
PRINT '✅ VIEWS: 1';
PRINT '✅ SEZIONI ISO 9001:2015: 35';
PRINT '';
PRINT '🔐 CREDENZIALI AMMINISTRATORE:';
PRINT '   Email: admin@sgq.local';
PRINT '   Password: Admin2025!';
PRINT '';
PRINT '⚠️  IMPORTANTE: Cambiare la password amministratore in produzione!';
PRINT '';
PRINT '🚀 Prossimi passi:';
PRINT '   1. Configurare backend/.env con le credenziali';
PRINT '   2. Avviare il backend: npm start';
PRINT '   3. Testare endpoint: https://www.fr-busato.it:10443/api/v1/health';
PRINT '';
PRINT '========================================';

GO
