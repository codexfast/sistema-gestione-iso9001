/**
 * Response Controller
 * Gestisce salvataggio e recupero risposte checklist per audit
 * 
 * Le risposte sono isolate per audit, che a sua volta è isolato per organization_id
 * Supporta sync offline con timestamp-based conflict resolution
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/audits/:auditId/responses
 * Recupera tutte le risposte per un audit
 */
async function getAuditResponses(req, res) {
    try {
        const { auditId } = req.params;
        const { organization_id } = req.user;

        // Verifica ownership audit
        const auditCheck = await query(`
            SELECT audit_id FROM audits
            WHERE audit_id = @audit_id AND organization_id = @organization_id AND is_deleted = 0
        `, { audit_id: parseInt(auditId), organization_id });

        if (auditCheck.recordset.length === 0) {
            return res.status(404).json({
                error: 'Audit non trovato',
                code: 'AUDIT_NOT_FOUND'
            });
        }

        // Recupera risposte con info domanda
        const result = await query(`
            SELECT 
                ar.response_id,
                ar.response_uuid,
                ar.question_id,
                ar.conformity_status,
                ar.notes,
                ar.evidence,
                ar.is_answered,
                ar.answered_at,
                ar.updated_at,
                cq.question_text,
                cq.section_code,
                cq.question_type
            FROM audit_responses ar
            INNER JOIN checklist_questions cq ON ar.question_id = cq.question_id
            WHERE ar.audit_id = @audit_id
            ORDER BY cq.section_code, cq.display_order
        `, { audit_id: parseInt(auditId) });

        logger.info('Audit responses retrieved', {
            audit_id: auditId,
            count: result.recordset.length
        });

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        logger.error('Error getting audit responses', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il recupero delle risposte',
            code: 'RESPONSE_GET_ERROR'
        });
    }
}

/**
 * POST /api/v1/audits/:auditId/responses
 * Salva/aggiorna singola risposta
 * 
 * Body: {
 *   question_id: number (REQUIRED),
 *   conformity_status: 'C' | 'NC' | 'OSS' | 'OM' | 'NA' | null,
 *   notes: string,
 *   evidence: string,
 *   client_updated_at: ISO timestamp (per conflict detection)
 * }
 */
async function saveResponse(req, res) {
    try {
        const { auditId } = req.params;
        const { organization_id, user_id } = req.user;
        const {
            question_id,
            conformity_status,
            notes,
            evidence,
            client_updated_at
        } = req.body;

        // Validazione
        if (!question_id) {
            return res.status(400).json({
                error: 'question_id obbligatorio',
                code: 'VALIDATION_ERROR'
            });
        }

        // Verifica ownership audit
        const auditCheck = await query(`
            SELECT audit_id, status FROM audits
            WHERE audit_id = @audit_id AND organization_id = @organization_id AND is_deleted = 0
        `, { audit_id: parseInt(auditId), organization_id });

        if (auditCheck.recordset.length === 0) {
            return res.status(404).json({
                error: 'Audit non trovato',
                code: 'AUDIT_NOT_FOUND'
            });
        }

        // Verifica che question esista
        const questionCheck = await query(`
            SELECT question_id FROM checklist_questions WHERE question_id = @question_id
        `, { question_id: parseInt(question_id) });

        if (questionCheck.recordset.length === 0) {
            return res.status(404).json({
                error: 'Domanda non trovata',
                code: 'QUESTION_NOT_FOUND'
            });
        }

        // Cerca risposta esistente
        const existingResponse = await query(`
            SELECT response_id, updated_at FROM audit_responses
            WHERE audit_id = @audit_id AND question_id = @question_id
        `, { audit_id: parseInt(auditId), question_id: parseInt(question_id) });

        const isAnswered = conformity_status && conformity_status !== 'NOT_ANSWERED';

        if (existingResponse.recordset.length > 0) {
            // UPDATE - con conflict detection
            const serverUpdatedAt = existingResponse.recordset[0].updated_at;

            if (client_updated_at) {
                const clientTime = new Date(client_updated_at).getTime();
                const serverTime = new Date(serverUpdatedAt).getTime();

                if (clientTime < serverTime) {
                    // Conflict: server version più recente
                    return res.status(409).json({
                        error: 'Conflitto: risposta modificata da altro utente',
                        code: 'RESPONSE_CONFLICT',
                        serverVersion: serverUpdatedAt
                    });
                }
            }

            await query(`
                UPDATE audit_responses
                SET 
                    conformity_status = @conformity_status,
                    notes = @notes,
                    evidence = @evidence,
                    is_answered = @is_answered,
                    answered_at = CASE WHEN @is_answered = 1 AND answered_at IS NULL THEN GETDATE() ELSE answered_at END,
                    updated_at = GETDATE(),
                    updated_by = @user_id
                WHERE audit_id = @audit_id AND question_id = @question_id
            `, {
                audit_id: parseInt(auditId),
                question_id: parseInt(question_id),
                conformity_status: conformity_status || null,
                notes: notes || null,
                evidence: evidence || null,
                is_answered: isAnswered ? 1 : 0,
                user_id
            });

            logger.info('Response updated', { audit_id: auditId, question_id });

            res.json({
                success: true,
                message: 'Risposta aggiornata',
                action: 'updated'
            });

        } else {
            // INSERT (senza OUTPUT per compatibilità con trigger)
            await query(`
                INSERT INTO audit_responses (
                    audit_id,
                    question_id,
                    conformity_status,
                    notes,
                    evidence,
                    is_answered,
                    answered_at,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    @audit_id,
                    @question_id,
                    @conformity_status,
                    @notes,
                    @evidence,
                    @is_answered,
                    CASE WHEN @is_answered = 1 THEN GETDATE() ELSE NULL END,
                    @user_id,
                    GETDATE(),
                    GETDATE()
                )
            `, {
                audit_id: parseInt(auditId),
                question_id: parseInt(question_id),
                conformity_status: conformity_status || null,
                notes: notes || null,
                evidence: evidence || null,
                is_answered: isAnswered ? 1 : 0,
                user_id
            });

            // Recupera ID appena inserito
            const insertedResponse = await query(`
                SELECT response_id, response_uuid 
                FROM audit_responses 
                WHERE audit_id = @audit_id AND question_id = @question_id
            `, {
                audit_id: parseInt(auditId),
                question_id: parseInt(question_id)
            });

            logger.info('Response created', {
                audit_id: auditId,
                question_id,
                response_id: insertedResponse.recordset[0].response_id
            });

            res.status(201).json({
                success: true,
                message: 'Risposta salvata',
                action: 'created',
                response_id: insertedResponse.recordset[0].response_id
            });
        }

        // Aggiorna statistiche audit
        await updateAuditStatistics(parseInt(auditId));

    } catch (error) {
        logger.error('Error saving response', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il salvataggio della risposta',
            code: 'RESPONSE_SAVE_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * POST /api/v1/audits/:auditId/responses/bulk
 * Salva multiple risposte in batch (per sync offline)
 * 
 * Body: {
 *   responses: [{
 *     question_id: number,
 *     conformity_status: string,
 *     notes: string,
 *     evidence: string,
 *     client_updated_at: ISO timestamp
 *   }]
 * }
 */
async function bulkSaveResponses(req, res) {
    try {
        const { auditId } = req.params;
        const { organization_id, user_id } = req.user;
        const { responses } = req.body;

        if (!responses || !Array.isArray(responses) || responses.length === 0) {
            return res.status(400).json({
                error: 'Array responses obbligatorio',
                code: 'VALIDATION_ERROR'
            });
        }

        // Verifica ownership audit
        const auditCheck = await query(`
            SELECT audit_id FROM audits
            WHERE audit_id = @audit_id AND organization_id = @organization_id AND is_deleted = 0
        `, { audit_id: parseInt(auditId), organization_id });

        if (auditCheck.recordset.length === 0) {
            return res.status(404).json({
                error: 'Audit non trovato',
                code: 'AUDIT_NOT_FOUND'
            });
        }

        const results = {
            saved: 0,
            updated: 0,
            conflicts: [],
            errors: []
        };

        // Processa ogni risposta
        for (const resp of responses) {
            try {
                const { question_id, conformity_status, notes, evidence, client_updated_at } = resp;

                if (!question_id) {
                    results.errors.push({ question_id: null, error: 'question_id mancante' });
                    continue;
                }

                // Cerca risposta esistente
                const existing = await query(`
                    SELECT response_id, updated_at FROM audit_responses
                    WHERE audit_id = @audit_id AND question_id = @question_id
                `, { audit_id: parseInt(auditId), question_id: parseInt(question_id) });

                const isAnswered = conformity_status && conformity_status !== 'NOT_ANSWERED';

                if (existing.recordset.length > 0) {
                    // Check conflict
                    const serverTime = new Date(existing.recordset[0].updated_at).getTime();
                    const clientTime = client_updated_at ? new Date(client_updated_at).getTime() : Date.now();

                    if (clientTime < serverTime) {
                        results.conflicts.push({
                            question_id,
                            serverVersion: existing.recordset[0].updated_at
                        });
                        continue;
                    }

                    // UPDATE
                    await query(`
                        UPDATE audit_responses
                        SET 
                            conformity_status = @conformity_status,
                            notes = @notes,
                            evidence = @evidence,
                            is_answered = @is_answered,
                            answered_at = CASE WHEN @is_answered = 1 AND answered_at IS NULL THEN GETDATE() ELSE answered_at END,
                            updated_at = GETDATE(),
                            updated_by = @user_id
                        WHERE audit_id = @audit_id AND question_id = @question_id
                    `, {
                        audit_id: parseInt(auditId),
                        question_id: parseInt(question_id),
                        conformity_status: conformity_status || null,
                        notes: notes || null,
                        evidence: evidence || null,
                        is_answered: isAnswered ? 1 : 0,
                        user_id
                    });

                    results.updated++;
                } else {
                    // INSERT
                    await query(`
                        INSERT INTO audit_responses (
                            audit_id, question_id, conformity_status, notes, evidence,
                            is_answered, answered_at, created_by, created_at, updated_at
                        )
                        VALUES (
                            @audit_id, @question_id, @conformity_status, @notes, @evidence,
                            @is_answered, CASE WHEN @is_answered = 1 THEN GETDATE() ELSE NULL END,
                            @user_id, GETDATE(), GETDATE()
                        )
                    `, {
                        audit_id: parseInt(auditId),
                        question_id: parseInt(question_id),
                        conformity_status: conformity_status || null,
                        notes: notes || null,
                        evidence: evidence || null,
                        is_answered: isAnswered ? 1 : 0,
                        user_id
                    });

                    results.saved++;
                }

            } catch (error) {
                results.errors.push({
                    question_id: resp.question_id,
                    error: error.message
                });
            }
        }

        // Aggiorna statistiche audit
        await updateAuditStatistics(parseInt(auditId));

        logger.info('Bulk responses saved', {
            audit_id: auditId,
            total: responses.length,
            results
        });

        res.json({
            success: true,
            results
        });

    } catch (error) {
        logger.error('Error bulk saving responses', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il salvataggio batch delle risposte',
            code: 'RESPONSE_BULK_ERROR'
        });
    }
}

/**
 * DELETE /api/v1/audits/:auditId/responses/:questionId
 * Elimina una risposta specifica
 */
async function deleteResponse(req, res) {
    try {
        const { auditId, questionId } = req.params;
        const { organization_id } = req.user;

        // Verifica ownership audit
        const auditCheck = await query(`
            SELECT audit_id FROM audits
            WHERE audit_id = @audit_id AND organization_id = @organization_id AND is_deleted = 0
        `, { audit_id: parseInt(auditId), organization_id });

        if (auditCheck.recordset.length === 0) {
            return res.status(404).json({
                error: 'Audit non trovato',
                code: 'AUDIT_NOT_FOUND'
            });
        }

        // Delete response
        const result = await query(`
            DELETE FROM audit_responses
            WHERE audit_id = @audit_id AND question_id = @question_id
        `, { audit_id: parseInt(auditId), question_id: parseInt(questionId) });

        // Aggiorna statistiche
        await updateAuditStatistics(parseInt(auditId));

        logger.info('Response deleted', { audit_id: auditId, question_id: questionId });

        res.json({
            success: true,
            message: 'Risposta eliminata'
        });

    } catch (error) {
        logger.error('Error deleting response', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante l\'eliminazione della risposta',
            code: 'RESPONSE_DELETE_ERROR'
        });
    }
}

/**
 * Helper: Aggiorna statistiche audit (contatori conformità)
 */
async function updateAuditStatistics(auditId) {
    try {
        await query(`
            UPDATE audits
            SET 
                total_questions = (
                    SELECT COUNT(*) FROM audit_responses WHERE audit_id = @audit_id
                ),
                answered_questions = (
                    SELECT COUNT(*) FROM audit_responses WHERE audit_id = @audit_id AND is_answered = 1
                ),
                conformities_count = (
                    SELECT COUNT(*) FROM audit_responses WHERE audit_id = @audit_id AND conformity_status = 'C'
                ),
                non_conformities_count = (
                    SELECT COUNT(*) FROM audit_responses WHERE audit_id = @audit_id AND conformity_status = 'NC'
                ),
                completion_percentage = CASE 
                    WHEN (SELECT COUNT(*) FROM audit_responses WHERE audit_id = @audit_id) > 0
                    THEN CAST((SELECT COUNT(*) FROM audit_responses WHERE audit_id = @audit_id AND is_answered = 1) AS FLOAT) /
                         CAST((SELECT COUNT(*) FROM audit_responses WHERE audit_id = @audit_id) AS FLOAT) * 100
                    ELSE 0
                END,
                updated_at = GETDATE()
            WHERE audit_id = @audit_id
        `, { audit_id: auditId });

    } catch (error) {
        logger.error('Error updating audit statistics', { audit_id: auditId, error: error.message });
        // Non lanciare errore - le statistiche sono secondarie
    }
}

module.exports = {
    getAuditResponses,
    saveResponse,
    bulkSaveResponses,
    deleteResponse
};
