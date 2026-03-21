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

  // Compatibilita' schema: in alcuni ambienti legacy alcune tabelle/colonne
  // non esistono (es. pending_issues.audit_id). Evitiamo errori di compilazione
  // SQL costruendo la lista DELETE solo per oggetti realmente presenti.
  const columnsResult = await query(
    `
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME IN (
        'attachments',
        'audit_responses',
        'audit_custom_checklist_responses',
        'pending_issues',
        'non_conformities',
        'audit_standards',
        'audit_history',
        'audits'
      )
    `
  );

  const hasColumn = (table, column) =>
    columnsResult.recordset.some(
      row => row.TABLE_NAME === table && row.COLUMN_NAME === column
    );

  const deletes = [];
  if (hasColumn('attachments', 'audit_id')) {
    deletes.push('DELETE FROM attachments WHERE audit_id = @audit_id');
  }
  if (hasColumn('audit_responses', 'audit_id')) {
    deletes.push('DELETE FROM audit_responses WHERE audit_id = @audit_id');
  }
  if (hasColumn('audit_custom_checklist_responses', 'audit_id')) {
    deletes.push('DELETE FROM audit_custom_checklist_responses WHERE audit_id = @audit_id');
  }
  if (hasColumn('pending_issues', 'audit_id')) {
    deletes.push('DELETE FROM pending_issues WHERE audit_id = @audit_id');
  }
  if (hasColumn('pending_issues', 'source_audit_id')) {
    deletes.push('DELETE FROM pending_issues WHERE source_audit_id = @audit_id');
  }
  if (hasColumn('non_conformities', 'audit_id')) {
    deletes.push('DELETE FROM non_conformities WHERE audit_id = @audit_id');
  }
  if (hasColumn('audit_standards', 'audit_id')) {
    deletes.push('DELETE FROM audit_standards WHERE audit_id = @audit_id');
  }
  if (hasColumn('audit_history', 'audit_id')) {
    deletes.push('DELETE FROM audit_history WHERE audit_id = @audit_id');
  }

  if (!hasColumn('audits', 'audit_id') || !hasColumn('audits', 'organization_id')) {
    logger.error('[HARD_DELETE] Schema audits non valido: colonne chiave mancanti');
    return false;
  }
  deletes.push('DELETE FROM audits WHERE audit_id = @audit_id AND organization_id = @organization_id');

  for (const stmt of deletes) {
    await query(stmt, { audit_id: auditId, organization_id: organizationId });
  }

  logger.info('[HARD_DELETE] Completato', {
    auditId,
    auditNumber: audit.audit_number,
  });

  return true;
}

module.exports = {
  hardDeleteAudit,
};

