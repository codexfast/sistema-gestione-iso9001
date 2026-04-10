/**
 * alert.routes.js — Rotte Alert Engine
 */

const express    = require('express');
const router     = express.Router();
const { authenticate } = require('../middleware/auth');
const alertCtrl  = require('../controllers/alert.controller');

router.use(authenticate);

router.get('/alerts/count', alertCtrl.getAlertCount);
router.get('/alerts',       alertCtrl.getAlerts);

module.exports = router;
