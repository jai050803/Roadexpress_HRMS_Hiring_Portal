const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate.middleware');

function createJobRoutes(jobController, authIntegration) {
  const router = express.Router();

  const createJobSchema = z.object({
    title: z.string().min(2, 'Job title is required'),
    department: z.string().min(2, 'Department is required'),
    location: z.string().optional(),
    employment_type: z.enum(['full_time', 'part_time', 'contract', 'internship']).default('full_time'),
    work_mode: z.enum(['remote', 'onsite', 'hybrid']).default('onsite'),
    education_qualification: z.string().optional(),
    min_experience_years: z.number().int().min(0).default(0),
    required_skills: z.array(z.string()).default([]),
    responsibilities_text: z.string().optional(),
    salary_band: z.string().optional(),
    application_deadline: z.string().optional(),
    max_applications: z.number().int().positive().optional()
  });

  const updateJobSchema = createJobSchema.partial();

  const previewContentSchema = z.object({
    title: z.string().min(2, 'Job title is required'),
    department: z.string().min(2, 'Department is required'),
    location: z.string().optional(),
    employment_type: z.enum(['full_time', 'part_time', 'contract', 'internship']).optional(),
    work_mode: z.enum(['remote', 'onsite', 'hybrid']).optional(),
    education_qualification: z.string().optional(),
    min_experience_years: z.number().int().min(0).optional(),
    required_skills: z.array(z.string()).optional(),
    responsibilities_text: z.string().optional(),
    salary_band: z.string().optional(),
    job_id: z.string().optional()
  });

  const optionalAuth = (req, res, next) => {
    const user = authIntegration.extractUser(req);
    if (user) {
      req.hiringUser = user;
    }
    next();
  };

  router.get('/', jobController.listPublished);
  router.get('/all', authIntegration.requireAuth(), jobController.listAll);
  router.get('/metrics', authIntegration.requireAuth(), jobController.getMetrics);
  router.post('/preview-content', authIntegration.requireAuth(), validate(previewContentSchema), jobController.previewContent);
  router.post('/', authIntegration.requireAuth(), validate(createJobSchema), jobController.createJob);

  router.get('/:id', optionalAuth, jobController.getJob);
  router.patch('/:id', authIntegration.requireAuth(), validate(updateJobSchema), jobController.updateDraftJob);
  router.post('/:id/publish', authIntegration.requireAuth(), jobController.publishJob);
  router.post('/:id/close', authIntegration.requireAuth(), jobController.closeJob);
  router.post('/:id/mark-linkedin-posted', authIntegration.requireAuth(), jobController.markLinkedInPosted);

  return router;
}

module.exports = createJobRoutes;
