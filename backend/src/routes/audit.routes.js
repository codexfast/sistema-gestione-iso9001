/**
 * Audit Routes
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Tutti gli endpoint richiedono autenticazione
router.use(authenticate);

// GET /api/v1/audits - Lista audit con filtri e paginazione
router.get('/audits', auditController.listAudits);

// GET /api/v1/audits/:id - Dettagli audit singolo
router.get('/audits/:id', auditController.getAuditById);

// GET /api/v1/audits/:id/statistics - Statistiche audit (conformità per sezione)
router.get('/audits/:id/statistics', auditController.getAuditStatistics);

// POST /api/v1/audits - Crea nuovo audit
router.post('/audits', auditController.createAudit);

// PUT /api/v1/audits/:id - Aggiorna audit esistente
router.put('/audits/:id', auditController.updateAudit);

// DELETE /api/v1/audits/:id - Elimina audit (soft delete)
router.delete('/audits/:id', auditController.deleteAudit);

module.exports = router;
