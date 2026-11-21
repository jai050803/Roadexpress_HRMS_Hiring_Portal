const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate.middleware');

function createInterviewRoutes(interviewController, authIntegration) {
  const router = express.Router();

  const scheduleSchema = z.object({
    application_id: z.string().uuid('Valid application UUID is required'),
    round_number: z.number().int().min(1).default(1),
    round_name: z.string().min(2).default('Technical Round'),
    scheduled_at: z.string().datetime().or(z.string().min(10)),
    duration_minutes: z.number().int().min(15).max(240).default(45),
    mode: z.enum(['video', 'phone', 'in_person']).default('video'),
    location: z.string().optional(),
    meeting_link: z.string().url().optional().or(z.literal('')),
    interviewer_id: z.string().uuid().optional(),
    interviewer_name: z.string().optional(),
    interviewer_email: z.string().email().optional(),
    hr_notes: z.string().optional()
  });

  const rescheduleSchema = z.object({
    scheduled_at: z.string().min(10),
    meeting_link: z.string().url().optional().or(z.literal('')),
    hr_notes: z.string().optional()
  });

  const cancelSchema = z.object({
    cancellation_reason: z.string().min(3, 'Cancellation reason is required')
  });

  const feedbackSchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    overall_rating: z.number().int().min(1).max(5).optional(),
    technical_skills: z.number().int().min(1).max(5).optional(),
    technical_rating: z.number().int().min(1).max(5).optional(),
    communication_skills: z.number().int().min(1).max(5).optional(),
    communication_rating: z.number().int().min(1).max(5).optional(),
    problem_solving: z.number().int().min(1).max(5).optional(),
    culture_rating: z.number().int().min(1).max(5).optional(),
    recommendation: z.enum(['strong_hire', 'hire', 'hold', 'no_hire', 'strong_no_hire']).optional(),
    decision: z.enum(['proceed', 'hold', 'reject']).optional(),
    comments: z.string().optional(),
    strengths: z.string().optional(),
    concerns: z.string().optional(),
    additional_notes: z.string().optional()
  });

  router.post('/', authIntegration.requireAuth(), validate(scheduleSchema), interviewController.scheduleInterview);
  router.get('/', authIntegration.requireAuth(), interviewController.listInterviews);
  router.get('/today', authIntegration.requireAuth(), interviewController.getTodayInterviews);
  router.get('/:id', authIntegration.requireAuth(), interviewController.getInterview);
  router.patch('/:id/reschedule', authIntegration.requireAuth(), validate(rescheduleSchema), interviewController.reschedule);
  router.post('/:id/cancel', authIntegration.requireAuth(), validate(cancelSchema), interviewController.cancel);
  router.post('/:id/complete', authIntegration.requireAuth(), interviewController.markCompleted);
  router.post('/:id/no-show', authIntegration.requireAuth(), interviewController.markNoShow);
  router.post('/:id/feedback', authIntegration.requireAuth(), validate(feedbackSchema), interviewController.submitFeedback);
  router.get('/application/:id', authIntegration.requireAuth(), interviewController.getApplicationInterviews);
  router.post('/handoff/:id', authIntegration.requireAuth(), interviewController.handoffCandidate);

  return router;
}

module.exports = createInterviewRoutes;
