'use strict';

/**
 * An error with an HTTP status attached, so route code can say what went wrong
 * and the error handler stays the only place that formats a response.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details) this.details = details;
  }
}

/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * handler instead of hanging the request.
 */
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { HttpError, asyncHandler };
