'use strict';

const { HttpError } = require('./httpError');

/** Anything reaching here asked for a route that does not exist. */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

/**
 * The single place that turns an error into a response.
 * Postgres constraint violations are translated here so the API returns a
 * useful status instead of a blanket 500.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({
        error: 'That record already exists',
        message: err.detail || 'A unique field is already taken.',
      });
    case '23503': // foreign_key_violation
      return res.status(400).json({
        error: 'Referenced record does not exist',
        message: err.detail || 'A referenced id was not found.',
      });
    case '23514': // check_violation
      return res.status(400).json({
        error: 'Value rejected by the database',
        message: err.constraint || 'A check constraint failed.',
      });
    case '22P02': // invalid_text_representation
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

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on the server' });
}

module.exports = { errorHandler, notFoundHandler };
