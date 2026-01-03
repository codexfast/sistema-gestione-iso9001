-- ============================================================================
-- VERIFICA CONTENUTO TABELLA dbo.audits
-- ============================================================================
-- Mostra tutti gli audit presenti nel database con tutte le colonne
-- ============================================================================

USE SGQ_ISO9001;
GO

SET NOCOUNT ON;

PRINT '============================================================================';
PRINT 'CONTENUTO TABELLA: dbo.audits';
PRINT '============================================================================';
PRINT '';

-- Tutti gli audit NON cancellati
SELECT 
    audit_id,
    audit_uuid,
    audit_number,
    client_name,
    project_year,
    audit_date,
    auditor_name,
    audit_type,
    status,
    total_questions,
    answered_questions,
    conformities_count,
    non_conformities_count,
    completion_percentage,
    CAST(notes AS NVARCHAR(100)) as notes_preview,
    is_deleted,
    deleted_at,
    created_by,
    created_at,
    updated_at,
    standard_id,
    organization_id
FROM audits
WHERE is_deleted = 0
ORDER BY audit_date DESC, audit_number DESC;

PRINT '';
PRINT '--- RIEPILOGO ---';
PRINT '';

SELECT 
    COUNT(*) as totale_audit,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as bozze,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completati,
    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archiviati,
    AVG(completion_percentage) as media_completamento,
    SUM(answered_questions) as totale_risposte,
    SUM(conformities_count) as totale_conformi,
    SUM(non_conformities_count) as totale_nc
FROM audits
WHERE is_deleted = 0;

PRINT '';
PRINT '============================================================================';
PRINT 'COSA DOVREBBE CONTENERE:';
PRINT '============================================================================';
PRINT '- audit_number: codice univoco audit (es: 2025-01)';
PRINT '- client_name: nome cliente/azienda auditata';
PRINT '- audit_date: data esecuzione audit';
PRINT '- auditor_name: nome auditor responsabile';
PRINT '- status: draft/completed/archived';
PRINT '- total_questions: 78 per ISO 9001 (standard_id=1)';
PRINT '- answered_questions: numero risposte salvate (max 78)';
PRINT '- conformities_count: numero risposte C (conformi)';
PRINT '- non_conformities_count: numero risposte NC';
PRINT '- completion_percentage: (answered_questions / total_questions) * 100';
PRINT '- standard_id: 1 = ISO 9001, 2 = ISO 14001, 3 = ISO 45001';
PRINT '- organization_id: tenant isolation (multi-tenant)';
PRINT '============================================================================';

GO
