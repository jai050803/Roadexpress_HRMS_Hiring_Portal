const express = require('express');
const { z } = require('zod');
const { upload } = require('../middleware/upload.middleware');
const { validate } = require('../middleware/validate.middleware');

function createApplicationRoutes(applicationController, authIntegration) {
  const router = express.Router();

  const updateStatusSchema = z.object({
    status: z.enum([
      'APPLIED',
      'SCREENING',
      'SHORTLISTED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'OFFER_EXTENDED',
      'HIRED',
      'REJECTED'
    ]),
    reason: z.string().optional(),
    remarks: z.string().optional()
  });

  router.get('/track', applicationController.track);
  router.post('/apply', upload.single('resume'), applicationController.apply);
  router.post('/', upload.single('resume'), applicationController.apply);
  router.get('/', authIntegration.requireAuth(), applicationController.listApplications);
  router.get('/pipeline-metrics', authIntegration.requireAuth(), applicationController.getPipelineMetrics);
  router.get('/:id', authIntegration.requireAuth(), applicationController.getApplication);
  router.patch('/:id/status', authIntegration.requireAuth(), validate(updateStatusSchema), applicationController.updateStatus);
  router.post('/:id/screen', authIntegration.requireAuth(), applicationController.triggerScreening);

  return router;
}

module.exports = createApplicationRoutes;
