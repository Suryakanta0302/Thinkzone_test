export function notFound(_request, _response, next) {
  const error = new Error('Route not found');
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
}

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return;
  const status = error.status || 500;
  response.status(status).json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'An unexpected server error occurred' : error.message,
    },
  });
}
