/**
 * Report Template Service
 * Helper per risoluzione template: organization_id + standard_id/custom_checklist_id -> report_template
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/** Mappa standard_id -> standard_key per template di sistema */
const STANDARD_KEY_MAP = {
  1: 'ISO_9001',
  2: 'ISO_14001',
  3: 'ISO_45001',
  4: 'ISO_3834_2',
  5: 'ISO_3834_2',
  6: 'ISO_3834_2',
  7: 'ISO_3834_2', // RDP_MSN usa template 3834
};

/**
 * Risolve quale template usare per (organization_id, standard_id, custom_checklist_id)
 * 1. Cerca in report_template_assignments
 * 2. Se non trovato e standard_id: cerca template di sistema con standard_key
 * 3. Fallback: template default
 *
 * @param {number} organizationId
 * @param {number|null} standardId
 * @param {number|null} customChecklistId
 * @returns {Promise<{id: number, file_path: string, name: string}>}
 */
async function getReportTemplate(organizationId, standardId, customChecklistId) {
  // 1. Cerca assegnazione
  if (standardId) {
    const assign = await query(
      `SELECT rta.report_template_id, rt.file_path, rt.name
       FROM report_template_assignments rta
       JOIN report_templates rt ON rta.report_template_id = rt.id
       WHERE rta.organization_id = @organization_id AND rta.standard_id = @standard_id`,
      { organization_id: organizationId, standard_id: standardId }
    );
    if (assign.recordset.length > 0) {
      const r = assign.recordset[0];
      return { id: r.report_template_id, file_path: r.file_path, name: r.name };
    }
  }

  if (customChecklistId) {
    const assign = await query(
      `SELECT rta.report_template_id, rt.file_path, rt.name
       FROM report_template_assignments rta
       JOIN report_templates rt ON rta.report_template_id = rt.id
       WHERE rta.organization_id = @organization_id AND rta.custom_checklist_id = @custom_checklist_id`,
      { organization_id: organizationId, custom_checklist_id: customChecklistId }
    );
    if (assign.recordset.length > 0) {
      const r = assign.recordset[0];
      return { id: r.report_template_id, file_path: r.file_path, name: r.name };
    }
  }

  // 2. Template di sistema per standard
  const standardKey = standardId ? STANDARD_KEY_MAP[standardId] || 'default' : 'default';
  const sysTemplate = await query(
    `SELECT TOP 1 id, file_path, name FROM report_templates
     WHERE organization_id IS NULL AND scope = 'audit'
       AND (standard_key = @standard_key OR standard_key = 'default')
     ORDER BY CASE WHEN standard_key = @standard_key THEN 0 ELSE 1 END`,
    { standard_key: standardKey }
  );

  if (sysTemplate.recordset.length > 0) {
    const r = sysTemplate.recordset[0];
    return { id: r.id, file_path: r.file_path, name: r.name };
  }

  throw new Error('Nessun template report configurato');
}

module.exports = { getReportTemplate, STANDARD_KEY_MAP };
