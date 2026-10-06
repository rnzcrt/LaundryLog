'use strict';

const { HttpError } = require('./httpError');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) { 
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  switch (err.code) {
    case '23505': 
      return res.status(409).json({
        error: 'That record already exists',
        message: 'A unique field is already taken.',
      });
    case '23503': 
      return res.status(400).json({
        error: 'Referenced record does not exist',
        message: 'A referenced id was not found.',
      });
    case '23514':
      return res.status(400).json({
        error: 'Value rejected by the database',
        message: 'One or more values do not meet the data rules.',
      });
    case '22P02': 
      return res.status(400).json({ error: 'Invalid value in request' });
    case 'ECONNREFUSED':
      console.error('Database connection refused:', err.message);
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'The server could not reach Postgres. Check that it is running and DATABASE_URL is correct.',
      });
    default:
      break;
  }

  console.error('Unhandled error:', err.message || 'Unknown error');
  res.status(500).json({ error: 'Something went wrong on the server' });
}

module.exports = { errorHandler, notFoundHandler };
