/**
 * Admin routes - Gestione utenti e assegnazione standard (solo admin)
 */

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/admin/users', adminController.listUsers);
router.post('/admin/users', adminController.createUser);
router.patch('/admin/users/:id', adminController.updateUser);
router.delete('/admin/users/:id', adminController.deactivateUser);
router.put('/admin/users/:id/standards', adminController.updateUserStandards);

module.exports = router;
