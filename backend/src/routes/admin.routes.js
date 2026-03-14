/**
 * Admin routes - Gestione utenti e assegnazione standard (solo admin)
 */

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/admin/users', adminController.listUsers);
router.put('/admin/users/:id/standards', adminController.updateUserStandards);

module.exports = router;
