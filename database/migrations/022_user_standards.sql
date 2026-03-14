-- ============================================================================
-- Migration 022: Tabella user_standards (assegnazione standard per utente)
-- ============================================================================
-- Descrizione:
--   Consente di limitare quali standard ISO ogni auditor può usare.
--   - Se un utente non ha righe in user_standards → vede tutti gli standard (retrocompatibilità).
--   - Se ha righe → può auditare solo gli standard assegnati.
--   Admin assegna tramite API PUT /admin/users/:id/standards o UI Gestione utenti.
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_standards')
BEGIN
    CREATE TABLE dbo.user_standards (
        user_id     INT NOT NULL,
        standard_id INT NOT NULL,
        created_at  DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_user_standards PRIMARY KEY CLUSTERED (user_id, standard_id),
        CONSTRAINT FK_user_standards_user
            FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
        CONSTRAINT FK_user_standards_standard
            FOREIGN KEY (standard_id) REFERENCES dbo.standards(standard_id)
    );

    CREATE NONCLUSTERED INDEX IX_user_standards_user
        ON dbo.user_standards(user_id);
    CREATE NONCLUSTERED INDEX IX_user_standards_standard
        ON dbo.user_standards(standard_id);

    PRINT '  ✅ Tabella user_standards creata';
END
ELSE
    PRINT '  ⚠️  user_standards già esistente';

GO
