/**
 * Response Routes
 * Gestisce salvataggio e recupero risposte checklist per audit
 * 
 * Tutti gli endpoint richiedono autenticazione.
 * L'isolamento multi-tenant è garantito tramite organization_id dell'utente.
 */

const express = require('express');
const router = express.Router();
const responseController = require('../controllers/response.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Tutti gli endpoint richiedono autenticazione
router.use(authenticate);

// GET /api/v1/audits/:auditId/responses - Lista tutte le risposte per un audit
router.get('/audits/:auditId/responses', responseController.getAuditResponses);

// POST /api/v1/audits/:auditId/responses - Salva/aggiorna singola risposta
router.post('/audits/:auditId/responses', responseController.saveResponse);

// POST /api/v1/audits/:auditId/responses/bulk - Salva multiple risposte (sync offline)
router.post('/audits/:auditId/responses/bulk', responseController.bulkSaveResponses);

// DELETE /api/v1/audits/:auditId/responses/:questionId - Elimina risposta
router.delete('/audits/:auditId/responses/:questionId', responseController.deleteResponse);

module.exports = router;
