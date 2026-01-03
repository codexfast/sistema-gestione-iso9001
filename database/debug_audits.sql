-- ============================================================================
-- DEBUG: VERIFICA TUTTI GLI AUDIT (senza filtri)
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

PRINT '============================================================================';
PRINT 'DEBUG: TUTTI GLI AUDIT NEL DATABASE (nessun filtro WHERE)';
PRINT '============================================================================';
PRINT '';

-- TUTTI gli audit, anche cancellati
SELECT 
    audit_id,
    audit_number,
    client_name,
    status,
    is_deleted,
    deleted_at,
    total_questions,
    answered_questions,
    created_at
FROM audits
ORDER BY audit_id;

PRINT '';
PRINT '--- CONTEGGIO PER is_deleted ---';
PRINT '';

SELECT 
    is_deleted,
    COUNT(*) as numero_audit
FROM audits
GROUP BY is_deleted;

PRINT '';
PRINT '============================================================================';

GO
