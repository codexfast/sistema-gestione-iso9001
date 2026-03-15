/**
 * Report Template Controller
 * API per catalogo template e assegnazioni (Phase 2 roadmap)
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const { getReportTemplate } = require('../services/reportTemplate.service');

/**
 * GET /api/v1/report-templates?scope=audit
 * Lista template disponibili per l'org (sistema + org)
 */
async function listTemplates(req, res) {
  try {
    const { scope = 'audit' } = req.query;
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT id, organization_id, name, scope, standard_key, file_path, is_system, created_at
       FROM report_templates
       WHERE scope = @scope AND (organization_id IS NULL OR organization_id = @organization_id)
       ORDER BY CASE WHEN organization_id IS NULL THEN 0 ELSE 1 END, standard_key`,
      { scope, organization_id: organizationId }
    );

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('listTemplates error', { error: err.message });
    res.status(500).json({ error: 'Errore recupero template', code: 'REPORT_TEMPLATES_LIST_ERROR' });
  }
}

/**
 * POST /api/v1/report-templates
 * Upload template .docx per l'organizzazione
 * Solo admin/auditor
 */
async function uploadTemplate(req, res) {
  try {
    const { organization_id, role } = req.user;
    if (!['admin', 'auditor'].includes(role)) {
      return res.status(403).json({ error: 'Solo admin/auditor possono caricare template', code: 'FORBIDDEN' });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'File .docx richiesto', code: 'MISSING_FILE' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.docx') {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Solo file .docx consentiti', code: 'INVALID_FILE_TYPE' });
    }

    const name = req.body.name || path.basename(req.file.originalname, '.docx');
    const scope = req.body.scope || 'audit';
    const standardKey = req.body.standard_key || null;

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    let relPath = path.relative(path.resolve(uploadDir), req.file.path).replace(/\\/g, '/');
    relPath = '/uploads/' + relPath;

    const ins = await query(
      `INSERT INTO report_templates (organization_id, name, scope, standard_key, file_path, is_system, created_at, updated_at)
       OUTPUT INSERTED.id, INSERTED.file_path, INSERTED.name
       VALUES (@organization_id, @name, @scope, @standard_key, @file_path, 0, GETDATE(), GETDATE())`,
      {
        organization_id,
        name,
        scope,
        standard_key: standardKey,
        file_path: relPath,
      }
    );

    const row = ins.recordset[0];
    logger.info('Report template uploaded', { id: row.id, org: organization_id });

    res.status(201).json({
      success: true,
      data: { id: row.id, file_path: row.file_path, name: row.name },
    });
  } catch (err) {
    logger.error('uploadTemplate error', { error: err.message });
    res.status(500).json({ error: 'Errore upload template', code: 'REPORT_TEMPLATE_UPLOAD_ERROR' });
  }
}

/**
 * PUT /api/v1/report-template-assignments/standard/:standardId
 * Assegna template a standard per l'org
 * Body: { report_template_id }
 */
async function assignTemplateToStandard(req, res) {
  try {
    const { standardId } = req.params;
    const { report_template_id } = req.body;
    const organizationId = req.user.organization_id;

    if (!report_template_id) {
      return res.status(400).json({ error: 'report_template_id richiesto', code: 'MISSING_TEMPLATE_ID' });
    }

    const stdId = parseInt(standardId, 10);
    const templateId = parseInt(report_template_id, 10);
    if (isNaN(stdId) || isNaN(templateId)) {
      return res.status(400).json({ error: 'standardId e report_template_id devono essere numeri', code: 'INVALID_ID' });
    }

    const params = { organization_id: organizationId, standard_id: stdId, report_template_id: templateId };
    await query(
      `DELETE FROM report_template_assignments
       WHERE organization_id = @organization_id AND standard_id = @standard_id AND custom_checklist_id IS NULL`,
      params
    );
    await query(
      `INSERT INTO report_template_assignments (organization_id, standard_id, custom_checklist_id, report_template_id)
       VALUES (@organization_id, @standard_id, NULL, @report_template_id)`,
      params
    );

    logger.info('Template assigned to standard', { org: organizationId, standardId: stdId, templateId });

    res.json({ success: true, message: 'Assegnazione salvata' });
  } catch (err) {
    logger.error('assignTemplateToStandard error', { error: err.message });
    res.status(500).json({ error: 'Errore assegnazione template', code: 'ASSIGN_TEMPLATE_ERROR' });
  }
}

/**
 * GET /api/v1/report-templates/resolve?standardId=1
 * Risolve quale template usare per standard_id + organization_id
 * Usato dal frontend prima di generare report
 */
async function resolveTemplate(req, res) {
  try {
    const { standardId } = req.query;
    const organizationId = req.user.organization_id;

    const stdId = standardId ? parseInt(standardId, 10) : null;
    const template = await getReportTemplate(organizationId, stdId, null);

    res.json({ success: true, data: template });
  } catch (err) {
    logger.error('resolveTemplate error', { error: err.message });
    res.status(500).json({ error: 'Errore risoluzione template', code: 'RESOLVE_TEMPLATE_ERROR' });
  }
}

module.exports = {
  listTemplates,
  uploadTemplate,
  assignTemplateToStandard,
  resolveTemplate,
};
