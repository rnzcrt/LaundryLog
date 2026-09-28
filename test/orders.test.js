'use strict';

require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert/strict');
const { splitLoadWeight } = require('../src/utils/loadSplitter');
const {
  calculateServicePrice,
  calculateLoadCount,
  calculateOrderPrice,
} = require('../src/utils/pricing');

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

test('PATCH machine load status rejects completed load from moving back to running', async () => {
  const { response, body } = await request('/api/orders/9/loads/1/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'running' }),
  });

  assert.equal(response.status, 409);
  assert.match(body.error, /completed load can only move to no further status/);
});

test('PATCH machine load status rejects an invalid status value', async () => {
  const { response, body } = await request('/api/orders/9/loads/1/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'invalid' }),
  });

  assert.equal(response.status, 400);
  assert.equal(
    body.error,
    'status must be one of: queued, running, completed',
  );
});

test('splitLoadWeight keeps weights within an 8kg machine capacity', () => {
  assert.deepEqual(splitLoadWeight(18, 8), [8, 8, 2]);
});

test('splitLoadWeight does not split a load already within capacity', () => {
  assert.deepEqual(splitLoadWeight(7, 8), [7]);
});

test('splitLoadWeight handles a 10kg Titan load', () => {
  assert.deepEqual(splitLoadWeight(21, 10), [10, 10, 1]);
});

test('GET order load plan splits an 18kg order for an 8kg machine', async () => {
  const { response, body } = await request(
    '/api/orders/10/load-plan?capacity_kg=8',
  );

  assert.equal(response.status, 200);
  assert.equal(body.order_id, 10);
  assert.equal(body.total_weight_kg, 18);
  assert.equal(body.capacity_kg, 8);
  assert.equal(body.load_count, 3);
  assert.deepEqual(body.loads, [8, 8, 2]);
});

test('GET order load plan splits an 18kg order for a 10kg machine', async () => {
  const { response, body } = await request(
    '/api/orders/10/load-plan?capacity_kg=10',
  );

  assert.equal(response.status, 200);
  assert.equal(body.load_count, 2);
  assert.deepEqual(body.loads, [10, 8]);
});

test('GET order load plan rejects an invalid machine capacity', async () => {
  const { response, body } = await request(
    '/api/orders/10/load-plan?capacity_kg=0',
  );

  assert.equal(response.status, 400);
  assert.equal(
    body.error,
    'capacity_kg must be a number greater than 0',
  );
});

test('calculates regular wash pricing by load', () => {
  assert.equal(calculateServicePrice('wash', 'regular', 2), 140);
});

test('calculates titan dry pricing by load', () => {
  assert.equal(calculateServicePrice('dry', 'titan', 3), 330);
});

test('calculates folding pricing by load', () => {
  assert.equal(calculateServicePrice('fold', 'regular', 4), 80);
});

test('calculates load counts from machine capacity', () => {
  assert.equal(calculateLoadCount(8, 'regular'), 1);
  assert.equal(calculateLoadCount(9, 'regular'), 2);
  assert.equal(calculateLoadCount(10, 'titan'), 1);
  assert.equal(calculateLoadCount(18, 'titan'), 2);
});

test('calculates wash-only order pricing from weight and machine type', () => {
  assert.equal(
    calculateOrderPrice({
      loadType: 'wash_only',
      weightKg: 18,
      washMachineType: 'regular',
    }),
    210,
  );
});

test('calculates wash-fold order pricing from selected machines', () => {
  assert.equal(
    calculateOrderPrice({
      loadType: 'wash_fold',
      weightKg: 8,
      washMachineType: 'regular',
      dryMachineType: 'regular',
    }),
    180,
  );
});