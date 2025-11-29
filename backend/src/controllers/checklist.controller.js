/**
 * Controller: Checklist (ISO Standards)
 * Gestisce sezioni e domande per standard specifici
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/standards
 * Restituisce lista standard disponibili
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
      ORDER BY standard_id
    `);

        res.json({
            success: true,
            standards: result.recordset
        });
    } catch (error) {
        logger.error('Error fetching standards:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero degli standard'
        });
    }
}

/**
 * GET /api/v1/checklist/sections?standard_id=1
 * Restituisce sezioni checklist per standard specifico
 */
async function getSections(req, res) {
    try {
        const { standard_id } = req.query;

        if (!standard_id) {
            return res.status(400).json({
                success: false,
                error: 'Parametro standard_id obbligatorio'
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
    `, { standard_id });

        res.json({
            success: true,
            sections: result.recordset
        });
    } catch (error) {
        logger.error('Error fetching sections:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle sezioni'
        });
    }
}

/**
 * GET /api/v1/checklist/questions?standard_id=1&section_code=4.1
 * Restituisce domande per sezione specifica
 */
async function getQuestions(req, res) {
    try {
        const { standard_id, section_code } = req.query;

        if (!standard_id || !section_code) {
            return res.status(400).json({
                success: false,
                error: 'Parametri standard_id e section_code obbligatori'
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
    `, { standard_id, section_code });

        res.json({
            success: true,
            questions: result.recordset
        });
    } catch (error) {
        logger.error('Error fetching questions:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle domande'
        });
    }
}

module.exports = {
    getAllStandards,
    getSections,
    getQuestions
};
