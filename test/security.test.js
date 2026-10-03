'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnvironment } = require('../src/config');
const { createBasicAuth } = require('../src/middleware/basicAuth');
const { errorHandler } = require('../src/middleware/errorHandler');
const {
  validateCustomerUpdate,
  validateNewCustomer,
  validateNewOrder,
  validatePayment,
} = require('../src/validators/orderValidators');

function responseStub() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('startup configuration requires database and Basic Auth variables without echoing values', () => {
  assert.throws(() => validateEnvironment({}), (error) => {
    assert.match(error.message, /DATABASE_URL/);
    assert.match(error.message, /APP_AUTH_USER/);
    assert.match(error.message, /APP_AUTH_PASSWORD/);
    assert.doesNotMatch(error.message, /secret|password123/i);
    return true;
  });

  assert.deepEqual(validateEnvironment({
    DATABASE_URL: 'postgres://example',
    APP_AUTH_USER: 'counter',
    APP_AUTH_PASSWORD: 'example-only',
  }), {
    databaseUrl: 'postgres://example',
    authUser: 'counter',
    authPassword: 'example-only',
  });
});

test('Basic Auth rejects missing and wrong credentials and accepts a valid pair', () => {
  const expected = { APP_AUTH_USER: 'counter', APP_AUTH_PASSWORD: 'example-only' };
  const invoke = (header, env = expected) => {
    const req = { get: () => header };
    const res = responseStub();
    let continued = false;
    createBasicAuth(env)(req, res, () => { continued = true; });
    return { req, res, continued };
  };

  const missing = invoke(undefined);
  assert.equal(missing.res.statusCode, 401);
  assert.equal(missing.res.headers['WWW-Authenticate'], 'Basic realm="LaundryLog"');

  const invalid = invoke(`Basic ${Buffer.from('counter:wrong').toString('base64')}`);
  assert.equal(invalid.res.statusCode, 401);

  const valid = invoke(`Basic ${Buffer.from('counter:example-only').toString('base64')}`);
  assert.equal(valid.continued, true);
  assert.equal(valid.res.statusCode, 200);

  const unconfigured = invoke(undefined, {});
  assert.equal(unconfigured.res.statusCode, 500);
  assert.doesNotMatch(JSON.stringify(unconfigured.res.body), /example-only/);
});

test('order and customer text validation rejects non-text and oversized input', () => {
  assert.throws(() => validateNewCustomer({
    name: 'x'.repeat(121),
    phone: '09175550142',
  }), (error) => error.details.some((detail) => /name must be 120 characters or fewer/.test(detail.message)));

  assert.throws(() => validateNewCustomer({
    name: 'Maria',
    phone: 9175550142,
  }), (error) => error.details.some((detail) => /phone must be text/.test(detail.message)));

  assert.throws(() => validateNewOrder({
    name: 'Maria',
    phone: '09175550142',
    load_type: 'wash_fold',
    weight_kg: 4,
    wash_machine_type: 'regular',
    dry_machine_type: 'regular',
    note: 'x'.repeat(501),
  }), (error) => error.details.some((detail) => /note must be 500 characters or fewer/.test(detail.message)));

  assert.throws(() => validateNewOrder(null), (error) =>
    error.details.some((detail) => /JSON object/.test(detail.message)),
  );
  assert.throws(() => validateNewOrder({
    name: 'Maria',
    phone: '09175550142',
    load_type: 'wash_only',
    weight_kg: 1,
    wash_machine_type: 'regular',
    due_date: '2026-02-30',
  }), (error) => error.details.some((detail) => /valid date/.test(detail.message)));
});

test('database constraint errors do not return database details', () => {
  const res = responseStub();
  errorHandler({ code: '23505', detail: 'duplicate value for customer phone 09175550142' }, {}, res, () => {});
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, 'A unique field is already taken.');
  assert.doesNotMatch(JSON.stringify(res.body), /09175550142/);
});

test('customer updates require valid supplied fields and can clear notes', () => {
  assert.throws(() => validateCustomerUpdate({}), /Validation failed/);
  assert.deepEqual(validateCustomerUpdate({ notes: null }), { notes: null });
  assert.throws(
    () => validateCustomerUpdate({ phone: 'x'.repeat(41) }),
    (error) => error.details.some((detail) => /phone must be 40 characters/.test(detail.message)),
  );
});

test('payment validation rejects fractions smaller than one cent', () => {
  assert.throws(
    () => validatePayment({ amount: 1.001, method: 'cash' }),
    (error) => error.details.some((detail) => /two decimal places/.test(detail.message)),
  );
  assert.deepEqual(validatePayment({ amount: 1.25, method: 'gcash' }), {
    amount: 1.25,
    method: 'gcash',
  });
});

test('error handler returns 400 for malformed JSON and 413 for oversized bodies', () => {
  const quiet = () => {};
  const originalError = console.error;
  console.error = quiet;
  try {
    const malformed = responseStub();
    errorHandler(Object.assign(new SyntaxError('bad json'), { type: 'entity.parse.failed' }), {}, malformed, quiet);
    assert.equal(malformed.statusCode, 400);
    assert.deepEqual(malformed.body, { error: 'Request body is not valid JSON' });

    const tooLarge = responseStub();
    errorHandler(Object.assign(new Error('too large'), { type: 'entity.too.large' }), {}, tooLarge, quiet);
    assert.equal(tooLarge.statusCode, 413);
    assert.deepEqual(tooLarge.body, { error: 'Request body is too large' });
  } finally {
    console.error = originalError;
  }
});
