'use strict';

require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');

async function request(path, options = {}) {
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const headers = new Headers(options.headers || {});
    const credentials = `${process.env.APP_AUTH_USER}:${process.env.APP_AUTH_PASSWORD}`;

    headers.set(
      'Authorization',
      `Basic ${Buffer.from(credentials).toString('base64')}`
    );

    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      ...options,
      headers,
    });

    const body = await response.json();

    return { response, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /api/orders/:id returns 404 for a missing order', async () => {
  const { response, body } = await request('/api/orders/9999');

  assert.equal(response.status, 404);
  assert.equal(body.error, 'No order with id 9999');
});

test('API rejects requests without authentication', async () => {
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);

    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Basic realm="LaundryLog"');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/orders returns 400 when required fields are missing', async () => {
  const { response, body } = await request('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Validation failed');
  assert.ok(Array.isArray(body.details));
  assert.ok(body.details.length > 0);
});
