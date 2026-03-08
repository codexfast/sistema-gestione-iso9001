/**
 * Controller: Checklist (ISO Standards)
 * Gestisce sezioni e domande per standard specifici
 * 
 * NOTA MULTI-TENANT:
 * Standards, sections e questions sono condivise tra tutte le organizzazioni (dati di riferimento).
 * NON filtriamo per organization_id perché sono "master data" comuni.
 * L'isolamento multi-tenant avviene a livello audit/risposte, non checklist template.
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');;

/**
 * GET /api/v1/standards
 * Restituisce lista standard disponibili
 * 
 * PUBBLICO: Non richiede autenticazione (dati di riferimento comuni)
 */
async function getAllStandards(req, res) {
    try {
        const result = await query(`
      SELECT 
        standard_id,
        standard_code,
        standard_name,
        standard_full_name,
        version,
        category,
        is_active,
        (SELECT COUNT(*) FROM checklist_sections WHERE standard_id = s.standard_id) as sections_count
      FROM standards s
      WHERE is_active = 1
      ORDER BY display_order, standard_id
    `);

        logger.info('Standards list retrieved', { count: result.recordset.length });

        res.json({
            success: true,
            standards: result.recordset
        });
    } catch (error) {
        logger.error('Error fetching standards', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero degli standard',
            code: 'STANDARDS_ERROR'
        });
    }
}

/**
 * GET /api/v1/checklist/sections?standard_id=1
 * Restituisce sezioni checklist per standard specifico
 * 
 * PUBBLICO: Non richiede autenticazione (dati di riferimento comuni)
 */
async function getSections(req, res) {
    try {
        const { standard_id } = req.query;

        if (!standard_id) {
            return res.status(400).json({
                success: false,
                error: 'Parametro standard_id obbligatorio',
                code: 'VALIDATION_ERROR'
            });
        }

        // Verifica che lo standard esista
        const standardCheck = await query(`
            SELECT standard_id FROM standards WHERE standard_id = @standard_id AND is_active = 1
        `, { standard_id: parseInt(standard_id) });

        if (standardCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Standard non trovato',
                code: 'STANDARD_NOT_FOUND'
            });
        }

        const result = await query(`
      SELECT 
        cs.section_id,
        cs.section_code,
        cs.section_title,
        cs.parent_section_code,
        cs.display_order,
        s.standard_name,
        s.standard_code,
        (SELECT COUNT(*) FROM checklist_questions WHERE section_code = cs.section_code AND standard_id = cs.standard_id) as questions_count
      FROM checklist_sections cs
      INNER JOIN standards s ON cs.standard_id = s.standard_id
      WHERE cs.standard_id = @standard_id
        AND cs.is_active = 1
      ORDER BY cs.display_order
    `, { standard_id: parseInt(standard_id) });

        logger.info('Sections list retrieved', { standard_id, count: result.recordset.length });

        res.json({
            success: true,
            sections: result.recordset
        });
    } catch (error) {
        logger.error('Error fetching sections', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle sezioni',
            code: 'SECTIONS_ERROR'
        });
    }
}

/**
 * GET /api/v1/checklist/questions?standard_id=1&section_code=4.1
 * Restituisce domande per sezione specifica
 * 
 * PUBBLICO: Non richiede autenticazione (dati di riferimento comuni)
 */
async function getQuestions(req, res) {
    try {
        const { standard_id, section_code } = req.query;

        if (!standard_id || !section_code) {
            return res.status(400).json({
                success: false,
                error: 'Parametri standard_id e section_code obbligatori',
                code: 'VALIDATION_ERROR'
            });
        }

        // Verifica che la sezione esista per lo standard
        const sectionCheck = await query(`
            SELECT section_id 
            FROM checklist_sections 
            WHERE standard_id = @standard_id AND section_code = @section_code AND is_active = 1
        `, { standard_id: parseInt(standard_id), section_code });

        if (sectionCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sezione non trovata per lo standard specificato',
                code: 'SECTION_NOT_FOUND'
            });
        }

        const result = await query(`
      SELECT 
        question_id,
        question_uuid,
        section_code,
        question_text,
        question_type,
        display_order,
        is_mandatory
      FROM checklist_questions
      WHERE standard_id = @standard_id
        AND section_code = @section_code
        AND is_active = 1
      ORDER BY display_order
    `, { standard_id: parseInt(standard_id), section_code });

        logger.info('Questions list retrieved', {
            standard_id,
            section_code,
            count: result.recordset.length
        });

        res.json({
            success: true,
            questions: result.recordset
        });
    } catch (error) {
        logger.error('Error fetching questions', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle domande',
            code: 'QUESTIONS_ERROR'
        });
    }
}

/**
 * GET /api/v1/checklist/questions/all?standard_id=2
 * Restituisce TUTTE le domande di uno standard (tutte le sezioni) con norm_excerpt.
 * Usato dalla pagina admin per editing degli stralci normativi.
 *
 * PRIVATO: richiede autenticazione (solo admin/superadmin)
 */
async function getAllQuestionsWithExcerpt(req, res) {
    try {
        const { standard_id } = req.query;
        if (!standard_id) {
            return res.status(400).json({ success: false, error: 'Parametro standard_id obbligatorio' });
        }

        const result = await query(`
            SELECT
                cq.question_id,
                cq.section_code,
                cs.section_title,
                cs.display_order  AS section_order,
                cq.display_order  AS question_order,
                cq.question_text,
                cq.is_mandatory,
                cq.norm_excerpt
            FROM checklist_questions cq
            JOIN checklist_sections cs
                ON cs.section_code = cq.section_code
               AND cs.standard_id  = cq.standard_id
            WHERE cq.standard_id = @standard_id
              AND cq.is_active    = 1
              AND cs.is_active    = 1
            ORDER BY cs.display_order, cq.display_order
        `, { standard_id: parseInt(standard_id) });

        res.json({ success: true, questions: result.recordset });
    } catch (error) {
        logger.error('Error fetching all questions with excerpt', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore nel recupero delle domande' });
    }
}

/**
 * PATCH /api/v1/checklist/questions/:id
 * Aggiorna norm_excerpt (e opzionalmente question_text) di una domanda.
 * Usato dalla pagina admin per inserire/modificare gli stralci normativi.
 *
 * PRIVATO: richiede autenticazione (solo admin/superadmin)
 */
async function updateQuestion(req, res) {
    try {
        const { id } = req.params;
        const { norm_excerpt, question_text } = req.body;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ success: false, error: 'ID domanda non valido' });
        }

        // Verifica che la domanda esista
        const existing = await query(
            'SELECT question_id FROM checklist_questions WHERE question_id = @id AND is_active = 1',
            { id: parseInt(id) }
        );
        if (existing.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Domanda non trovata' });
        }

        // Aggiorna solo i campi forniti
        const updates = [];
        const params = { id: parseInt(id) };

        if (norm_excerpt !== undefined) {
            updates.push('norm_excerpt = @norm_excerpt');
            params.norm_excerpt = norm_excerpt || null;
        }
        if (question_text !== undefined && question_text.trim()) {
            updates.push('question_text = @question_text');
            params.question_text = question_text.trim();
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'Nessun campo da aggiornare' });
        }

        updates.push('updated_at = GETDATE()');
        await query(
            `UPDATE checklist_questions SET ${updates.join(', ')} WHERE question_id = @id`,
            params
        );

        logger.info('Question updated', { question_id: id, fields: Object.keys(req.body) });
        res.json({ success: true, message: 'Domanda aggiornata' });
    } catch (error) {
        logger.error('Error updating question', { error: error.message });
        res.status(500).json({ success: false, error: 'Errore aggiornamento domanda' });
    }
}

module.exports = {
    getAllStandards,
    getSections,
    getQuestions,
    getAllQuestionsWithExcerpt,
    updateQuestion,
};
