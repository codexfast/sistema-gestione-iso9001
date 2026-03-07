/**
 * Certification Findings Controller
 * Rilievi dell'ente certificatore (ACCREDIA, Bureau Veritas, TÜV, ecc.)
 * Legati all'azienda: persistono tra un audit e l'altro finché non chiusi.
 */
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/companies/:companyId/certification-findings
 * Lista rilievi di un'azienda (filtrabili per status e standard)
 */
async function listFindings(req, res) {
  try {
    const { companyId } = req.params;
    const { organization_id } = req.user;
    const { status, standard_id } = req.query;

    let where = 'company_id=@companyId AND organization_id=@orgId';
    const params = { companyId: parseInt(companyId), orgId: organization_id };

    if (status) { where += ' AND status=@status'; params.status = status; }
    if (standard_id) { where += ' AND standard_id=@standardId'; params.standardId = parseInt(standard_id); }

    const result = await query(
      `SELECT * FROM certification_findings WHERE ${where} ORDER BY status ASC, due_date ASC, created_at DESC`,
      params
    );

    res.json({ success: true, data: result.recordset, count: result.recordset.length });
  } catch (e) {
    logger.error('listFindings error', { error: e.message });
    res.status(500).json({ error: 'Errore nel recupero rilievi', code: 'FINDINGS_LIST_ERROR' });
  }
}

/**
 * POST /api/v1/companies/:companyId/certification-findings
 * Crea nuovo rilievo
 */
async function createFinding(req, res) {
  try {
    const { companyId } = req.params;
    const { organization_id, user_id } = req.user;
    const {
      standard_id = 1, finding_number, finding_type = 'NC',
      clause_ref, description, certifying_body = 'ACCREDIA',
      issue_date, due_date, corrective_action, evidence
    } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Descrizione obbligatoria', code: 'VALIDATION_ERROR' });
    }

    const result = await query(`
      DECLARE @out TABLE (finding_id INT, created_at DATETIME2);
      INSERT INTO certification_findings
        (company_id, organization_id, standard_id, finding_number, finding_type,
         clause_ref, description, certifying_body, issue_date, due_date,
         status, corrective_action, evidence, created_by, created_at, updated_at)
      OUTPUT INSERTED.finding_id, INSERTED.created_at INTO @out
      VALUES
        (@companyId, @orgId, @standardId, @findingNumber, @findingType,
         @clauseRef, @description, @certifyingBody, @issueDate, @dueDate,
         'open', @correctiveAction, @evidence, @userId, GETDATE(), GETDATE());
      SELECT finding_id, created_at FROM @out;
    `, {
      companyId: parseInt(companyId), orgId: organization_id,
      standardId: parseInt(standard_id), findingNumber: finding_number || null,
      findingType: finding_type, clauseRef: clause_ref || null,
      description, certifyingBody: certifying_body,
      issueDate: issue_date || null, dueDate: due_date || null,
      correctiveAction: corrective_action || null,
      evidence: evidence || null, userId: user_id
    });

    const newId = result.recordset[0].finding_id;
    const newFinding = await query(
      'SELECT * FROM certification_findings WHERE finding_id=@id', { id: newId }
    );

    logger.info('Rilievo ente creato', { finding_id: newId, company_id: companyId });
    res.status(201).json({ success: true, data: newFinding.recordset[0] });
  } catch (e) {
    logger.error('createFinding error', { error: e.message });
    res.status(500).json({ error: 'Errore creazione rilievo', code: 'FINDING_CREATE_ERROR' });
  }
}

/**
 * PUT /api/v1/companies/:companyId/certification-findings/:findingId
 * Aggiorna rilievo (azione correttiva, stato, chiusura...)
 */
async function updateFinding(req, res) {
  try {
    const { companyId, findingId } = req.params;
    const { organization_id } = req.user;
    const {
      finding_number, finding_type, clause_ref, description,
      certifying_body, issue_date, due_date, status,
      corrective_action, evidence, closed_date
    } = req.body;

    // Imposta closed_date automaticamente se si chiude
    const resolvedClosedDate = status === 'closed'
      ? (closed_date || new Date().toISOString().split('T')[0])
      : (status === 'open' || status === 'in_progress' ? null : closed_date);

    await query(`
      UPDATE certification_findings SET
        finding_number    = COALESCE(@findingNumber, finding_number),
        finding_type      = COALESCE(@findingType, finding_type),
        clause_ref        = COALESCE(@clauseRef, clause_ref),
        description       = COALESCE(@description, description),
        certifying_body   = COALESCE(@certifyingBody, certifying_body),
        issue_date        = COALESCE(@issueDate, issue_date),
        due_date          = COALESCE(@dueDate, due_date),
        status            = COALESCE(@status, status),
        corrective_action = @correctiveAction,
        evidence          = @evidence,
        closed_date       = @closedDate,
        updated_at        = GETDATE()
      WHERE finding_id=@findingId AND company_id=@companyId AND organization_id=@orgId
    `, {
      findingId: parseInt(findingId), companyId: parseInt(companyId), orgId: organization_id,
      findingNumber: finding_number || null, findingType: finding_type || null,
      clauseRef: clause_ref || null, description: description || null,
      certifyingBody: certifying_body || null, issueDate: issue_date || null,
      dueDate: due_date || null, status: status || null,
      correctiveAction: corrective_action || null,
      evidence: evidence || null, closedDate: resolvedClosedDate || null
    });

    const updated = await query(
      'SELECT * FROM certification_findings WHERE finding_id=@id', { id: parseInt(findingId) }
    );
    if (!updated.recordset.length) {
      return res.status(404).json({ error: 'Rilievo non trovato', code: 'FINDING_NOT_FOUND' });
    }

    res.json({ success: true, data: updated.recordset[0] });
  } catch (e) {
    logger.error('updateFinding error', { error: e.message });
    res.status(500).json({ error: 'Errore aggiornamento rilievo', code: 'FINDING_UPDATE_ERROR' });
  }
}

/**
 * DELETE /api/v1/companies/:companyId/certification-findings/:findingId
 */
async function deleteFinding(req, res) {
  try {
    const { companyId, findingId } = req.params;
    const { organization_id } = req.user;

    await query(
      'DELETE FROM certification_findings WHERE finding_id=@findingId AND company_id=@companyId AND organization_id=@orgId',
      { findingId: parseInt(findingId), companyId: parseInt(companyId), orgId: organization_id }
    );

    logger.info('Rilievo ente eliminato', { finding_id: findingId });
    res.json({ success: true, message: 'Rilievo eliminato' });
  } catch (e) {
    logger.error('deleteFinding error', { error: e.message });
    res.status(500).json({ error: 'Errore eliminazione rilievo', code: 'FINDING_DELETE_ERROR' });
  }
}

module.exports = { listFindings, createFinding, updateFinding, deleteFinding };
