const express = require('express');
const { z } = require('zod');
const { upload } = require('../middleware/upload.middleware');
const { validate } = require('../middleware/validate.middleware');

function createApplicationRoutes(applicationController, authIntegration, interviewController = null) {
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
  router.post('/upload', upload.single('resume'), applicationController.apply);
  router.post('/', upload.single('resume'), applicationController.apply);
  router.post('/bulk-shortlist', authIntegration.requireAuth(), applicationController.bulkShortlist);
  router.post('/bulk-reject', authIntegration.requireAuth(), applicationController.bulkReject);
  router.get('/', authIntegration.requireAuth(), applicationController.listApplications);
  router.get('/pipeline-metrics', authIntegration.requireAuth(), applicationController.getPipelineMetrics);
  router.get('/:id', authIntegration.requireAuth(), applicationController.getApplication);
  router.patch('/:id/status', authIntegration.requireAuth(), validate(updateStatusSchema), applicationController.updateStatus);
  router.patch('/:id/shortlist', authIntegration.requireAuth(), applicationController.shortlist);
  router.patch('/:id/reject', authIntegration.requireAuth(), applicationController.reject);
  router.patch('/:id/screen', authIntegration.requireAuth(), applicationController.triggerScreening);
  router.post('/:id/screen', authIntegration.requireAuth(), applicationController.triggerScreening);
  router.post('/:id/offer', authIntegration.requireAuth(), applicationController.makeOffer);
  router.post('/:id/accept-offer', authIntegration.requireAuth(), applicationController.acceptOffer);
  router.post('/:id/decline-offer', authIntegration.requireAuth(), applicationController.declineOffer);
  router.post('/:id/lapse-offer', authIntegration.requireAuth(), applicationController.lapseOffer);

  if (interviewController) {
    router.get('/:id/interviews', authIntegration.requireAuth(), interviewController.getApplicationInterviews);
  }

  return router;
}

module.exports = createApplicationRoutes;
