const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams per accedere a :companyId
const { authenticate } = require('../middleware/auth.middleware');
const {
  listFindings, createFinding, updateFinding, deleteFinding
} = require('../controllers/certificationFindings.controller');

// Tutte le route richiedono autenticazione
router.use(authenticate);

router.get('/',                   listFindings);
router.post('/',                  createFinding);
router.put('/:findingId',         updateFinding);
router.delete('/:findingId',      deleteFinding);

module.exports = router;
