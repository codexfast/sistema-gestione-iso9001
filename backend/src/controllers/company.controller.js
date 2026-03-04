/**
 * Company Controller - Fase 1 Multi-Tenant
 * CRUD aziende auditate (clienti degli auditor)
 * Isolamento: filtra per auditor_org_id dell'utente
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Risolve auditor_org_id da usare per il filtro
 * Superadmin (admin senza auditor_org_id): usa query param se fornito
 * Auditor: usa il proprio auditor_org_id
 */
function resolveAuditorOrgId(req) {
    const userOrgId = req.user.auditor_org_id;
    const isSuperadmin = req.user.role === 'admin' && !userOrgId;
    const queryOrgId = req.query.auditor_org_id ? parseInt(req.query.auditor_org_id, 10) : null;

    if (isSuperadmin && queryOrgId) return queryOrgId;
    return userOrgId;
}

/**
 * GET /api/v1/companies
 * Lista aziende dell'auditor_org dell'utente
 */
async function listCompanies(req, res) {
    try {
        const auditorOrgId = resolveAuditorOrgId(req);
        if (!auditorOrgId) {
            return res.status(403).json({
                error: 'Specificare auditor_org_id (superadmin) o appartenere a un auditor_org',
                code: 'AUDITOR_ORG_REQUIRED'
            });
        }

        const { page = 1, limit = 50, search, is_active } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereConditions = ['auditor_org_id = @auditor_org_id'];
        const params = { auditor_org_id: auditorOrgId, limit: parseInt(limit), offset };

        if (search) {
            whereConditions.push('(name LIKE @search OR vat_number LIKE @search)');
            params.search = '%' + search + '%';
        }
        if (is_active !== undefined && is_active !== '') {
            whereConditions.push('is_active = @is_active');
            params.is_active = is_active === 'true' || is_active === '1';
        }

        const whereClause = whereConditions.join(' AND ');

        const result = await query(`
            SELECT id, auditor_org_id, name, vat_number, sector, address, is_active, created_at, updated_at
            FROM companies
            WHERE ${whereClause}
            ORDER BY name
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `, params);

        const countResult = await query(`
            SELECT COUNT(*) AS total FROM companies WHERE ${whereClause}
        `, params);

        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.recordset[0].total,
                totalPages: Math.ceil(countResult.recordset[0].total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('[COMPANIES] list error:', error);
        res.status(500).json({ error: 'Errore recupero aziende', code: 'SERVER_ERROR' });
    }
}

/**
 * GET /api/v1/companies/:id
 */
async function getCompanyById(req, res) {
    try {
        const auditorOrgId = resolveAuditorOrgId(req);
        if (!auditorOrgId) {
            return res.status(403).json({ error: 'Auditor org richiesto', code: 'AUDITOR_ORG_REQUIRED' });
        }

        const id = parseInt(req.params.id, 10);
        const result = await query(`
            SELECT id, auditor_org_id, name, vat_number, sector, address, is_active, created_at, updated_at
            FROM companies
            WHERE id = @id AND auditor_org_id = @auditor_org_id
        `, { id, auditor_org_id: auditorOrgId });

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Azienda non trovata', code: 'NOT_FOUND' });
        }

        res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        logger.error('[COMPANIES] getById error:', error);
        res.status(500).json({ error: 'Errore recupero azienda', code: 'SERVER_ERROR' });
    }
}

/**
 * POST /api/v1/companies
 */
async function createCompany(req, res) {
    try {
        const auditorOrgId = req.body.auditor_org_id || req.user.auditor_org_id;
        if (!auditorOrgId) {
            return res.status(400).json({ error: 'auditor_org_id obbligatorio', code: 'MISSING_AUDITOR_ORG' });
        }

        const isSuperadmin = req.user.role === 'admin' && !req.user.auditor_org_id;
        if (!isSuperadmin && parseInt(auditorOrgId, 10) !== req.user.auditor_org_id) {
            return res.status(403).json({ error: 'Non puoi creare aziende per altri auditor_org', code: 'FORBIDDEN' });
        }

        const { name, vat_number, sector, address } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'name obbligatorio', code: 'MISSING_NAME' });
        }

        const result = await query(`
            INSERT INTO companies (auditor_org_id, name, vat_number, sector, address, is_active, updated_at)
            OUTPUT INSERTED.id, INSERTED.auditor_org_id, INSERTED.name, INSERTED.vat_number, INSERTED.sector, INSERTED.address, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
            VALUES (@auditor_org_id, @name, @vat_number, @sector, @address, 1, GETDATE())
        `, {
            auditor_org_id: parseInt(auditorOrgId, 10),
            name: name.trim(),
            vat_number: vat_number?.trim() || null,
            sector: sector?.trim() || null,
            address: address?.trim() || null
        });

        logger.info('[COMPANIES] Created:', result.recordset[0].id);
        res.status(201).json({ success: true, data: result.recordset[0] });
    } catch (error) {
        logger.error('[COMPANIES] create error:', error);
        res.status(500).json({ error: 'Errore creazione azienda', code: 'SERVER_ERROR' });
    }
}

/**
 * PUT /api/v1/companies/:id
 */
async function updateCompany(req, res) {
    try {
        const auditorOrgId = resolveAuditorOrgId(req);
        if (!auditorOrgId) {
            return res.status(403).json({ error: 'Auditor org richiesto', code: 'AUDITOR_ORG_REQUIRED' });
        }

        const id = parseInt(req.params.id, 10);
        const { name, vat_number, sector, address, is_active } = req.body;

        const check = await query(`
            SELECT id FROM companies WHERE id = @id AND auditor_org_id = @auditor_org_id
        `, { id, auditor_org_id: auditorOrgId });

        if (check.recordset.length === 0) {
            return res.status(404).json({ error: 'Azienda non trovata', code: 'NOT_FOUND' });
        }

        const updates = [];
        const params = { id, auditor_org_id: auditorOrgId };
        if (name !== undefined) { updates.push('name = @name'); params.name = name.trim(); }
        if (vat_number !== undefined) { updates.push('vat_number = @vat_number'); params.vat_number = vat_number?.trim() || null; }
        if (sector !== undefined) { updates.push('sector = @sector'); params.sector = sector?.trim() || null; }
        if (address !== undefined) { updates.push('address = @address'); params.address = address?.trim() || null; }
        if (is_active !== undefined) { updates.push('is_active = @is_active'); params.is_active = is_active === true || is_active === 1; }

        if (updates.length === 0) {
            const current = await query('SELECT * FROM companies WHERE id = @id', { id });
            return res.json({ success: true, data: current.recordset[0] });
        }

        updates.push('updated_at = GETDATE()');
        await query(`
            UPDATE companies SET ${updates.join(', ')}
            WHERE id = @id AND auditor_org_id = @auditor_org_id
        `, params);

        const updated = await query(`
            SELECT id, auditor_org_id, name, vat_number, sector, address, is_active, created_at, updated_at
            FROM companies WHERE id = @id
        `, { id });

        res.json({ success: true, data: updated.recordset[0] });
    } catch (error) {
        logger.error('[COMPANIES] update error:', error);
        res.status(500).json({ error: 'Errore aggiornamento azienda', code: 'SERVER_ERROR' });
    }
}

/**
 * DELETE /api/v1/companies/:id
 */
async function deleteCompany(req, res) {
    try {
        const auditorOrgId = resolveAuditorOrgId(req);
        if (!auditorOrgId) {
            return res.status(403).json({ error: 'Auditor org richiesto', code: 'AUDITOR_ORG_REQUIRED' });
        }

        const id = parseInt(req.params.id, 10);

        const result = await query(`
            DELETE FROM companies
            OUTPUT DELETED.id
            WHERE id = @id AND auditor_org_id = @auditor_org_id
        `, { id, auditor_org_id: auditorOrgId });

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Azienda non trovata', code: 'NOT_FOUND' });
        }

        res.json({ success: true, deleted_id: id });
    } catch (error) {
        logger.error('[COMPANIES] delete error:', error);
        res.status(500).json({ error: 'Errore eliminazione azienda', code: 'SERVER_ERROR' });
    }
}

module.exports = {
    listCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
};
