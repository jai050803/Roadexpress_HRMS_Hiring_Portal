function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal error occurred';

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: errorCode,
      message,
      details: process.env.NODE_ENV === 'development' ? err.stack : null
    }
  });
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} does not exist`,
      details: null
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
