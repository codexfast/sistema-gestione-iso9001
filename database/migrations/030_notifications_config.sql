-- Migration 030: Notifications Config — configurazione alert email per organizzazione
-- Data: 2026-04-10
-- Puramente additiva: nessuna modifica a tabelle esistenti.
-- Idempotente: sicura da rieseguire.

IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE name = 'notifications_config' AND type = 'U'
)
BEGIN
    CREATE TABLE notifications_config (
        id                  INT IDENTITY(1,1) NOT NULL,
        organization_id     INT            NOT NULL,
        -- Destinatari email (separati da virgola)
        recipients_email    NVARCHAR(1000) NOT NULL,
        -- Soglie alert (giorni prima della scadenza)
        alert_days_1        INT            NOT NULL DEFAULT 30,
        alert_days_2        INT            NOT NULL DEFAULT 7,
        -- Orario invio giornaliero (formato HH:MM, default 08:00)
        send_time           NVARCHAR(5)    NOT NULL DEFAULT '08:00',
        -- Tipi di alert abilitati
        alert_doc_expiry    BIT            NOT NULL DEFAULT 1,
        alert_nc_open       BIT            NOT NULL DEFAULT 1,
        alert_qualif_expiry BIT            NOT NULL DEFAULT 1,
        -- Stato
        enabled             BIT            NOT NULL DEFAULT 1,
        -- Audit trail
        created_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_notifications_config PRIMARY KEY (id),
        CONSTRAINT UQ_notifications_config_org UNIQUE (organization_id)
    );
    PRINT 'Tabella notifications_config creata.';
END
ELSE
    PRINT 'Tabella notifications_config gia esistente — skip.';
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_notifications_config_org')
    ALTER TABLE notifications_config
    ADD CONSTRAINT FK_notifications_config_org
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id);
GO

PRINT 'Migration 030 completata.';
GO
