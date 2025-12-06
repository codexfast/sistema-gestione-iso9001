/**
 * Standards Controller
 * Gestisce gli standard ISO disponibili (9001, 14001, 45001, etc.)
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/standards
 * Lista standard ISO disponibili
 * 
 * Query params:
 * - category: filter by category (quality, environment, safety, security, other)
 * - is_active: filter by active status (true/false)
 */
async function listStandards(req, res) {
    try {
        const { category, is_active } = req.query;

        // Build WHERE clause dinamicamente
        let whereConditions = [];
        let params = {};

        if (category) {
            whereConditions.push('category = @category');
            params.category = category;
        }

        if (is_active !== undefined) {
            whereConditions.push('is_active = @is_active');
            params.is_active = is_active === 'true' ? 1 : 0;
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        const result = await query(`
      SELECT 
        standard_id,
        standard_code,
        standard_name,
        standard_full_name,
        version,
        category,
        is_active,
        description,
        created_at,
        updated_at
      FROM standards
      ${whereClause}
      ORDER BY 
        CASE category 
          WHEN 'quality' THEN 1 
          WHEN 'environment' THEN 2 
          WHEN 'safety' THEN 3 
          ELSE 4 
        END,
        standard_name
    `, params);

        logger.info('Standards list retrieved', {
            count: result.recordset.length,
            filters: { category, is_active }
        });

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        logger.error('Error listing standards', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il recupero degli standard',
            code: 'STANDARDS_LIST_ERROR'
        });
    }
}

/**
 * GET /api/v1/standards/:id
 * Dettagli singolo standard
 */
async function getStandardById(req, res) {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT 
        standard_id,
        standard_code,
        standard_name,
        standard_full_name,
        version,
        category,
        is_active,
        description,
        created_at,
        updated_at
      FROM standards
      WHERE standard_id = @id
    `, { id: parseInt(id) });

        if (result.recordset.length === 0) {
            return res.status(404).json({
                error: 'Standard non trovato',
                code: 'STANDARD_NOT_FOUND'
            });
        }

        const standard = result.recordset[0];

        // Conta audit associati
        const auditCountResult = await query(`
      SELECT COUNT(DISTINCT ast.audit_id) AS audit_count
      FROM audit_standards ast
      INNER JOIN audits a ON ast.audit_id = a.audit_id
      WHERE ast.standard_id = @id AND a.is_deleted = 0
    `, { id: parseInt(id) });

        standard.audit_count = auditCountResult.recordset[0].audit_count;

        logger.info('Standard retrieved', { standard_id: id });

        res.json({
            success: true,
            data: standard
        });

    } catch (error) {
        logger.error('Error getting standard', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il recupero dello standard',
            code: 'STANDARD_GET_ERROR'
        });
    }
}

/**
 * GET /api/v1/standards/statistics/overview
 * Statistiche utilizzo standard
 */
async function getStandardsStatistics(req, res) {
    try {
        const statsResult = await query(`
      SELECT 
        s.standard_id,
        s.standard_code,
        s.standard_name,
        s.category,
        COUNT(DISTINCT ast.audit_id) AS audit_count,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN ast.audit_id END) AS completed_audit_count
      FROM standards s
      LEFT JOIN audit_standards ast ON s.standard_id = ast.standard_id
      LEFT JOIN audits a ON ast.audit_id = a.audit_id AND a.is_deleted = 0
      WHERE s.is_active = 1
      GROUP BY s.standard_id, s.standard_code, s.standard_name, s.category
      ORDER BY audit_count DESC
    `);

        logger.info('Standards statistics retrieved');

        res.json({
            success: true,
            data: statsResult.recordset
        });

    } catch (error) {
        logger.error('Error getting standards statistics', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Errore durante il recupero delle statistiche',
            code: 'STANDARDS_STATS_ERROR'
        });
    }
}

module.exports = {
    listStandards,
    getStandardById,
    getStandardsStatistics
};


