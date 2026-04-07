-- Migration 029: Document Registry — registro universale documenti SGQ
-- Data: 2026-04-05
-- Puramente additiva: nessuna modifica a tabelle esistenti.
-- Compatibile con tutti i sistemi normativi (ISO 9001/14001/45001/3834).
-- Idempotente: sicura da rieseguire.

IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE name = 'document_registry' AND type = 'U'
)
BEGIN
    CREATE TABLE document_registry (
        id                    INT IDENTITY(1,1) NOT NULL,
        -- Tenant isolation
        organization_id       INT            NOT NULL,
        company_id            INT            NULL,
        auditor_org_id        INT            NULL,
        -- Norma di riferimento (nullable per documenti generici)
        standard_id           INT            NULL,
        clause_ref            NVARCHAR(30)   NULL,
        -- Identificazione documento
        doc_type              NVARCHAR(50)   NOT NULL,
        doc_code              NVARCHAR(100)  NULL,
        title                 NVARCHAR(500)  NOT NULL,
        revision              NVARCHAR(20)   NULL,
        status                NVARCHAR(30)   NOT NULL
            CONSTRAINT CK_doc_registry_status
            CHECK (status IN (
                'vigente','in_revisione','obsoleto','in_approvazione'
            )),
        -- Date
        issue_date            DATE           NULL,
        expiry_date           DATE           NULL,
        -- Responsabilita
        responsible           NVARCHAR(255)  NULL,
        retention_years       INT            NULL,
        -- File allegato (PDF originale in tabella attachments)
        attachment_id         INT            NULL,
        -- Importazione AI
        import_status         NVARCHAR(20)   NOT NULL DEFAULT 'active'
            CONSTRAINT CK_doc_registry_import_status
            CHECK (import_status IN ('ai_draft','verified','active')),
        extraction_confidence DECIMAL(3,2)   NULL,
        notes                 NVARCHAR(MAX)  NULL,
        -- Audit trail
        created_by            INT            NULL,
        created_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_document_registry PRIMARY KEY (id)
    );
    PRINT 'Tabella document_registry creata.';
END
ELSE
    PRINT 'Tabella document_registry gia esistente — skip.';
GO

-- Foreign keys (idempotenti)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_doc_registry_organization')
    ALTER TABLE document_registry
    ADD CONSTRAINT FK_doc_registry_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_doc_registry_company')
    ALTER TABLE document_registry
    ADD CONSTRAINT FK_doc_registry_company
        FOREIGN KEY (company_id) REFERENCES companies(id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_doc_registry_auditor_org')
    ALTER TABLE document_registry
    ADD CONSTRAINT FK_doc_registry_auditor_org
        FOREIGN KEY (auditor_org_id) REFERENCES auditor_orgs(id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_doc_registry_standard')
    ALTER TABLE document_registry
    ADD CONSTRAINT FK_doc_registry_standard
        FOREIGN KEY (standard_id) REFERENCES standards(standard_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_doc_registry_attachment')
    ALTER TABLE document_registry
    ADD CONSTRAINT FK_doc_registry_attachment
        FOREIGN KEY (attachment_id) REFERENCES attachments(attachment_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_doc_registry_created_by')
    ALTER TABLE document_registry
    ADD CONSTRAINT FK_doc_registry_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id);
GO

-- Indici per performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'IX_doc_registry_org_company'
    AND object_id = OBJECT_ID('document_registry'))
    CREATE INDEX IX_doc_registry_org_company
        ON document_registry (organization_id, company_id, status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'IX_doc_registry_expiry'
    AND object_id = OBJECT_ID('document_registry'))
    CREATE INDEX IX_doc_registry_expiry
        ON document_registry (expiry_date, status)
        WHERE expiry_date IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'IX_doc_registry_type_status'
    AND object_id = OBJECT_ID('document_registry'))
    CREATE INDEX IX_doc_registry_type_status
        ON document_registry (organization_id, doc_type, status);
GO

PRINT 'Migration 029 completata.';
GO
