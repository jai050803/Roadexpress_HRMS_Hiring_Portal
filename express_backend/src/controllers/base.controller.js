class BaseController {
  sendSuccess(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      error: null
    });
  }

  sendCreated(res, data, message = 'Resource created successfully') {
    return this.sendSuccess(res, data, message, 201);
  }

  sendError(res, message = 'An error occurred', statusCode = 500, details = null, code = 'INTERNAL_ERROR') {
    return res.status(statusCode).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        details
      }
    });
  }
}

module.exports = BaseController;
