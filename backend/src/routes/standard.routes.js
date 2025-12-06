/**
 * Standards Routes
 */

const express = require('express');
const router = express.Router();
const standardController = require('../controllers/standard.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Tutti gli endpoint richiedono autenticazione
router.use(authenticate);

// GET /api/v1/standards - Lista standard ISO disponibili
router.get('/standards', standardController.listStandards);

// GET /api/v1/standards/statistics/overview - Statistiche utilizzo standard
router.get('/standards/statistics/overview', standardController.getStandardsStatistics);

// GET /api/v1/standards/:id - Dettagli singolo standard
router.get('/standards/:id', standardController.getStandardById);

module.exports = router;
