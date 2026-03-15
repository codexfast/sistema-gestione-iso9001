/**
 * Report Template Routes
 * Phase 2 - API template e assegnazioni
 */

const express = require('express');
const router = express.Router();
const reportTemplateController = require('../controllers/reportTemplate.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadTemplate } = require('../config/multer');

router.use(authenticate);

// GET /api/v1/report-templates/resolve?standardId=1 (prima di /report-templates per match corretto)
router.get('/report-templates/resolve', reportTemplateController.resolveTemplate);

// GET /api/v1/report-templates?scope=audit
router.get('/report-templates', reportTemplateController.listTemplates);

// POST /api/v1/report-templates (upload .docx) - admin/auditor
router.post('/report-templates', authorize('admin', 'auditor'), uploadTemplate.single('file'), reportTemplateController.uploadTemplate);

// PUT /api/v1/report-template-assignments/standard/:standardId
router.put('/report-template-assignments/standard/:standardId', reportTemplateController.assignTemplateToStandard);

// PUT /api/v1/report-template-assignments/custom-checklist/:customChecklistId
router.put('/report-template-assignments/custom-checklist/:customChecklistId', reportTemplateController.assignTemplateToCustomChecklist);

module.exports = router;
