/**
 * API lock audit — pessimistic lock con TTL
 */

const auditLockService = require('../services/auditLock.service');

/**
 * GET /audits/:auditRef/lock/status
 */
async function getLockStatus(req, res) {
    try {
        const { auditRef } = req.params;
        const data = await auditLockService.getLockStatus(req.user, auditRef);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'AUDIT_LOCK_STATUS_ERROR' });
    }
}

/**
 * POST /audits/:auditRef/lock — acquisisce lock (stesso utente: sostituisce token precedente)
 */
async function acquireLock(req, res) {
    try {
        const { auditRef } = req.params;
        const result = await auditLockService.acquireLock(req.user, auditRef);
        if (!result.ok) {
            return res.status(result.status).json({
                error: result.message,
                code: result.code,
                locked_by_name: result.locked_by_name,
            });
        }
        res.json({
            success: true,
            data: {
                lock_token: result.lock_token,
                expires_at: result.expires_at,
                audit_id: result.audit_id,
                audit_uuid: result.audit_uuid,
                ttl_minutes: auditLockService.TTL_MINUTES,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'AUDIT_LOCK_ACQUIRE_ERROR' });
    }
}

/**
 * PUT /audits/:auditRef/lock — heartbeat: rinnova TTL (header X-Audit-Lock-Token)
 */
async function renewLock(req, res) {
    try {
        const { auditRef } = req.params;
        const token = auditLockService.getLockTokenFromRequest(req);
        const result = await auditLockService.renewLock(req.user, auditRef, token);
        if (!result.ok) {
            return res.status(result.status).json({ error: result.message, code: result.code });
        }
        res.json({
            success: true,
            data: { expires_at: result.expires_at, ttl_minutes: auditLockService.TTL_MINUTES },
        });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'AUDIT_LOCK_RENEW_ERROR' });
    }
}

/**
 * DELETE /audits/:auditRef/lock — rilascio esplicito
 */
async function releaseLock(req, res) {
    try {
        const { auditRef } = req.params;
        const token = auditLockService.getLockTokenFromRequest(req);
        const result = await auditLockService.releaseLock(req.user, auditRef, token);
        res.json({ success: true, data: { released: result.released } });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'AUDIT_LOCK_RELEASE_ERROR' });
    }
}

module.exports = {
    getLockStatus,
    acquireLock,
    renewLock,
    releaseLock,
};
