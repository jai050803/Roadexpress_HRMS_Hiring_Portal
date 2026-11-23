const express = require('express');
const { upload } = require('../middleware/upload.middleware');

function createResumeRoutes(resumeController, authIntegration) {
  const router = express.Router();

  router.post('/upload', upload.single('resume'), resumeController.uploadResume);
  router.get('/:id', authIntegration.requireAuth(), resumeController.getResume);
  router.get('/:id/presigned-url', authIntegration.requireAuth(), resumeController.getPresignedUrl);
  router.get('/:id/file', authIntegration.requireAuth(), resumeController.streamFile);
  router.get('/:id/view', authIntegration.requireAuth(), resumeController.streamFile);
  router.get('/:id/download', authIntegration.requireAuth(), resumeController.streamFile);

  return router;
}

module.exports = createResumeRoutes;
