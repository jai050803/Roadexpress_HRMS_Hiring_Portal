const express = require('express');
const { checkConnection } = require('../database/connection');
const createAuthRoutes = require('./auth.routes');

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

  return router;
}

module.exports = createHiringRouter;
