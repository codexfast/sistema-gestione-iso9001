/**
 * Non-Conformities Controller
 * Gestisce il workflow completo delle non conformità (NC)
 * 
 * Stati NC: open → in_progress → resolved → verified → closed
 * Severità: major (grave), minor (lieve), observation (osservazione)
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/non-conformities
 * Lista NC con filtri
 * 
 * Query params:
 * - audit_id: filter by audit
 * - status: filter by status (open, in_progress, resolved, verified, closed)
 * - severity: filter by severity (major, minor, observation)
 * - overdue: true/false (scadute)
 * - page: pagination (default 1)
 * - limit: items per page (default 50)
 */
async function listNonConformities(req, res) {
    try {
        const { organization_id } = req.user;
        const {
            audit_id,
            status,
            severity,
            overdue,
            page = 1,
            limit = 50
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause dinamicamente
        let whereConditions = ['a.organization_id = @organization_id'];
        let params = { organization_id, limit: parseInt(limit), offset };

        if (audit_id) {
            whereConditions.push('nc.audit_id = @audit_id');
            params.audit_id = parseInt(audit_id);
        }

        if (status) {
            whereConditions.push('nc.status = @status');
            params.status = status;
        }

        if (severity) {
            whereConditions.push('nc.severity = @severity');
            params.severity = severity;
        }

        if (overdue === 'true') {
            whereConditions.push('nc.due_date < CAST(GETDATE() AS DATE)');
            whereConditions.push('nc.status NOT IN (\'closed\', \'verified\')');
        }

        const whereClause = whereConditions.join(' AND ');

        // Query principale
        const result = await query(`
      SELECT 
        nc.*,
        a.audit_number,
        a.client_name,
        cs.section_title,
        (SELECT COUNT(*) FROM attachments WHERE nc_id = nc.nc_id) AS attachments_count,
        CASE 
          WHEN nc.due_date < CAST(GETDATE() AS DATE) AND nc.status NOT IN ('closed', 'verified') 
          THEN 1 
          ELSE 0 
        END AS is_overdue
      FROM non_conformities nc
      INNER JOIN audits a ON nc.audit_id = a.audit_id
      INNER JOIN checklist_sections cs ON nc.section_code = cs.section_code
      WHERE ${whereClause}
      ORDER BY 
        CASE nc.severity WHEN 'major' THEN 1 WHEN 'minor' THEN 2 ELSE 3 END,
        nc.created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `, params);

        // Count totale
        const countResult = await query(`
      SELECT COUNT(*) AS total
      FROM non_conformities nc
      INNER JOIN audits a ON nc.audit_id = a.audit_id
      WHERE ${whereClause}
    `, params);

        const total = countResult.recordset[0].total;

        logger.info('NC list retrieved', {
            organization_id,
            count: result.recordset.length,
            filters: { audit_id, status, severity, overdue }
        });

        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error listing NC', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il recupero delle non conformità',
            code: 'NC_LIST_ERROR'
        });
    }
}

/**
 * GET /api/v1/non-conformities/:id
 * Dettagli singola NC
 */
async function getNonConformityById(req, res) {
    try {
        const { id } = req.params;
        const { organization_id } = req.user;

        const result = await query(`
      SELECT 
        nc.*,
        a.audit_number,
        a.audit_uuid,
        a.client_name,
        a.audit_date,
        cs.section_title,
        (SELECT COUNT(*) FROM attachments WHERE nc_id = nc.nc_id) AS attachments_count,
        CASE 
          WHEN nc.due_date < CAST(GETDATE() AS DATE) AND nc.status NOT IN ('closed', 'verified') 
          THEN 1 
          ELSE 0 
        END AS is_overdue
      FROM non_conformities nc
      INNER JOIN audits a ON nc.audit_id = a.audit_id
      INNER JOIN checklist_sections cs ON nc.section_code = cs.section_code
      WHERE nc.nc_id = @id AND a.organization_id = @organization_id
    `, { id: parseInt(id), organization_id });

        if (result.recordset.length === 0) {
            return res.status(404).json({
                error: 'Non conformità non trovata',
                code: 'NC_NOT_FOUND'
            });
        }

        const nc = result.recordset[0];

        // Recupera allegati
        const attachmentsResult = await query(`
      SELECT 
        attachment_id,
        attachment_uuid,
        file_name,
        file_type,
        file_size,
        mime_type,
        category,
        description,
        created_at
      FROM attachments
      WHERE nc_id = @id
      ORDER BY created_at DESC
    `, { id: parseInt(id) });

        nc.attachments = attachmentsResult.recordset;

        logger.info('NC retrieved', { nc_id: id, organization_id });

        res.json({
            success: true,
            data: nc
        });

    } catch (error) {
        logger.error('Error getting NC', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il recupero della non conformità',
            code: 'NC_GET_ERROR'
        });
    }
}

/**
 * POST /api/v1/non-conformities
 * Crea nuova NC
 * 
 * Body:
 * {
 *   audit_id: number (REQUIRED),
 *   nc_number: string (REQUIRED, unique),
 *   section_code: string (REQUIRED, es. "4.1"),
 *   description: string (REQUIRED),
 *   severity: 'major' | 'minor' | 'observation' (REQUIRED),
 *   responsible_person?: string,
 *   due_date?: date,
 *   corrective_action?: string
 * }
 */
async function createNonConformity(req, res) {
    try {
        const { organization_id } = req.user;
        const {
            audit_id,
            nc_number,
            section_code,
            description,
            severity,
            responsible_person,
            due_date,
            corrective_action
        } = req.body;

        // Validazione campi obbligatori
        if (!audit_id || !nc_number || !section_code || !description || !severity) {
            return res.status(400).json({
                error: 'Campi obbligatori mancanti',
                code: 'VALIDATION_ERROR',
                required: ['audit_id', 'nc_number', 'section_code', 'description', 'severity']
            });
        }

        // Verifica severity valida
        if (!['major', 'minor', 'observation'].includes(severity)) {
            return res.status(400).json({
                error: 'Severità non valida',
                code: 'VALIDATION_ERROR',
                allowed: ['major', 'minor', 'observation']
            });
        }

        // Verifica che audit appartenga all'organizzazione
        const auditCheck = await query(`
      SELECT audit_id FROM audits
      WHERE audit_id = @audit_id AND organization_id = @organization_id AND is_deleted = 0
    `, { audit_id: parseInt(audit_id), organization_id });

        if (auditCheck.recordset.length === 0) {
            return res.status(404).json({
                error: 'Audit non trovato',
                code: 'AUDIT_NOT_FOUND'
            });
        }

        // Recupera il primo standard_id dalla junction table audit_standards
        const standardResult = await query(`
      SELECT TOP 1 standard_id FROM audit_standards
      WHERE audit_id = @audit_id
    `, { audit_id: parseInt(audit_id) });

        if (standardResult.recordset.length === 0) {
            return res.status(400).json({
                error: 'Audit non ha standard associati',
                code: 'NO_STANDARDS_FOUND'
            });
        }

        const standard_id = standardResult.recordset[0].standard_id;

        // Verifica unicità nc_number
        const existingNC = await query(`
      SELECT nc_id FROM non_conformities WHERE nc_number = @nc_number
    `, { nc_number });

        if (existingNC.recordset.length > 0) {
            return res.status(409).json({
                error: 'Numero NC già esistente',
                code: 'NC_NUMBER_DUPLICATE'
            });
        }

        // Crea NC
        const result = await query(`
      INSERT INTO non_conformities (
        audit_id,
        standard_id,
        nc_number,
        section_code,
        description,
        severity,
        responsible_person,
        due_date,
        corrective_action,
        status,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.nc_id, INSERTED.nc_uuid
      VALUES (
        @audit_id,
        @standard_id,
        @nc_number,
        @section_code,
        @description,
        @severity,
        @responsible_person,
        @due_date,
        @corrective_action,
        'open',
        GETDATE(),
        GETDATE()
      )
    `, {
            audit_id: parseInt(audit_id),
            standard_id: parseInt(standard_id),
            nc_number,
            section_code,
            description,
            severity,
            responsible_person: responsible_person || null,
            due_date: due_date || null,
            corrective_action: corrective_action || null
        });

        const newNC = result.recordset[0];

        // Aggiorna contatore NC nell'audit
        await query(`
      UPDATE audits
      SET non_conformities_count = (
        SELECT COUNT(*) FROM non_conformities WHERE audit_id = @audit_id
      ),
      updated_at = GETDATE()
      WHERE audit_id = @audit_id
    `, { audit_id: parseInt(audit_id) });

        logger.info('NC created', {
            nc_id: newNC.nc_id,
            audit_id,
            organization_id,
            severity
        });

        res.status(201).json({
            success: true,
            data: {
                nc_id: newNC.nc_id,
                nc_uuid: newNC.nc_uuid,
                nc_number,
                status: 'open'
            }
        });

    } catch (error) {
        logger.error('Error creating NC', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante la creazione della non conformità',
            code: 'NC_CREATE_ERROR'
        });
    }
}

/**
 * PUT /api/v1/non-conformities/:id
 * Aggiorna NC esistente
 * 
 * Body: campi opzionali da aggiornare
 */
async function updateNonConformity(req, res) {
    try {
        const { id } = req.params;
        const { organization_id } = req.user;
        const {
            description,
            severity,
            corrective_action,
            responsible_person,
            due_date,
            status,
            resolution_date,
            verification_notes
        } = req.body;

        // Verifica esistenza e ownership
        const existingNC = await query(`
      SELECT nc.nc_id, nc.status AS current_status, a.audit_id
      FROM non_conformities nc
      INNER JOIN audits a ON nc.audit_id = a.audit_id
      WHERE nc.nc_id = @id AND a.organization_id = @organization_id
    `, { id: parseInt(id), organization_id });

        if (existingNC.recordset.length === 0) {
            return res.status(404).json({
                error: 'Non conformità non trovata',
                code: 'NC_NOT_FOUND'
            });
        }

        const currentStatus = existingNC.recordset[0].current_status;
        const audit_id = existingNC.recordset[0].audit_id;

        // Build UPDATE dinamicamente
        const updates = [];
        const params = { id: parseInt(id) };

        if (description !== undefined) {
            updates.push('description = @description');
            params.description = description;
        }
        if (severity !== undefined) {
            if (!['major', 'minor', 'observation'].includes(severity)) {
                return res.status(400).json({
                    error: 'Severità non valida',
                    code: 'VALIDATION_ERROR'
                });
            }
            updates.push('severity = @severity');
            params.severity = severity;
        }
        if (corrective_action !== undefined) {
            updates.push('corrective_action = @corrective_action');
            params.corrective_action = corrective_action;
        }
        if (responsible_person !== undefined) {
            updates.push('responsible_person = @responsible_person');
            params.responsible_person = responsible_person;
        }
        if (due_date !== undefined) {
            updates.push('due_date = @due_date');
            params.due_date = due_date;
        }
        if (resolution_date !== undefined) {
            updates.push('resolution_date = @resolution_date');
            params.resolution_date = resolution_date;
        }
        if (verification_notes !== undefined) {
            updates.push('verification_notes = @verification_notes');
            params.verification_notes = verification_notes;
        }

        // Gestione transizione stato (con validazione workflow)
        if (status !== undefined) {
            const validTransitions = {
                'open': ['in_progress', 'closed'],
                'in_progress': ['resolved', 'open'],
                'resolved': ['verified', 'in_progress'],
                'verified': ['closed', 'in_progress'],
                'closed': [] // NC chiusa non può cambiare stato
            };

            if (!validTransitions[currentStatus].includes(status)) {
                return res.status(400).json({
                    error: `Transizione di stato non valida: ${currentStatus} → ${status}`,
                    code: 'INVALID_STATE_TRANSITION',
                    currentStatus,
                    allowedTransitions: validTransitions[currentStatus]
                });
            }

            updates.push('status = @status');
            params.status = status;

            // Auto-set resolution_date quando si passa a 'resolved'
            if (status === 'resolved' && resolution_date === undefined) {
                updates.push('resolution_date = CAST(GETDATE() AS DATE)');
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'Nessun campo da aggiornare',
                code: 'VALIDATION_ERROR'
            });
        }

        updates.push('updated_at = GETDATE()');

        // Update NC
        await query(`
      UPDATE non_conformities
      SET ${updates.join(', ')}
      WHERE nc_id = @id
    `, params);

        // Aggiorna contatore NC nell'audit se necessario
        await query(`
      UPDATE audits
      SET non_conformities_count = (
        SELECT COUNT(*) FROM non_conformities WHERE audit_id = @audit_id
      ),
      updated_at = GETDATE()
      WHERE audit_id = @audit_id
    `, { audit_id });

        logger.info('NC updated', {
            nc_id: id,
            organization_id,
            updates: Object.keys(params),
            statusTransition: status ? `${currentStatus} → ${status}` : null
        });

        res.json({
            success: true,
            message: 'Non conformità aggiornata con successo'
        });

    } catch (error) {
        logger.error('Error updating NC', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante l\'aggiornamento della non conformità',
            code: 'NC_UPDATE_ERROR'
        });
    }
}

/**
 * DELETE /api/v1/non-conformities/:id
 * Elimina NC (hard delete - CASCADE su attachments)
 */
async function deleteNonConformity(req, res) {
    try {
        const { id } = req.params;
        const { organization_id } = req.user;

        // Verifica esistenza e ownership
        const existingNC = await query(`
      SELECT nc.nc_id, a.audit_id
      FROM non_conformities nc
      INNER JOIN audits a ON nc.audit_id = a.audit_id
      WHERE nc.nc_id = @id AND a.organization_id = @organization_id
    `, { id: parseInt(id), organization_id });

        if (existingNC.recordset.length === 0) {
            return res.status(404).json({
                error: 'Non conformità non trovata',
                code: 'NC_NOT_FOUND'
            });
        }

        const audit_id = existingNC.recordset[0].audit_id;

        // Delete NC (CASCADE elimina anche attachments)
        await query(`
      DELETE FROM non_conformities WHERE nc_id = @id
    `, { id: parseInt(id) });

        // Aggiorna contatore NC nell'audit
        await query(`
      UPDATE audits
      SET non_conformities_count = (
        SELECT COUNT(*) FROM non_conformities WHERE audit_id = @audit_id
      ),
      updated_at = GETDATE()
      WHERE audit_id = @audit_id
    `, { audit_id });

        logger.info('NC deleted', { nc_id: id, organization_id });

        res.json({
            success: true,
            message: 'Non conformità eliminata con successo'
        });

    } catch (error) {
        logger.error('Error deleting NC', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante l\'eliminazione della non conformità',
            code: 'NC_DELETE_ERROR'
        });
    }
}

/**
 * GET /api/v1/non-conformities/statistics/overview
 * Statistiche generali NC per organizzazione
 */
async function getNonConformitiesStatistics(req, res) {
    try {
        const { organization_id } = req.user;

        // Statistiche aggregate
        const statsResult = await query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN nc.status = 'open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN nc.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN nc.status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN nc.status = 'verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN nc.status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN nc.severity = 'major' THEN 1 ELSE 0 END) AS major,
        SUM(CASE WHEN nc.severity = 'minor' THEN 1 ELSE 0 END) AS minor,
        SUM(CASE WHEN nc.severity = 'observation' THEN 1 ELSE 0 END) AS observations,
        SUM(CASE 
          WHEN nc.due_date < CAST(GETDATE() AS DATE) 
            AND nc.status NOT IN ('closed', 'verified') 
          THEN 1 ELSE 0 
        END) AS overdue
      FROM non_conformities nc
      INNER JOIN audits a ON nc.audit_id = a.audit_id
      WHERE a.organization_id = @organization_id
    `, { organization_id });

        logger.info('NC statistics retrieved', { organization_id });

        res.json({
            success: true,
            data: statsResult.recordset[0]
        });

    } catch (error) {
        logger.error('Error getting NC statistics', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il recupero delle statistiche',
            code: 'NC_STATS_ERROR'
        });
    }
}

module.exports = {
    listNonConformities,
    getNonConformityById,
    createNonConformity,
    updateNonConformity,
    deleteNonConformity,
    getNonConformitiesStatistics
};
