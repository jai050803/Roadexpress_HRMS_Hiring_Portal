const multer = require('multer');
const config = require('../config');

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

function fileFilter(req, file, cb) {
  const isAllowed = allowedMimeTypes.includes(file.mimetype) ||
    file.originalname.toLowerCase().endsWith('.pdf') ||
    file.originalname.toLowerCase().endsWith('.docx') ||
    file.originalname.toLowerCase().endsWith('.doc');

  if (!isAllowed) {
    const error = new Error('Invalid file type. Only PDF and DOCX files are permitted');
    error.statusCode = 400;
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSize
  },
  fileFilter
});

function verifyMagicBytes(buffer, mimetype) {
  if (mimetype === 'application/pdf' || buffer.slice(0, 4).toString() === '%PDF') {
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      const error = new Error('Corrupted or invalid PDF format');
      error.statusCode = 400;
      error.code = 'CORRUPTED_PDF';
      throw error;
    }
  }
}

module.exports = {
  upload,
  verifyMagicBytes
};
