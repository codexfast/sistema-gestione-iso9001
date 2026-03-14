/**
 * Admin Controller - Gestione utenti e assegnazione standard (solo admin)
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/admin/users
 * Lista utenti dell'organizzazione (solo admin)
 */
async function listUsers(req, res) {
    try {
        const { organization_id } = req.user;

        const result = await query(`
            SELECT 
                u.user_id, u.email, u.full_name, u.role, u.auditor_org_id, u.is_active,
                u.created_at, u.last_login,
                o.organization_name,
                ao.name AS auditor_org_name
            FROM users u
            INNER JOIN organizations o ON u.organization_id = o.organization_id
            LEFT JOIN auditor_orgs ao ON u.auditor_org_id = ao.id
            WHERE u.organization_id = @organization_id
            ORDER BY u.full_name, u.email
        `, { organization_id });

        const users = result.recordset || [];

        // Per ogni utente carica gli standard consentiti (user_standards)
        for (const u of users) {
            try {
                const std = await query(`
                    SELECT standard_id FROM user_standards WHERE user_id = @user_id ORDER BY standard_id
                `, { user_id: u.user_id });
                u.allowed_standard_ids = (std.recordset || []).map(r => r.standard_id);
            } catch (_) {
                u.allowed_standard_ids = []; // tabella inesistente o errore
            }
        }

        logger.info('Admin list users', { organization_id, count: users.length });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        logger.error('Admin listUsers error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Errore recupero elenco utenti',
            code: 'ADMIN_LIST_USERS_ERROR'
        });
    }
}

/**
 * PUT /api/v1/admin/users/:id/standards
 * Aggiorna gli standard consentiti per un utente (solo admin)
 * Body: { standard_ids: [1, 2, 3] } — array di standard_id (vuoto = nessuna restrizione, ma per "tutti" non usare questo endpoint, elimina le righe)
 */
async function updateUserStandards(req, res) {
    try {
        const { organization_id } = req.user;
        const targetUserId = parseInt(req.params.id, 10);
        const { standard_ids } = req.body || {};

        if (isNaN(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'ID utente non valido',
                code: 'VALIDATION_ERROR'
            });
        }

        // Verifica che l'utente target appartenga all'organizzazione
        const userCheck = await query(`
            SELECT user_id, full_name, email FROM users
            WHERE user_id = @user_id AND organization_id = @organization_id
        `, { user_id: targetUserId, organization_id });

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato o non appartiene alla tua organizzazione',
                code: 'USER_NOT_FOUND'
            });
        }

        const ids = Array.isArray(standard_ids)
            ? standard_ids.map(i => parseInt(i, 10)).filter(i => !isNaN(i) && i > 0)
            : [];

        // Verifica che tutti gli standard_id esistano
        if (ids.length > 0) {
            const placeholders = ids.map((_, i) => `@sid${i}`).join(',');
            const params = ids.reduce((acc, id, i) => ({ ...acc, [`sid${i}`]: id }), {});
            const stdCheck = await query(
                `SELECT standard_id FROM standards WHERE standard_id IN (${placeholders}) AND is_active = 1`,
                params
            );
            const existingIds = (stdCheck.recordset || []).map(r => r.standard_id);
            const invalid = ids.filter(id => !existingIds.includes(id));
            if (invalid.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Uno o più standard_id non validi o non attivi',
                    code: 'INVALID_STANDARD_IDS',
                    invalid_standard_ids: invalid
                });
            }
        }

        // Sostituisci user_standards: elimina esistenti e inserisci i nuovi
        await query(`DELETE FROM user_standards WHERE user_id = @user_id`, { user_id: targetUserId });

        for (const standard_id of ids) {
            await query(`
                INSERT INTO user_standards (user_id, standard_id) VALUES (@user_id, @standard_id)
            `, { user_id: targetUserId, standard_id });
        }

        logger.info('Admin update user standards', {
            target_user_id: targetUserId,
            standard_ids: ids,
            admin_org: organization_id
        });

        res.json({
            success: true,
            message: 'Standard consentiti aggiornati',
            user_id: targetUserId,
            allowed_standard_ids: ids
        });
    } catch (error) {
        logger.error('Admin updateUserStandards error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Errore aggiornamento standard utente',
            code: 'ADMIN_UPDATE_STANDARDS_ERROR'
        });
    }
}

module.exports = {
    listUsers,
    updateUserStandards
};
