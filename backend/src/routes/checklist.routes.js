/**
 * Routes: Checklist
 * 
 * NOTA MULTI-TENANT:
 * Gli endpoint checklist (standards, sections, questions) sono PUBBLICI.
 * Questi dati sono "master data" condivisi tra tutte le organizzazioni.
 * Non richiedono autenticazione perché sono template/riferimenti ISO comuni.
 * 
 * L'isolamento multi-tenant avviene a livello:
 * - Audit (organization_id)
 * - Risposte audit (audit_responses via audit.organization_id)
 * - Non conformità (via audit.organization_id)
 */

const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklist.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// NOTA: La route /standards è stata spostata in standard.routes.js
// per gestione più completa con autenticazione

// GET /api/v1/checklist/sections?standard_id=1 - Sezioni per standard (PUBBLICO)
router.get('/checklist/sections', checklistController.getSections);

// GET /api/v1/checklist/questions?standard_id=1&section_code=4.1 - Domande per sezione (PUBBLICO)
router.get('/checklist/questions', checklistController.getQuestions);

// ── Endpoint Admin (autenticazione richiesta) ──────────────────────────────

// GET /api/v1/checklist/questions/all?standard_id=2
// Tutte le domande di uno standard con norm_excerpt — solo admin/superadmin
router.get(
    '/checklist/questions/all',
    authenticate,
    authorize('superadmin', 'admin'),
    checklistController.getAllQuestionsWithExcerpt
);

// PATCH /api/v1/checklist/questions/:id
// Aggiorna norm_excerpt (e opzionalmente question_text) — solo admin/superadmin
router.patch(
    '/checklist/questions/:id',
    authenticate,
    authorize('superadmin', 'admin'),
    checklistController.updateQuestion
);

module.exports = router;
