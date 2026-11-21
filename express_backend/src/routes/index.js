const express = require('express');
const { checkConnection } = require('../database/connection');
const createAuthRoutes = require('./auth.routes');
const createJobRoutes = require('./job.routes');
const createCandidateRoutes = require('./candidate.routes');
const createResumeRoutes = require('./resume.routes');
const createApplicationRoutes = require('./application.routes');
const createInterviewRoutes = require('./interview.routes');
const createCVBankRoutes = require('./cvBank.routes');

function createHiringRouter({ controllers, integrations }) {
  const router = express.Router();

  router.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
      await checkConnection();
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error: ' + err.message;
    }

    res.json({
      success: true,
      data: {
        module: 'Road Express Hiring Portal',
        version: '1.0.0',
        status: 'operational',
        database: dbStatus,
        timestamp: new Date().toISOString()
      },
      error: null
    });
  });

  if (controllers.authController && integrations.authIntegration) {
    router.use('/auth', createAuthRoutes(controllers.authController, integrations.authIntegration));
  }

  if (controllers.jobController && integrations.authIntegration) {
    router.use('/jobs', createJobRoutes(controllers.jobController, integrations.authIntegration));
  }

  if (controllers.candidateController && integrations.authIntegration) {
    router.use('/candidates', createCandidateRoutes(controllers.candidateController, integrations.authIntegration));
  }

  if (controllers.resumeController && integrations.authIntegration) {
    router.use('/resumes', createResumeRoutes(controllers.resumeController, integrations.authIntegration));
  }

  if (controllers.applicationController && integrations.authIntegration) {
    router.use('/applications', createApplicationRoutes(controllers.applicationController, integrations.authIntegration, controllers.interviewController));
  }

  if (controllers.interviewController && integrations.authIntegration) {
    router.use('/interviews', createInterviewRoutes(controllers.interviewController, integrations.authIntegration));
  }

  if (controllers.cvBankController && integrations.authIntegration) {
    router.use('/cv-bank', createCVBankRoutes(controllers.cvBankController, integrations.authIntegration));
  }

  return router;
}

module.exports = createHiringRouter;
