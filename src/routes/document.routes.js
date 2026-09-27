const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const { upload, validateFileSignature } = require('../middleware/upload.middleware');
const { uploadDocument, listDocuments, downloadDocument, deleteDocument } = require('../controllers/document.controller');

router.post(
  '/upload',
  authenticate,
  upload,
  validateFileSignature,
  uploadDocument
);

router.get('/', authenticate, listDocuments);
router.get('/:id/download', authenticate, downloadDocument);
router.delete('/:id', authenticate, deleteDocument);

module.exports = router;
