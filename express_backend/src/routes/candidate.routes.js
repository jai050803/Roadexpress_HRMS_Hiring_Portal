const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate.middleware');

function createCandidateRoutes(candidateController, authIntegration) {
  const router = express.Router();

  const candidateUpsertSchema = z.object({
    name: z.string().min(2, 'Candidate name is required'),
    email: z.string().email('Valid email address is required'),
    phone: z.string().optional(),
    location: z.string().optional(),
    current_title: z.string().optional(),
    total_experience_years: z.number().min(0).optional(),
    skills: z.array(z.string()).optional(),
    linkedin_url: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
    portfolio_url: z.string().url('Invalid portfolio URL').optional().or(z.literal(''))
  });

  router.get('/', authIntegration.requireAuth(), candidateController.listCandidates);
  router.get('/:id', authIntegration.requireAuth(), candidateController.getCandidate);
  router.post('/', validate(candidateUpsertSchema), candidateController.upsertCandidate);

  return router;
}

module.exports = createCandidateRoutes;
