/**
 * Routes: Sync
 */

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { authenticate } = require('../middleware/auth.middleware');

// POST /api/v1/sync/audits - Sincronizza audit offline → online (protetto)
router.post('/sync/audits', authenticate, syncController.syncAudits);

// POST /api/v1/sync/metadata - Aggiorna sync metadata (protetto)
router.post('/sync/metadata', authenticate, syncController.updateSyncMetadata);

module.exports = router;
