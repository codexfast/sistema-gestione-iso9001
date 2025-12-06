/**
 * Auth Middleware
 * Verifica JWT e gestisce autorizzazioni
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'sgq-iso9001-secret-change-in-production';

/**
 * Middleware: Verifica JWT e autentica utente
 * 
 * Attacca a req.user i dati decodificati dal token:
 * - user_id
 * - email
 * - role
 * - organization_id
 */
function authenticate(req, res, next) {
    try {
        // Estrai token da header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Auth: Token mancante', {
                ip: req.ip,
                path: req.path
            });

            return res.status(401).json({
                error: 'Token di autenticazione mancante',
                code: 'AUTH_TOKEN_MISSING'
            });
        }

        const token = authHeader.substring(7); // Rimuovi "Bearer "

        // Verifica token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verifica campi obbligatori nel payload
        if (!decoded.user_id || !decoded.organization_id) {
            logger.error('Auth: Token malformato', { decoded });

            return res.status(401).json({
                error: 'Token non valido',
                code: 'AUTH_TOKEN_INVALID'
            });
        }

        // Attacca dati utente alla request
        req.user = {
            user_id: decoded.user_id,
            email: decoded.email,
            role: decoded.role || 'auditor',
            organization_id: decoded.organization_id
        };

        logger.debug('Auth: Utente autenticato', {
            user_id: req.user.user_id,
            org_id: req.user.organization_id,
            path: req.path
        });

        next();

    } catch (error) {
        // Token scaduto
        if (error.name === 'TokenExpiredError') {
            logger.warn('Auth: Token scaduto', {
                expiredAt: error.expiredAt,
                ip: req.ip
            });

            return res.status(401).json({
                error: 'Token scaduto',
                code: 'AUTH_TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        }

        // Token non valido
        if (error.name === 'JsonWebTokenError') {
            logger.warn('Auth: Token non valido', {
                message: error.message,
                ip: req.ip
            });

            return res.status(401).json({
                error: 'Token non valido',
                code: 'AUTH_TOKEN_INVALID'
            });
        }

        // Errore generico
        logger.error('Auth: Errore verifica token', {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            error: 'Errore durante autenticazione',
            code: 'AUTH_ERROR'
        });
    }
}

/**
 * Middleware: Verifica ruolo utente
 * 
 * @param {string[]} allowedRoles - Ruoli autorizzati (es. ['admin', 'auditor'])
 * @returns {Function} Express middleware
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
        // authenticate deve essere chiamato prima
        if (!req.user) {
            logger.error('Authorize: req.user non presente (authenticate non chiamato?)');

            return res.status(500).json({
                error: 'Errore configurazione middleware',
                code: 'MIDDLEWARE_ERROR'
            });
        }

        const userRole = req.user.role;

        // Verifica ruolo
        if (!allowedRoles.includes(userRole)) {
            logger.warn('Authorize: Accesso negato', {
                user_id: req.user.user_id,
                userRole,
                allowedRoles,
                path: req.path
            });

            return res.status(403).json({
                error: 'Accesso negato: ruolo insufficiente',
                code: 'AUTH_FORBIDDEN',
                requiredRoles: allowedRoles
            });
        }

        logger.debug('Authorize: Accesso consentito', {
            user_id: req.user.user_id,
            role: userRole,
            path: req.path
        });

        next();
    };
}

/**
 * Middleware: Verifica che l'utente appartenga all'organizzazione richiesta
 * 
 * Utile per endpoint con :organization_id in URL
 */
function verifyOrganization(req, res, next) {
    const urlOrgId = parseInt(req.params.organization_id, 10);
    const userOrgId = req.user.organization_id;

    // Admin possono accedere a tutte le organizzazioni
    if (req.user.role === 'admin') {
        return next();
    }

    // Verifica corrispondenza
    if (urlOrgId !== userOrgId) {
        logger.warn('VerifyOrg: Tentativo accesso altra organizzazione', {
            user_id: req.user.user_id,
            userOrgId,
            requestedOrgId: urlOrgId,
            path: req.path
        });

        return res.status(403).json({
            error: 'Accesso negato: organizzazione diversa',
            code: 'AUTH_ORGANIZATION_MISMATCH'
        });
    }

    next();
}

module.exports = {
    authenticate,
    authorize,
    verifyOrganization
};
