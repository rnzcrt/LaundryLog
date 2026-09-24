'use strict';

function basicAuth(req, res, next) {
  const expectedUser = process.env.APP_AUTH_USER;
  const expectedPassword = process.env.APP_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return res.status(500).json({ error: 'Authentication is not configured' });
  }

  const header = req.get('Authorization');

  if (!header || !header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="LaundryLog"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const encoded = header.slice('Basic '.length);

  let decoded;

  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    res.set('WWW-Authenticate', 'Basic realm="LaundryLog"');
    return res.status(401).json({ error: 'Invalid authentication' });
  }

  const separator = decoded.indexOf(':');

  if (separator === -1) {
    res.set('WWW-Authenticate', 'Basic realm="LaundryLog"');
    return res.status(401).json({ error: 'Invalid authentication' });
  }

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  if (username !== expectedUser || password !== expectedPassword) {
    res.set('WWW-Authenticate', 'Basic realm="LaundryLog"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
}

module.exports = basicAuth;
