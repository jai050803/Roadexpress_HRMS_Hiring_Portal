const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./src/config');
const { createHiringModule } = require('./src');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler.middleware');

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({
    name: 'Road Express HRMS API (Express Edition)',
    version: '1.0.0',
    status: 'operational',
    hiringModuleEndpoint: '/api/v1/hiring'
  });
});

const hiringModule = createHiringModule();
app.use('/api/v1/hiring', hiringModule.router);
app.use('/api/hiring', hiringModule.router);
app.use('/v1', hiringModule.router);

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`Road Express Hiring Backend running on port ${config.port} in ${config.nodeEnv} mode`);
    console.log(`API root: http://localhost:${config.port}/api/v1/hiring/health`);
  });

  const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
