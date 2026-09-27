const multer = require('multer');
const path = require('path');

const allowedMimeTypes = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes[ext] === file.mimetype) {
      return cb(null, true);
    }
    
    cb(new Error('Invalid file type or extension'));
  }
}).single('document');

const validateFileSignature = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Document file is required' });
  }

  const buffer = req.file.buffer;
  const ext = path.extname(req.file.originalname).toLowerCase();
  let isValid = false;

  if (ext === '.pdf') {
    isValid = buffer.toString('hex', 0, 5).toUpperCase() === '255044462D';
  } else if (ext === '.jpg' || ext === '.jpeg') {
    isValid = buffer.toString('hex', 0, 3).toUpperCase() === 'FFD8FF';
  } else if (ext === '.png') {
    isValid = buffer.toString('hex', 0, 8).toUpperCase() === '89504E470D0A1A0A';
  }

  if (!isValid) {
    return res.status(400).json({ message: 'Invalid or forged file content' });
  }

  // Sanitize filename: keep only word characters, dots, and hyphens
  let safeName = path.basename(req.file.originalname);
  safeName = safeName.replace(/[^\w.-]/g, '_');
  
  if (safeName.length > 255) {
    const extName = path.extname(safeName);
    const baseName = safeName.substring(0, 255 - extName.length);
    safeName = baseName + extName;
  }

  req.file.safeOriginalName = safeName;
  next();
};

module.exports = {
  upload,
  validateFileSignature
};
