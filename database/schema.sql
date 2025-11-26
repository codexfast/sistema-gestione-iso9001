-- =====================================================
-- Sistema Gestione ISO 9001 - Schema Database
-- SQL Server Express 2022
-- Database: SGQ_ISO9001
-- =====================================================

USE master;
GO

-- Crea database se non esiste
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SGQ_ISO9001')
BEGIN
    CREATE DATABASE SGQ_ISO9001
    COLLATE Latin1_General_100_CI_AS_SC_UTF8;
END
GO

USE SGQ_ISO9001;
GO

-- =====================================================
-- TABELLA: users (utenti sistema)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'auditor', -- admin, auditor, viewer
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        last_login DATETIME2 NULL,
        
        INDEX idx_users_email (email),
        INDEX idx_users_role (role)
    );
END
GO

-- =====================================================
-- TABELLA: audits (audit completi)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audits')
BEGIN
    CREATE TABLE audits (
        audit_id INT IDENTITY(1,1) PRIMARY KEY,
        audit_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE, -- per sync frontend
        audit_number NVARCHAR(50) NOT NULL,
        client_name NVARCHAR(255) NOT NULL,
        project_year INT NOT NULL,
        audit_date DATE NOT NULL,
        auditor_name NVARCHAR(255) NOT NULL,
        audit_type NVARCHAR(50) NOT NULL, -- initial, surveillance, recertification
        status NVARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, completed, archived
        
        -- Informazioni azienda auditata
        company_address NVARCHAR(500) NULL,
        company_vat NVARCHAR(50) NULL,
        company_sector NVARCHAR(255) NULL,
        
        -- Metriche aggregate (denormalizzate per performance)
        total_questions INT NOT NULL DEFAULT 0,
        answered_questions INT NOT NULL DEFAULT 0,
        conformities_count INT NOT NULL DEFAULT 0,
        non_conformities_count INT NOT NULL DEFAULT 0,
        observations_count INT NOT NULL DEFAULT 0,
        completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        
        -- Audit metadata
        created_by INT NOT NULL REFERENCES users(user_id),
        updated_by INT NULL REFERENCES users(user_id),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        completed_at DATETIME2 NULL,
        
        -- Soft delete
        is_deleted BIT NOT NULL DEFAULT 0,
        deleted_at DATETIME2 NULL,
        deleted_by INT NULL REFERENCES users(user_id),
        
        INDEX idx_audits_uuid (audit_uuid),
        INDEX idx_audits_number (audit_number),
        INDEX idx_audits_client (client_name),
        INDEX idx_audits_date (audit_date DESC),
        INDEX idx_audits_status (status),
        INDEX idx_audits_year (project_year DESC),
        INDEX idx_audits_created_by (created_by)
    );
END
GO

-- =====================================================
-- TABELLA: checklist_sections (sezioni ISO 9001:2015)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'checklist_sections')
BEGIN
    CREATE TABLE checklist_sections (
        section_id INT IDENTITY(1,1) PRIMARY KEY,
        section_code NVARCHAR(10) NOT NULL UNIQUE, -- es: "4", "4.1", "8.5.1"
        section_title NVARCHAR(500) NOT NULL,
        section_description NVARTEXT NULL,
        parent_section_code NVARCHAR(10) NULL,
        section_order INT NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        
        INDEX idx_sections_code (section_code),
        INDEX idx_sections_parent (parent_section_code),
        INDEX idx_sections_order (section_order)
    );
END
GO

-- =====================================================
-- TABELLA: checklist_questions (domande audit)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'checklist_questions')
BEGIN
    CREATE TABLE checklist_questions (
        question_id INT IDENTITY(1,1) PRIMARY KEY,
        question_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE,
        section_id INT NOT NULL REFERENCES checklist_sections(section_id),
        question_text NVARTEXT NOT NULL,
        question_order INT NOT NULL,
        is_mandatory BIT NOT NULL DEFAULT 0,
        guidance_notes NVARTEXT NULL,
        iso_reference NVARCHAR(50) NULL, -- riferimento normativo
        is_active BIT NOT NULL DEFAULT 1,
        
        INDEX idx_questions_uuid (question_uuid),
        INDEX idx_questions_section (section_id),
        INDEX idx_questions_order (question_order)
    );
END
GO

-- =====================================================
-- TABELLA: audit_responses (risposte checklist)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_responses')
BEGIN
    CREATE TABLE audit_responses (
        response_id INT IDENTITY(1,1) PRIMARY KEY,
        audit_id INT NOT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
        question_id INT NOT NULL REFERENCES checklist_questions(question_id),
        
        -- Risposta
        conformity_status NVARCHAR(50) NULL, -- C (conforme), NC (non conforme), OBS (osservazione), NA (non applicabile)
        response_notes NVARTEXT NULL,
        is_answered BIT NOT NULL DEFAULT 0,
        
        -- Timestamp
        answered_at DATETIME2 NULL,
        answered_by INT NULL REFERENCES users(user_id),
        
        -- Unique constraint: una risposta per domanda per audit
        CONSTRAINT uq_audit_question UNIQUE (audit_id, question_id),
        
        INDEX idx_responses_audit (audit_id),
        INDEX idx_responses_question (question_id),
        INDEX idx_responses_status (conformity_status)
    );
END
GO

-- =====================================================
-- TABELLA: non_conformities (non conformità rilevate)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'non_conformities')
BEGIN
    CREATE TABLE non_conformities (
        nc_id INT IDENTITY(1,1) PRIMARY KEY,
        nc_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE,
        audit_id INT NOT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
        response_id INT NULL REFERENCES audit_responses(response_id),
        
        -- Dettagli NC
        nc_type NVARCHAR(50) NOT NULL, -- major, minor, observation
        nc_title NVARCHAR(500) NOT NULL,
        nc_description NVARTEXT NOT NULL,
        iso_clause NVARCHAR(50) NOT NULL, -- es: "8.5.1"
        
        -- Azioni correttive
        root_cause NVARTEXT NULL,
        corrective_action NVARTEXT NULL,
        responsible_person NVARCHAR(255) NULL,
        due_date DATE NULL,
        closure_status NVARCHAR(50) NOT NULL DEFAULT 'open', -- open, in_progress, closed, verified
        closure_date DATE NULL,
        closure_notes NVARTEXT NULL,
        
        -- Metadata
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by INT NOT NULL REFERENCES users(user_id),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        INDEX idx_nc_uuid (nc_uuid),
        INDEX idx_nc_audit (audit_id),
        INDEX idx_nc_type (nc_type),
        INDEX idx_nc_status (closure_status),
        INDEX idx_nc_due_date (due_date)
    );
END
GO

-- =====================================================
-- TABELLA: attachments (allegati/evidenze)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'attachments')
BEGIN
    CREATE TABLE attachments (
        attachment_id INT IDENTITY(1,1) PRIMARY KEY,
        attachment_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE,
        
        -- Riferimento (può essere legato a audit, response o NC)
        audit_id INT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
        response_id INT NULL REFERENCES audit_responses(response_id) ON DELETE CASCADE,
        nc_id INT NULL REFERENCES non_conformities(nc_id) ON DELETE CASCADE,
        
        -- Metadati file
        file_name NVARCHAR(500) NOT NULL,
        file_type NVARCHAR(100) NOT NULL, -- image/jpeg, audio/mp3, video/mp4, application/pdf
        file_size_bytes BIGINT NOT NULL,
        mime_type NVARCHAR(100) NOT NULL,
        
        -- Storage
        storage_path NVARCHAR(1000) NOT NULL, -- path relativo sul server
        storage_url NVARCHAR(1000) NULL, -- URL per download (signed)
        
        -- Categorizzazione
        category NVARCHAR(50) NOT NULL, -- photo, audio, video, document, other
        description NVARTEXT NULL,
        
        -- Metadata
        uploaded_by INT NOT NULL REFERENCES users(user_id),
        uploaded_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Soft delete
        is_deleted BIT NOT NULL DEFAULT 0,
        deleted_at DATETIME2 NULL,
        
        INDEX idx_attachments_uuid (attachment_uuid),
        INDEX idx_attachments_audit (audit_id),
        INDEX idx_attachments_response (response_id),
        INDEX idx_attachments_nc (nc_id),
        INDEX idx_attachments_type (file_type),
        INDEX idx_attachments_category (category)
    );
END
GO

-- =====================================================
-- TABELLA: audit_history (log modifiche)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_history')
BEGIN
    CREATE TABLE audit_history (
        history_id INT IDENTITY(1,1) PRIMARY KEY,
        audit_id INT NOT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(user_id),
        action_type NVARCHAR(50) NOT NULL, -- created, updated, completed, deleted, restored
        changed_fields NVARTEXT NULL, -- JSON con campi modificati
        timestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
        ip_address NVARCHAR(45) NULL,
        user_agent NVARCHAR(500) NULL,
        
        INDEX idx_history_audit (audit_id),
        INDEX idx_history_user (user_id),
        INDEX idx_history_timestamp (timestamp DESC)
    );
END
GO

-- =====================================================
-- TABELLA: sync_metadata (per sincronizzazione offline)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sync_metadata')
BEGIN
    CREATE TABLE sync_metadata (
        sync_id INT IDENTITY(1,1) PRIMARY KEY,
        entity_type NVARCHAR(50) NOT NULL, -- audit, response, attachment, nc
        entity_id INT NOT NULL,
        entity_uuid UNIQUEIDENTIFIER NOT NULL,
        last_modified DATETIME2 NOT NULL DEFAULT GETDATE(),
        checksum NVARCHAR(64) NULL, -- SHA256 per conflict detection
        version INT NOT NULL DEFAULT 1,
        
        INDEX idx_sync_entity (entity_type, entity_id),
        INDEX idx_sync_uuid (entity_uuid),
        INDEX idx_sync_modified (last_modified DESC)
    );
END
GO

-- =====================================================
-- TRIGGER: Aggiorna updated_at su modifica
-- =====================================================
CREATE OR ALTER TRIGGER trg_audits_updated
ON audits
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE audits
    SET updated_at = GETDATE()
    WHERE audit_id IN (SELECT audit_id FROM inserted);
END
GO

CREATE OR ALTER TRIGGER trg_nc_updated
ON non_conformities
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE non_conformities
    SET updated_at = GETDATE()
    WHERE nc_id IN (SELECT nc_id FROM inserted);
END
GO

-- =====================================================
-- TRIGGER: Aggiorna metriche audit su inserimento risposta
-- =====================================================
CREATE OR ALTER TRIGGER trg_responses_metrics
ON audit_responses
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Aggiorna metriche per gli audit coinvolti
    WITH AuditMetrics AS (
        SELECT 
            audit_id,
            COUNT(*) as total_questions,
            SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered_questions,
            SUM(CASE WHEN conformity_status = 'C' THEN 1 ELSE 0 END) as conformities_count,
            SUM(CASE WHEN conformity_status = 'NC' THEN 1 ELSE 0 END) as non_conformities_count,
            SUM(CASE WHEN conformity_status = 'OBS' THEN 1 ELSE 0 END) as observations_count
        FROM audit_responses
        WHERE audit_id IN (
            SELECT DISTINCT audit_id FROM inserted
            UNION
            SELECT DISTINCT audit_id FROM deleted
        )
        GROUP BY audit_id
    )
    UPDATE a
    SET 
        a.total_questions = m.total_questions,
        a.answered_questions = m.answered_questions,
        a.conformities_count = m.conformities_count,
        a.non_conformities_count = m.non_conformities_count,
        a.observations_count = m.observations_count,
        a.completion_percentage = CASE 
            WHEN m.total_questions > 0 
            THEN (CAST(m.answered_questions AS DECIMAL(5,2)) / m.total_questions) * 100 
            ELSE 0 
        END
    FROM audits a
    INNER JOIN AuditMetrics m ON a.audit_id = m.audit_id;
END
GO

-- =====================================================
-- STORED PROCEDURE: Inserisci audit completo
-- =====================================================
CREATE OR ALTER PROCEDURE sp_create_audit
    @audit_uuid UNIQUEIDENTIFIER,
    @audit_number NVARCHAR(50),
    @client_name NVARCHAR(255),
    @project_year INT,
    @audit_date DATE,
    @auditor_name NVARCHAR(255),
    @audit_type NVARCHAR(50),
    @created_by INT,
    @audit_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        INSERT INTO audits (
            audit_uuid, audit_number, client_name, project_year,
            audit_date, auditor_name, audit_type, created_by, status
        )
        VALUES (
            @audit_uuid, @audit_number, @client_name, @project_year,
            @audit_date, @auditor_name, @audit_type, @created_by, 'draft'
        );
        
        SET @audit_id = SCOPE_IDENTITY();
        
        -- Log history
        INSERT INTO audit_history (audit_id, user_id, action_type)
        VALUES (@audit_id, @created_by, 'created');
        
        COMMIT TRANSACTION;
        
        SELECT @audit_id as audit_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- =====================================================
-- VIEW: Dashboard audit summary
-- =====================================================
CREATE OR ALTER VIEW vw_audit_dashboard AS
SELECT 
    a.audit_id,
    a.audit_uuid,
    a.audit_number,
    a.client_name,
    a.project_year,
    a.audit_date,
    a.auditor_name,
    a.audit_type,
    a.status,
    a.completion_percentage,
    a.answered_questions,
    a.total_questions,
    a.conformities_count,
    a.non_conformities_count,
    a.observations_count,
    a.created_at,
    a.updated_at,
    u.full_name as created_by_name,
    (SELECT COUNT(*) FROM attachments WHERE audit_id = a.audit_id AND is_deleted = 0) as attachments_count,
    (SELECT COUNT(*) FROM non_conformities WHERE audit_id = a.audit_id) as nc_total_count
FROM audits a
LEFT JOIN users u ON a.created_by = u.user_id
WHERE a.is_deleted = 0;
GO

-- =====================================================
-- INDICI FULL-TEXT per ricerca (opzionale)
-- =====================================================
-- Abilita solo se necessaria ricerca full-text avanzata
-- CREATE FULLTEXT CATALOG ftCatalog AS DEFAULT;
-- CREATE FULLTEXT INDEX ON audits(client_name, company_address) 
--     KEY INDEX PK__audits WITH CHANGE_TRACKING AUTO;

-- =====================================================
-- DATI INIZIALI: Utente admin di default
-- =====================================================
IF NOT EXISTS (SELECT * FROM users WHERE email = 'admin@qsstudio.it')
BEGIN
    -- Password: Admin123! (hash bcrypt)
    -- IMPORTANTE: Cambiare password al primo accesso!
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES (
        'admin@qsstudio.it',
        '$2a$10$rH8qGH.CjZ5hJ5Qo5bZ5O.9O5qZ5O5qZ5O5qZ5O5qZ5O5qZ5O5qZ5', -- placeholder, verrà sostituito dal backend
        'Amministratore Sistema',
        'admin'
    );
END
GO

-- =====================================================
-- DATI INIZIALI: Sezioni ISO 9001:2015
-- =====================================================
IF NOT EXISTS (SELECT * FROM checklist_sections WHERE section_code = '4')
BEGIN
    INSERT INTO checklist_sections (section_code, section_title, section_description, parent_section_code, section_order)
    VALUES
    ('4', 'Contesto dell''organizzazione', 'Comprensione del contesto dell''organizzazione, parti interessate, campo di applicazione SGQ', NULL, 1),
    ('4.1', 'Comprendere l''organizzazione e il suo contesto', 'Fattori interni ed esterni rilevanti', '4', 1),
    ('4.2', 'Comprendere le esigenze e le aspettative delle parti interessate', 'Identificazione parti interessate e requisiti', '4', 2),
    ('4.3', 'Determinare il campo di applicazione del SGQ', 'Ambito di applicazione del sistema', '4', 3),
    ('4.4', 'Sistema di gestione per la qualità e relativi processi', 'Processi, interazioni, informazioni documentate', '4', 4),
    
    ('5', 'Leadership', 'Leadership e impegno della direzione', NULL, 2),
    ('5.1', 'Leadership e impegno', 'Impegno della direzione', '5', 1),
    ('5.2', 'Politica', 'Politica per la qualità', '5', 2),
    ('5.3', 'Ruoli, responsabilità e autorità nell''organizzazione', 'Definizione ruoli e responsabilità', '5', 3),
    
    ('6', 'Pianificazione', 'Pianificazione del SGQ', NULL, 3),
    ('6.1', 'Azioni per affrontare rischi e opportunità', 'Risk-based thinking', '6', 1),
    ('6.2', 'Obiettivi per la qualità e pianificazione per il loro raggiungimento', 'Obiettivi misurabili', '6', 2),
    ('6.3', 'Pianificazione delle modifiche', 'Gestione modifiche al SGQ', '6', 3),
    
    ('7', 'Supporto', 'Risorse, competenze, consapevolezza', NULL, 4),
    ('7.1', 'Risorse', 'Risorse necessarie', '7', 1),
    ('7.2', 'Competenza', 'Competenze del personale', '7', 2),
    ('7.3', 'Consapevolezza', 'Consapevolezza sul SGQ', '7', 3),
    ('7.4', 'Comunicazione', 'Comunicazioni interne ed esterne', '7', 4),
    ('7.5', 'Informazioni documentate', 'Documentazione del SGQ', '7', 5),
    
    ('8', 'Attività operative', 'Pianificazione e controllo operativi', NULL, 5),
    ('8.1', 'Pianificazione e controllo operativi', 'Controllo dei processi', '8', 1),
    ('8.2', 'Requisiti per i prodotti e servizi', 'Determinazione requisiti cliente', '8', 2),
    ('8.3', 'Progettazione e sviluppo di prodotti e servizi', 'Processo di design', '8', 3),
    ('8.4', 'Controllo dei processi, prodotti e servizi forniti dall''esterno', 'Gestione fornitori', '8', 4),
    ('8.5', 'Produzione ed erogazione dei servizi', 'Controllo della produzione', '8', 5),
    ('8.6', 'Rilascio di prodotti e servizi', 'Verifica finale', '8', 6),
    ('8.7', 'Controllo degli output non conformi', 'Gestione non conformità', '8', 7),
    
    ('9', 'Valutazione delle prestazioni', 'Monitoraggio, analisi, valutazione', NULL, 6),
    ('9.1', 'Monitoraggio, misurazione, analisi e valutazione', 'KPI e indicatori', '9', 1),
    ('9.2', 'Audit interno', 'Programma audit interni', '9', 2),
    ('9.3', 'Riesame di direzione', 'Riesame periodico del SGQ', '9', 3),
    
    ('10', 'Miglioramento', 'Non conformità e azioni correttive', NULL, 7),
    ('10.1', 'Generalità', 'Opportunità di miglioramento', '10', 1),
    ('10.2', 'Non conformità e azioni correttive', 'Gestione NC e azioni', '10', 2),
    ('10.3', 'Miglioramento continuo', 'Miglioramento continuo del SGQ', '10', 3);
END
GO

PRINT 'Schema database SGQ_ISO9001 creato con successo!';
PRINT 'Prossimi passi:';
PRINT '1. Esegui questo script su SQL Server Express';
PRINT '2. Crea utente DB per backend API';
PRINT '3. Configura firewall per porta API';
GO
