export const errorHandler = (err, req, res, next) => {
  console.error(`🚨 Error [${req.method} ${req.originalUrl}]:`, err);

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: false,
    message: message,
    data: null,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
