/**
 * Auth Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
// const { loginRateLimit } = require('../middleware/rateLimit.middleware'); // TODO: riabilitare dopo test

// POST /api/v1/auth/register - Registrazione nuovo utente
router.post('/auth/register', authController.register);

// POST /api/v1/auth/login - Rate limit disabilitato durante test (riabilitare in produzione)
router.post('/auth/login', authController.login);

// POST /api/v1/auth/refresh - Rinnova token JWT
router.post('/auth/refresh', authController.refreshToken);

// GET /api/v1/auth/me - Dati utente corrente (protetto)
router.get('/auth/me', authenticate, authController.getCurrentUser);

module.exports = router;
