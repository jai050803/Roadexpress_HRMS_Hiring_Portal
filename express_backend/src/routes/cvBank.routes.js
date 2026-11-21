const express = require('express');

function createCVBankRoutes(cvBankController, authIntegration) {
  const router = express.Router();

  router.get('/', authIntegration.requireAuth(), cvBankController.search);
  router.get('/export', authIntegration.requireAuth(), cvBankController.exportCsv);

  return router;
}

module.exports = createCVBankRoutes;
