/**
 * Migration 018 - CREATE TABLE pending_issues
 * Rilievi pendenti (NC/OSS) da trasportare in audit successivi (Re-Audit)
 * 
 * SAFE TO RUN MULTIPLE TIMES: usa IF NOT EXISTS
 * 
 * ISO 9001:2015 - 10.2: Non conformità e azioni correttive
 * Traccia: quali rilievi dell'audit precedente sono stati risolti nel nuovo audit
 */

USE SGQ_ISO9001;
GO

-- ============================================================
-- 1. Crea tabella pending_issues
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'pending_issues'
)
BEGIN
    CREATE TABLE [dbo].[pending_issues] (
        -- PK
        [issue_id]          INT IDENTITY(1,1)   NOT NULL,

        -- Audit di DESTINAZIONE (il nuovo re-audit in cui appare il rilievo)
        [target_audit_id]   INT                 NOT NULL,

        -- Audit di ORIGINE (l'audit precedente da cui viene il rilievo)
        [source_audit_id]   INT                 NOT NULL,

        -- Domanda checklist a cui è collegato il rilievo
        [question_id]       INT                 NOT NULL,

        -- Risposta originale (snapshot al momento del re-audit)
        [source_response_id] INT                NULL,    -- FK → audit_responses (risposta originale)

        -- Status del rilievo nel nuovo audit
        -- open      = rilievo portato avanti, non ancora valutato
        -- resolved  = rilievo risolto nel nuovo audit
        -- persists  = rilievo ancora presente (NC → NC)
        [status]            NVARCHAR(20)        NOT NULL
                            CONSTRAINT [DF_pending_issues_status] DEFAULT 'open'
                            CONSTRAINT [CK_pending_issues_status]
                            CHECK ([status] IN ('open', 'resolved', 'persists')),

        -- Tipo di rilievo originale (per display)
        [original_status]   NVARCHAR(10)        NOT NULL
                            CONSTRAINT [CK_pending_issues_original_status]
                            CHECK ([original_status] IN ('NC', 'OSS', 'OM')),

        -- Note sulla risoluzione (opzionale)
        [resolution_notes]  NVARCHAR(MAX)       NULL,

        -- Isolamento multi-tenant
        [organization_id]   INT                 NOT NULL,

        -- Audit trail
        [created_at]        DATETIME2           NOT NULL
                            CONSTRAINT [DF_pending_issues_created_at] DEFAULT GETDATE(),
        [updated_at]        DATETIME2           NOT NULL
                            CONSTRAINT [DF_pending_issues_updated_at] DEFAULT GETDATE(),

        -- PK
        CONSTRAINT [PK_pending_issues] PRIMARY KEY CLUSTERED ([issue_id])
    );

    PRINT '✅ Tabella pending_issues creata';
END
ELSE
BEGIN
    PRINT '⏭️  Tabella pending_issues già presente - skip';
END
GO

-- ============================================================
-- 2. Foreign Keys
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_pending_issues_target_audit')
BEGIN
    ALTER TABLE [dbo].[pending_issues]
    ADD CONSTRAINT [FK_pending_issues_target_audit]
    FOREIGN KEY ([target_audit_id]) REFERENCES [dbo].[audits]([audit_id])
    ON DELETE CASCADE;  -- Se audit eliminato → elimina pending associati

    PRINT '✅ FK target_audit_id aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_pending_issues_source_audit')
BEGIN
    ALTER TABLE [dbo].[pending_issues]
    ADD CONSTRAINT [FK_pending_issues_source_audit]
    FOREIGN KEY ([source_audit_id]) REFERENCES [dbo].[audits]([audit_id]);
    -- NO CASCADE: audit sorgente non deve eliminare i pending del nuovo audit

    PRINT '✅ FK source_audit_id aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_pending_issues_question')
BEGIN
    ALTER TABLE [dbo].[pending_issues]
    ADD CONSTRAINT [FK_pending_issues_question]
    FOREIGN KEY ([question_id]) REFERENCES [dbo].[checklist_questions]([question_id]);

    PRINT '✅ FK question_id aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_pending_issues_source_response')
BEGIN
    ALTER TABLE [dbo].[pending_issues]
    ADD CONSTRAINT [FK_pending_issues_source_response]
    FOREIGN KEY ([source_response_id]) REFERENCES [dbo].[audit_responses]([response_id])
    ON DELETE NO ACTION;  -- SET NULL causerebbe cascade cycle con FK_pending_issues_target_audit (CASCADE)

    PRINT '✅ FK source_response_id aggiunta';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_pending_issues_organization')
BEGIN
    ALTER TABLE [dbo].[pending_issues]
    ADD CONSTRAINT [FK_pending_issues_organization]
    FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations]([organization_id]);

    PRINT '✅ FK organization_id aggiunta';
END
GO

-- ============================================================
-- 3. Indici per query frequenti
-- ============================================================

-- Indice per GET /audits/:id/pending-issues (carica rilievi nel target audit)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_pending_issues_target_audit')
BEGIN
    CREATE INDEX [IX_pending_issues_target_audit]
    ON [dbo].[pending_issues] ([target_audit_id], [status]);
    PRINT '✅ Indice IX_pending_issues_target_audit creato';
END
GO

-- Indice per controllo "quanti pending ha il client X?" (check-reaudit)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_pending_issues_source_audit')
BEGIN
    CREATE INDEX [IX_pending_issues_source_audit]
    ON [dbo].[pending_issues] ([source_audit_id], [status]);
    PRINT '✅ Indice IX_pending_issues_source_audit creato';
END
GO

-- ============================================================
-- VERIFICA FINALE
-- ============================================================
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pending_issues'
ORDER BY ORDINAL_POSITION;
GO

PRINT '';
PRINT '=== Migration 018 completata ===';
