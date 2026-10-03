'use strict';

const crypto = require('crypto');

const BASIC_PREFIX = 'Basic ';

/** Compares two strings in constant time (after checking the lengths match). */
function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/** Every failed login gets the same 401 + challenge, only the message differs. */
function rejectWith(res, message) {
  res.set('WWW-Authenticate', 'Basic realm="LaundryLog"');
  return res.status(401).json({ error: message });
}

/**
 * Splits an "Authorization: Basic ..." header into { username, password }.
 * Returns null when the header is not valid Basic credentials.
 */
function parseBasicHeader(header) {
  const decoded = Buffer.from(header.slice(BASIC_PREFIX.length), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator === -1) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function createBasicAuth(env = process.env) {
  return function basicAuth(req, res, next) {
    const expectedUser = env.APP_AUTH_USER;
    const expectedPassword = env.APP_AUTH_PASSWORD;

    if (!expectedUser || !expectedPassword) {
      return res.status(500).json({ error: 'Authentication is not configured' });
    }

    const header = req.get('Authorization');
    if (!header || !header.startsWith(BASIC_PREFIX)) {
      return rejectWith(res, 'Authentication required');
    }

    const credentials = parseBasicHeader(header);
    if (!credentials) {
      return rejectWith(res, 'Invalid authentication');
    }

    // Both comparisons always run so a wrong username takes as long as a wrong password.
    const userMatches = safeEqual(credentials.username, expectedUser);
    const passwordMatches = safeEqual(credentials.password, expectedPassword);
    if (!userMatches || !passwordMatches) {
      return rejectWith(res, 'Invalid credentials');
    }

    next();
  };
}

module.exports = createBasicAuth();
module.exports.createBasicAuth = createBasicAuth;
