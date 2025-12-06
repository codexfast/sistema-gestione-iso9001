/**
 * Attachment Routes
 */

const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { upload } = require('../config/multer');

// Tutti gli endpoint richiedono autenticazione
router.use(authenticate);

// GET /api/v1/attachments - Lista allegati con filtri
router.get('/attachments', attachmentController.listAttachments);

// GET /api/v1/attachments/:id - Dettagli allegato
router.get('/attachments/:id', attachmentController.getAttachmentById);

// GET /api/v1/attachments/:id/download - Download file
router.get('/attachments/:id/download', attachmentController.downloadAttachment);

// POST /api/v1/attachments/upload - Upload file
// Nota: multer middleware 'upload.single('file')' gestisce multipart/form-data
router.post('/attachments/upload', upload.single('file'), attachmentController.uploadAttachment);

// DELETE /api/v1/attachments/:id - Elimina allegato
router.delete('/attachments/:id', attachmentController.deleteAttachment);

module.exports = router;
