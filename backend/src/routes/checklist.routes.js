/**
 * Routes: Checklist
 */

const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklist.controller');

// GET /api/v1/standards - Lista standard disponibili
router.get('/standards', checklistController.getAllStandards);

// GET /api/v1/checklist/sections?standard_id=1 - Sezioni per standard
router.get('/checklist/sections', checklistController.getSections);

// GET /api/v1/checklist/questions?standard_id=1&section_code=4.1 - Domande per sezione
router.get('/checklist/questions', checklistController.getQuestions);

module.exports = router;
