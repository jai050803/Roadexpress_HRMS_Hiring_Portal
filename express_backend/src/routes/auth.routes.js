const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate.middleware');

function createAuthRoutes(authController, authIntegration) {
  const router = express.Router();

  const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  });

  const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Full name is required'),
    role: z.enum(['admin', 'recruiter', 'interviewer']).default('recruiter')
  });

  router.post('/login', validate(loginSchema), authController.login);
  router.post('/register', validate(registerSchema), authController.register);
  router.get('/me', authIntegration.requireAuth(), authController.getMe);

  return router;
}

module.exports = createAuthRoutes;
