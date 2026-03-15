-- ============================================================
-- Migration 026: Template "Verbale visita" per checklist custom
-- Phase 7 - Report Word per audit con checklist personalizzate
-- Data: 2026-03-15
-- ============================================================
-- Usa lo stesso file ISO9001-audit-report.docx (CHECKLIST_MARKER, RILIEVI_MARKER)
-- Il contenuto iniettato sarà diverso (OOXML custom checklist)
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM report_templates WHERE organization_id IS NULL AND standard_key = 'custom_checklist')
BEGIN
    INSERT INTO report_templates (organization_id, name, scope, standard_key, file_path, is_system, created_at, updated_at)
    VALUES (NULL, 'Verbale visita (checklist custom)', 'audit', 'custom_checklist', '/templates/VerbaleVisita-generic.docx', 1, GETDATE(), GETDATE());
    PRINT 'Template Verbale visita (custom_checklist) inserito';
END
ELSE
    PRINT 'Template Verbale visita gia presente';
