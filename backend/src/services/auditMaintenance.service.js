const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Hard delete di un audit e di tutti i dati collegati.
 * ATTENZIONE: distruttivo. Usare solo per audit di test/draft o con permessi admin.
 *
 * @param {number} auditId
 * @param {number} organizationId
 */
async function hardDeleteAudit(auditId, organizationId) {
  logger.info('[HARD_DELETE] Inizio hard delete audit', { auditId, organizationId });

  const existing = await query(
    `
      SELECT audit_id, audit_number, status
      FROM audits
      WHERE audit_id = @audit_id AND organization_id = @organization_id
    `,
    { audit_id: auditId, organization_id: organizationId }
  );

  if (existing.recordset.length === 0) {
    logger.warn('[HARD_DELETE] Audit non trovato o non appartiene all\'org', {
      auditId,
      organizationId,
    });
    return false;
  }

  const audit = existing.recordset[0];

  await query(
    `
      DELETE FROM attachments WHERE audit_id = @audit_id;
      DELETE FROM audit_responses WHERE audit_id = @audit_id;
      DELETE FROM audit_custom_checklist_responses WHERE audit_id = @audit_id;
      DELETE FROM pending_issues WHERE audit_id = @audit_id;
      DELETE FROM non_conformities WHERE audit_id = @audit_id;
      DELETE FROM audit_standards WHERE audit_id = @audit_id;
      IF OBJECT_ID('audit_history', 'U') IS NOT NULL
        DELETE FROM audit_history WHERE audit_id = @audit_id;
      DELETE FROM audits WHERE audit_id = @audit_id AND organization_id = @organization_id;
    `,
    { audit_id: auditId, organization_id: organizationId }
  );

  logger.info('[HARD_DELETE] Completato', {
    auditId,
    auditNumber: audit.audit_number,
  });

  return true;
}

module.exports = {
  hardDeleteAudit,
};

