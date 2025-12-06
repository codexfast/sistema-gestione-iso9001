/**
 * Rate Limiting Middleware
 * Previene brute-force e abusi
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter per login
 * Max 5 tentativi ogni 15 minuti
 */
const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // Max 5 richieste
    message: {
        error: 'Troppi tentativi di login. Riprova tra 15 minuti.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false // Disable `X-RateLimit-*` headers
});

/**
 * Rate limiter generico per API
 * Max 100 richieste ogni 15 minuti
 */
const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Troppe richieste. Riprova più tardi.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginRateLimit,
    apiRateLimit
};
