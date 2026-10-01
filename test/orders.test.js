'use strict';

require('dotenv').config();

const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://127.0.0.1:1/laundrylog_test';
process.env.APP_AUTH_USER = process.env.TEST_APP_AUTH_USER || 'laundrylog-test';
process.env.APP_AUTH_PASSWORD = process.env.TEST_APP_AUTH_PASSWORD || 'test-only-password';
const { splitLoadWeight } = require('../src/utils/loadSplitter');
const {
  calculateServicePrice,
  calculateLoadCount,
  calculateOrderPrice,
} = require('../src/utils/pricing');

const app = require('../src/app');
const db = require('../src/db');
const { assertCurrentSchema } = require('../db/migrate');
const { validateCompletionChoices } = require('../src/utils/orderWorkflow');
const { validateStatusChange } = require('../src/validators/orderValidators');
let fixtureSequence = 0;

function nextFixtureSuffix() {
  fixtureSequence += 1;
  return `${process.pid}-${Date.now()}-${fixtureSequence}`;
}

function nextFixturePhone() {
  fixtureSequence += 1;
  return `09${String(Date.now()).slice(-8)}${String(fixtureSequence % 100).padStart(2, '0')}`;
}

async function createMachineFixture({ kind, type, capacity }) {
  const name = `Test ${kind} ${type} ${nextFixtureSuffix()}`;
  const created = await request('/api/machines', {
    method: 'POST',
    body: JSON.stringify({
      name,
      machine_type: type,
      machine_kind: kind,
      capacity_kg: capacity,
    }),
  });
  assert.equal(created.response.status, 201, created.body.error);
  return created.body.machine;
}

async function createOrderFixture({ name, loadType, weightKg, phone = nextFixturePhone(), ...fields }) {
  const created = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name,
      phone,
      load_type: loadType,
      weight_kg: weightKg,
      ...fields,
    }),
  });
  assert.equal(created.response.status, 201, created.body.error);
  return created.body.order;
}

async function findEmptyReportWindow(dayCount) {
  const { rows } = await db.query(
    `SELECT DISTINCT report_day::text AS day
     FROM (
       SELECT (created_at AT TIME ZONE 'Asia/Manila')::date AS report_day FROM orders
       UNION ALL
       SELECT (paid_at AT TIME ZONE 'Asia/Manila')::date AS report_day FROM payments
     ) occupied_days
     WHERE report_day BETWEEN DATE '2090-01-01' AND DATE '2100-12-31'
     ORDER BY day`,
  );
  const occupied = new Set(rows.map((row) => String(row.day).slice(0, 10)));
  const end = Date.UTC(2100, 11, 31);
  for (let start = Date.UTC(2090, 0, 1); start + (dayCount - 1) * 86400000 <= end; start += 86400000) {
    const days = Array.from({ length: dayCount }, (_, offset) =>
      new Date(start + offset * 86400000).toISOString().slice(0, 10));
    if (days.every((day) => !occupied.has(day))) return days;
  }
  throw new Error(`No empty ${dayCount}-day report window exists in disposable test data`);
}

after(async () => {
  if (hasTestDatabase) await db.pool.end();
});

async function request(path, options = {}) {
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
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

test('database fixtures use the explicit disposable test database', { skip: !hasTestDatabase }, async () => {
  await assertCurrentSchema(db.pool);
  const regularWasher = await createMachineFixture({ kind: 'washer', type: 'regular', capacity: 8 });
  const titanWasher = await createMachineFixture({ kind: 'washer', type: 'titan', capacity: 10 });
  const order = await createOrderFixture({
    name: 'Test customer',
    loadType: 'wash_only',
    weightKg: 18,
    wash_machine_type: 'regular',
    due_date: '2099-01-20',
  });
  assert.equal(order.status, 'waiting');

  const machines = await request('/api/machines');
  assert.equal(machines.response.status, 200);
  assert.ok(machines.body.machines.some((machine) => machine.id === regularWasher.id));
  assert.ok(machines.body.machines.some((machine) => machine.id === titanWasher.id));

  const assigned = await request(`/api/orders/${order.id}/loads`, {
    method: 'POST',
    body: JSON.stringify({ machine_id: regularWasher.id, load_number: 1, weight_kg: 8 }),
  });
  assert.equal(assigned.response.status, 201);
  const loadId = assigned.body.load.id;
  assert.equal((await request(`/api/orders/${order.id}/loads/${loadId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'running' }),
  })).response.status, 200);
  assert.equal((await request(`/api/orders/${order.id}/loads/${loadId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed' }),
  })).response.status, 200);

  const secondLoad = await request(`/api/orders/${order.id}/loads`, {
    method: 'POST',
    body: JSON.stringify({ machine_id: titanWasher.id, load_number: 2, weight_kg: 10 }),
  });
  assert.equal(secondLoad.response.status, 201);
  assert.equal((await request(`/api/orders/${order.id}/loads/${secondLoad.body.load.id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'running' }),
  })).response.status, 200);
  assert.equal((await request(`/api/orders/${order.id}/loads/${secondLoad.body.load.id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed' }),
  })).response.status, 200);

  const overAssigned = await request(`/api/orders/${order.id}/loads`, {
    method: 'POST',
    body: JSON.stringify({ machine_id: titanWasher.id, load_number: 3, weight_kg: 0.5 }),
  });
  assert.equal(overAssigned.response.status, 409);
  assert.match(overAssigned.body.error, /cannot exceed the order weight/);
});

test('machine management validates edits and protects machines with active loads', { skip: !hasTestDatabase }, async () => {
  const suffix = Date.now();
  const name = `Audit washer ${suffix}`;
  const created = await request('/api/machines', {
    method: 'POST',
    body: JSON.stringify({ name, machine_type: 'regular', machine_kind: 'washer', capacity_kg: 8 }),
  });
  assert.equal(created.response.status, 201);
  const machineId = created.body.machine.id;

  const duplicate = await request('/api/machines', {
    method: 'POST',
    body: JSON.stringify({ name, machine_type: 'regular', machine_kind: 'washer', capacity_kg: 8 }),
  });
  assert.equal(duplicate.response.status, 409);

  const order = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Machine manager test', phone: `086${String(suffix).slice(-9)}`,
      load_type: 'wash_only', weight_kg: 1, wash_machine_type: 'regular',
    }),
  });
  assert.equal(order.response.status, 201);
  const assigned = await request(`/api/orders/${order.body.order.id}/loads`, {
    method: 'POST',
    body: JSON.stringify({ machine_id: machineId, load_number: 1, weight_kg: 1 }),
  });
  assert.equal(assigned.response.status, 201);

  const blockedCapacityChange = await request(`/api/machines/${machineId}`, {
    method: 'PATCH', body: JSON.stringify({ capacity_kg: 10 }),
  });
  assert.equal(blockedCapacityChange.response.status, 409);
  const blockedAvailabilityChange = await request(`/api/machines/${machineId}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'maintenance' }),
  });
  assert.equal(blockedAvailabilityChange.response.status, 409);

  const rename = await request(`/api/machines/${machineId}`, {
    method: 'PATCH', body: JSON.stringify({ name: `${name} renamed` }),
  });
  assert.equal(rename.response.status, 200);
  assert.equal(Number(rename.body.machine.capacity_kg), 8);

  const invalid = await request(`/api/machines/${machineId}`, {
    method: 'PATCH', body: JSON.stringify({ capacity_kg: 0.01 }),
  });
  assert.equal(invalid.response.status, 400);
});

test('guided status workflow assigns split machine loads and charges optional add-ons once', { skip: !hasTestDatabase }, async () => {
  const washers = await Promise.all([
    createMachineFixture({ kind: 'washer', type: 'titan', capacity: 10 }),
    createMachineFixture({ kind: 'washer', type: 'titan', capacity: 10 }),
  ]);
  const dryers = await Promise.all([
    createMachineFixture({ kind: 'dryer', type: 'titan', capacity: 10 }),
    createMachineFixture({ kind: 'dryer', type: 'titan', capacity: 10 }),
  ]);
  const order = await createOrderFixture({
    name: 'Guided workflow customer',
    loadType: 'wash_fold',
    weightKg: 18,
    wash_machine_type: 'regular',
    dry_machine_type: 'regular',
    due_date: '2099-01-21',
  });
  const orderId = order.id;
  const originalPrice = Math.round(Number(order.price) * 100);

  async function assignmentsFor(kind, totalKg, testMachines) {
    const { rows } = await db.query(
      `SELECT m.id, m.capacity_kg FROM machines m
       WHERE m.machine_kind = $1 AND m.id = ANY($2::integer[]) AND m.status = 'available'
         AND NOT EXISTS (SELECT 1 FROM machine_loads ml
                         WHERE ml.machine_id = m.id AND ml.status IN ('queued', 'running'))
       ORDER BY m.capacity_kg DESC, m.id`,
      [kind, testMachines.map((machine) => machine.id)],
    );
    let remaining = Math.round(totalKg * 100);
    const assignments = [];
    for (const machine of rows) {
      if (remaining <= 0) break;
      const load = Math.min(remaining, Math.round(Number(machine.capacity_kg) * 100));
      assignments.push({ machine_id: Number(machine.id), weight_kg: load / 100 });
      remaining -= load;
    }
    assert.equal(remaining, 0, `test database needs sufficient available ${kind} capacity`);
    return assignments;
  }

  const rejected = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'washing' }),
  });
  assert.equal(rejected.response.status, 400);
  assert.equal((await request(`/api/orders/${orderId}`)).body.order.status, 'waiting');

  const washerAssignments = await assignmentsFor('washer', 18, washers);
  const duplicateMachine = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'washing', machine_assignments: [
      { machine_id: washerAssignments[0].machine_id, weight_kg: 9 },
      { machine_id: washerAssignments[0].machine_id, weight_kg: 9 },
    ] }),
  });
  assert.equal(duplicateMachine.response.status, 400);
  const tooSmall = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'washing', machine_assignments: [
      { machine_id: washerAssignments[0].machine_id, weight_kg: 18 },
    ] }),
  });
  assert.equal(tooSmall.response.status, 409);
  assert.equal((await request(`/api/orders/${orderId}`)).body.order.status, 'waiting');
  const startedWashing = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'washing', machine_assignments: washerAssignments }),
  });
  assert.equal(startedWashing.response.status, 200);
  const reused = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'washing', machine_assignments: washerAssignments }),
  });
  assert.equal(reused.response.status, 409);

  let detail = await request(`/api/orders/${orderId}`);
  assert.equal(detail.body.loads.filter((load) => load.status === 'running').length, washerAssignments.length);

  const missingDryers = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'drying' }),
  });
  assert.equal(missingDryers.response.status, 400);
  const dryerAssignments = await assignmentsFor('dryer', 18, dryers);
  const drying = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'drying', machine_assignments: dryerAssignments }),
  });
  assert.equal(drying.response.status, 200);
  detail = await request(`/api/orders/${orderId}`);
  assert.equal(detail.body.loads.filter((load) => load.machine_kind === 'washer' && load.status === 'completed').length, washerAssignments.length);
  assert.equal(detail.body.loads.filter((load) => load.machine_kind === 'dryer' && load.status === 'running').length, dryerAssignments.length);
  assert.equal((await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'folding' }),
  })).response.status, 200);
  assert.equal((await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'ready' }),
  })).response.status, 200);

  const allAddons = await request('/api/addons?include_inactive=true');
  assert.equal(allAddons.response.status, 200);
  let addon = allAddons.body.addons.find((item) => item.name === 'Ariel — Sunrise Fresh');
  if (!addon) {
    const createdAddon = await request('/api/addons', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ariel — Sunrise Fresh', price: 10 }),
    });
    assert.equal(createdAddon.response.status, 201);
    addon = createdAddon.body.addon;
  } else if (!addon.is_active || Number(addon.price) !== 10) {
    const refreshedAddon = await request(`/api/addons/${addon.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ price: 10, is_active: true }),
    });
    assert.equal(refreshedAddon.response.status, 200);
    addon = refreshedAddon.body.addon;
  }
  assert.equal(addon.name, 'Ariel — Sunrise Fresh');
  assert.equal(Number(addon.price), 10);
  const payment = await request(`/api/orders/${orderId}/payment`, {
    method: 'POST', body: JSON.stringify({ amount: 25, method: 'cash' }),
  });
  assert.equal(payment.response.status, 201);
  const paymentsBefore = (await request(`/api/orders/${orderId}`)).body.payments.length;

  const undecided = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(undecided.response.status, 400);
  assert.equal((await request(`/api/orders/${orderId}`)).body.order.status, 'ready');
  for (const [addons, expectedStatus] of [
    [[{ id: 0, quantity: 1 }], 400],
    [[{ id: 2147483000, quantity: 1 }], 409],
    [[{ id: addon.id, quantity: 0 }], 400],
    [[{ id: addon.id, quantity: 1 }, { id: addon.id, quantity: 1 }], 400],
  ]) {
    const invalid = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed', addon_decision: 'add', addons }),
    });
    assert.equal(invalid.response.status, expectedStatus);
    assert.equal((await request(`/api/orders/${orderId}`)).body.order.status, 'ready');
  }
  const completed = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed', addon_decision: 'add', addons: [{ id: addon.id, quantity: 2 }] }),
  });
  assert.equal(completed.response.status, 200);
  detail = await request(`/api/orders/${orderId}`);
  assert.equal(Number(detail.body.order.price), (originalPrice + 2000) / 100);
  assert.equal(Number(detail.body.order.paid_amount), 25);
  assert.equal(Number(detail.body.order.outstanding_amount), (originalPrice + 2000) / 100 - 25);
  assert.equal(detail.body.payments.length, paymentsBefore);
  assert.equal(detail.body.addons.length, 1);
  assert.equal(detail.body.addons[0].name, 'Ariel — Sunrise Fresh');
  assert.equal(Number(detail.body.addons[0].unit_price), 10);
  assert.equal(Number(detail.body.addons[0].line_total), 20);
  assert.equal(detail.body.history.length, 6);
  assert.equal(detail.body.order.due_date, '2099-01-21');
  assert.ok(detail.body.order.completed_at);

  const repeated = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed', addon_decision: 'add', addons: [{ id: addon.id, quantity: 2 }] }),
  });
  assert.equal(repeated.response.status, 409);
  const afterRetry = await request(`/api/orders/${orderId}`);
  assert.equal(Number(afterRetry.body.order.price), (originalPrice + 2000) / 100);
  assert.equal(afterRetry.body.payments.length, paymentsBefore);
  assert.equal(afterRetry.body.addons.length, 1);
});

test('skipping completion add-ons preserves the existing order total and balance', { skip: !hasTestDatabase }, async () => {
  const created = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Skipped add-on customer',
      phone: `085${String(Date.now()).slice(-9)}`,
      load_type: 'fold_only',
      weight_kg: 1,
    }),
  });
  assert.equal(created.response.status, 201);
  const id = created.body.order.id;
  const originalPrice = Number(created.body.order.price);
  for (const status of ['washing', 'drying', 'folding', 'ready']) {
    const moved = await request(`/api/orders/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    });
    assert.equal(moved.response.status, 200);
  }
  const skipped = await request(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed', addon_decision: 'skip', addons: [] }),
  });
  assert.equal(skipped.response.status, 200);
  const detail = await request(`/api/orders/${id}`);
  assert.equal(Number(detail.body.order.price), originalPrice);
  assert.equal(Number(detail.body.order.outstanding_amount), originalPrice);
  assert.equal(detail.body.payments.length, 0);
  assert.equal(detail.body.addons.length, 0);
});

test('split payments update the balance and reject overpayment', { skip: !hasTestDatabase }, async () => {
  const order = await createOrderFixture({
    name: 'Split payment test customer',
    loadType: 'wash_only',
    weightKg: 18,
    wash_machine_type: 'regular',
  });
  const orderId = order.id;
  const orderPrice = Number(order.price);
  const unpaid = await request(`/api/orders/${orderId}`);
  assert.equal(unpaid.response.status, 200);
  assert.equal(unpaid.body.order.payment_status, 'UNPAID');
  assert.equal(Number(unpaid.body.order.paid_amount), 0);
  assert.equal(Number(unpaid.body.order.outstanding_amount), orderPrice);

  const first = await request(`/api/orders/${orderId}/payment`, {
    method: 'POST', body: JSON.stringify({ amount: 50, method: 'cash' }),
  });
  assert.equal(first.response.status, 201);

  const partial = await request(`/api/orders/${orderId}`);
  assert.equal(partial.response.status, 200);
  assert.equal(partial.body.order.payment_status, 'PARTIAL');
  assert.equal(Number(partial.body.order.paid_amount), 50);
  assert.equal(Number(partial.body.order.outstanding_amount), orderPrice - 50);

  const remaining = Math.round((orderPrice - 50) * 100) / 100;
  const final = await request(`/api/orders/${orderId}/payment`, {
    method: 'POST', body: JSON.stringify({ amount: remaining, method: 'gcash' }),
  });
  assert.equal(final.response.status, 201);

  const excess = await request(`/api/orders/${orderId}/payment`, {
    method: 'POST', body: JSON.stringify({ amount: 0.01, method: 'card' }),
  });
  assert.equal(excess.response.status, 400);

  const details = await request(`/api/orders/${orderId}`);
  assert.equal(details.body.order.payment_status, 'PAID');
  assert.equal(Number(details.body.order.paid_amount), orderPrice);
  assert.equal(details.body.payments.length, 2);
  assert.equal(Number(details.body.order.outstanding_amount), 0);

  const [salesDate, , collectionsDate] = await findEmptyReportWindow(3);
  await db.query(
    "UPDATE orders SET created_at = ($2::date::timestamp AT TIME ZONE 'Asia/Manila') + interval '30 minutes' WHERE id = $1",
    [orderId, salesDate],
  );
  await db.query(
    "UPDATE payments SET paid_at = ($2::date::timestamp AT TIME ZONE 'Asia/Manila') + interval '30 minutes' WHERE order_id = $1",
    [orderId, collectionsDate],
  );
  const report = await request(`/api/reports/summary?from=${salesDate}&to=${collectionsDate}`);
  assert.equal(report.response.status, 200);
  assert.equal(report.body.sales, orderPrice);
  assert.equal(report.body.collections, orderPrice);
  assert.equal(report.body.outstanding, 0);
  assert.equal(report.body.daily[0].sales, orderPrice);
  assert.equal(report.body.daily[2].collections, orderPrice);
});

test('concurrent full-balance payments cannot overpay or duplicate payment history', { skip: !hasTestDatabase }, async () => {
  const suffix = Date.now();
  const created = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Concurrent payment test', phone: `085${String(suffix).slice(-9)}`,
      load_type: 'wash_only', weight_kg: 1, wash_machine_type: 'regular',
    }),
  });
  assert.equal(created.response.status, 201);
  const { id, price } = created.body.order;

  const attempts = await Promise.all([
    request(`/api/orders/${id}/payment`, {
      method: 'POST', body: JSON.stringify({ amount: price, method: 'cash' }),
    }),
    request(`/api/orders/${id}/payment`, {
      method: 'POST', body: JSON.stringify({ amount: price, method: 'gcash' }),
    }),
  ]);
  assert.deepEqual(attempts.map(({ response }) => response.status).sort(), [201, 400]);

  const detail = await request(`/api/orders/${id}`);
  assert.equal(detail.body.order.payment_status, 'PAID');
  assert.equal(Number(detail.body.order.paid_amount), Number(price));
  assert.equal(Number(detail.body.order.outstanding_amount), 0);
  assert.equal(detail.body.payments.length, 1);
});

test('repeat phone number attaches a newly logged order to the existing customer', { skip: !hasTestDatabase }, async () => {
  const phone = nextFixturePhone();
  const originalOrder = await createOrderFixture({
    name: 'First customer spelling',
    phone,
    loadType: 'wash_only',
    weightKg: 18,
    wash_machine_type: 'regular',
  });
  const fixturePrice = Number(originalOrder.price);
  const paid = await request(`/api/orders/${originalOrder.id}/payment`, {
    method: 'POST',
    body: JSON.stringify({ amount: fixturePrice, method: 'cash' }),
  });
  assert.equal(paid.response.status, 201);

  const secondOrder = await createOrderFixture({
    name: 'Another spelling is ignored for existing phone',
    phone,
    loadType: 'wash_only',
    weightKg: 1,
    wash_machine_type: 'regular',
  });
  assert.equal(secondOrder.customer_id, originalOrder.customer_id);

  const search = await request(`/api/orders?q=${encodeURIComponent(phone)}`);
  assert.equal(search.response.status, 200);
  assert.equal(search.body.count, 2);

  const customerId = originalOrder.customer_id;
  const customerDetails = await request(`/api/customers/${customerId}`);
  assert.equal(customerDetails.response.status, 200);
  assert.equal(customerDetails.body.orders.length, 2);
  assert.equal(customerDetails.body.summary.spending, fixturePrice + 70);
  assert.equal(customerDetails.body.summary.paid, fixturePrice);
  assert.equal(customerDetails.body.summary.outstanding, 70);

  const updated = await request(`/api/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Updated test customer', notes: 'Test notes' }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.customer.name, 'Updated test customer');
  assert.equal((await request(`/api/orders/${originalOrder.id}`)).body.order.price, fixturePrice.toFixed(2));
});

test('standalone customer creation supports search, editing, and history', { skip: !hasTestDatabase }, async () => {
  const phone = `084${String(Date.now()).slice(-9)}`;
  const created = await request('/api/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Standalone customer', phone, notes: 'Created without an order' }),
  });
  assert.equal(created.response.status, 201);
  const id = created.body.customer.id;

  const duplicate = await request('/api/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Duplicate customer', phone }),
  });
  assert.equal(duplicate.response.status, 409);

  const search = await request(`/api/customers?q=${encodeURIComponent(phone)}`);
  assert.equal(search.response.status, 200);
  assert.ok(search.body.customers.some((customer) => customer.id === id));

  const updated = await request(`/api/customers/${id}`, {
    method: 'PATCH', body: JSON.stringify({ name: 'Edited customer', notes: null }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.customer.name, 'Edited customer');
  assert.equal(updated.body.customer.notes, null);

  const history = await request(`/api/customers/${id}`);
  assert.equal(history.response.status, 200);
  assert.deepEqual(history.body.orders, []);
  assert.equal(history.body.summary.spending, 0);
});

test('inventory movements enforce stock and keep adjustment history', { skip: !hasTestDatabase }, async () => {
  const productName = 'Ariel — Sunrise Fresh';
  let existing = (await request(`/api/products?q=${encodeURIComponent(productName)}`)).body.products
    .find((product) => product.name === productName);
  if (!existing) {
    const created = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ brand: 'Ariel', product: 'Sunrise Fresh', unit: 'bottles', stock_quantity: 0, low_stock_threshold: 2 }),
    });
    assert.equal(created.response.status, 201);
    existing = created.body.product;
  }
  const productId = existing.id;
  const initialStock = Number(existing.stock_quantity);
  const beforeHistory = await request(`/api/products/${productId}/movements`);
  const initialMovementCount = beforeHistory.body.count;

  const stockIn = await request(`/api/products/${productId}/movements`, {
    method: 'POST', body: JSON.stringify({ movement_type: 'stock_in', quantity: 5, notes: 'Delivery' }),
  });
  assert.equal(stockIn.response.status, 201);
  assert.equal(Number(stockIn.body.product.stock_quantity), initialStock + 5);

  const insufficient = await request(`/api/products/${productId}/movements`, {
    method: 'POST', body: JSON.stringify({ movement_type: 'usage', quantity: initialStock + 6 }),
  });
  assert.equal(insufficient.response.status, 409);

  const usage = await request(`/api/products/${productId}/movements`, {
    method: 'POST', body: JSON.stringify({ movement_type: 'usage', quantity: 2 }),
  });
  assert.equal(usage.response.status, 201);
  assert.equal(Number(usage.body.product.stock_quantity), initialStock + 3);

  const adjustment = await request(`/api/products/${productId}`, {
    method: 'PATCH', body: JSON.stringify({ stock_quantity: initialStock + 4, low_stock_threshold: initialStock + 5 }),
  });
  assert.equal(adjustment.response.status, 200);
  assert.equal(adjustment.body.product.low_stock, true);

  const history = await request(`/api/products/${productId}/movements`);
  assert.equal(history.response.status, 200);
  assert.equal(history.body.count, initialMovementCount + 3);
  assert.equal(history.body.movements[0].movement_type, 'adjustment');

  const filtered = await request(`/api/products?q=${encodeURIComponent(productName)}&low_stock=true`);
  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.body.count, 1);
  assert.equal(filtered.body.products[0].id, productId);
});

test('inventory API rejects unsupported brand and product selections before database access', async () => {
  for (const selection of [
    { brand: 'Other', product: 'Sunrise Fresh' },
    { brand: 'Ariel', product: 'Antibac' },
    { name: 'Arbitrary override' },
  ]) {
    const rejected = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ ...selection, unit: 'bottles', stock_quantity: 0 }),
    });
    assert.equal(rejected.response.status, 400);
  }
});

test('configurable service add-ons affect new totals and preserve historical prices', { skip: !hasTestDatabase }, async () => {
  const addon = await request('/api/addons', {
    method: 'POST',
    body: JSON.stringify({ name: `Express handling ${Date.now()}`, price: 15.5 }),
  });
  assert.equal(addon.response.status, 201);

  const order = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Add-on test customer',
      phone: `088${String(Date.now()).slice(-9)}`,
      load_type: 'wash_only',
      weight_kg: 1,
      wash_machine_type: 'regular',
      addons: [{ id: addon.body.addon.id, quantity: 2 }],
    }),
  });
  assert.equal(order.response.status, 201);
  assert.equal(Number(order.body.order.price), 101);
  assert.equal(order.body.order.addons[0].line_total, 31);

  const changed = await request(`/api/addons/${addon.body.addon.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ price: 99, is_active: false }),
  });
  assert.equal(changed.response.status, 200);
  const detail = await request(`/api/orders/${order.body.order.id}`);
  assert.equal(Number(detail.body.order.price), 101);
  assert.equal(Number(detail.body.addons[0].unit_price), 15.5);
  assert.equal(Number(detail.body.addons[0].line_total), 31);

  const unavailable = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Add-on inactive customer',
      phone: `087${String(Date.now()).slice(-9)}`,
      load_type: 'wash_only',
      weight_kg: 1,
      wash_machine_type: 'regular',
      addons: [{ id: addon.body.addon.id, quantity: 1 }],
    }),
  });
  assert.equal(unavailable.response.status, 400);
});

test('GET /api/orders/:id returns 404 for a missing order', { skip: !hasTestDatabase }, async () => {
  const { rows } = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS id FROM orders');
  const missingId = Number(rows[0].id);
  const { response, body } = await request(`/api/orders/${missingId}`);

  assert.equal(response.status, 404);
  assert.equal(body.error, `No order with id ${missingId}`);
});

test('API rejects requests without authentication', async () => {
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);

    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Basic realm="LaundryLog"');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(response.headers.get('content-security-policy'), /object-src 'none'/);
    assert.equal(response.headers.get('x-powered-by'), null);

    const liveness = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(liveness.status, 200);
    assert.equal(await liveness.text(), 'ok');

    const malformed = await fetch(`http://127.0.0.1:${port}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('request logs omit sensitive query strings', async () => {
  const server = app.listen(0);
  const originalLog = console.log;
  const messages = [];
  console.log = (message) => messages.push(String(message));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/?q=PrivateCustomerSearchTerm`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.APP_AUTH_USER}:${process.env.APP_AUTH_PASSWORD}`).toString('base64')}`,
      },
    });
    assert.equal(response.status, 200);
    await response.text();
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(messages.some((message) => message.startsWith('GET / ->')));
    assert.ok(messages.every((message) => !message.includes('PrivateCustomerSearchTerm')));
  } finally {
    console.log = originalLog;
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

test('PATCH machine load status rejects completed load from moving back to running', { skip: !hasTestDatabase }, async () => {
  const machine = await createMachineFixture({ kind: 'washer', type: 'regular', capacity: 8 });
  const order = await createOrderFixture({
    name: 'Completed machine-load test customer',
    loadType: 'wash_only',
    weightKg: 8,
    wash_machine_type: 'regular',
  });
  const assigned = await request(`/api/orders/${order.id}/loads`, {
    method: 'POST',
    body: JSON.stringify({ machine_id: machine.id, load_number: 1, weight_kg: 8 }),
  });
  assert.equal(assigned.response.status, 201);
  for (const status of ['running', 'completed']) {
    const moved = await request(`/api/orders/${order.id}/loads/${assigned.body.load.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    assert.equal(moved.response.status, 200);
  }

  const { response, body } = await request(`/api/orders/${order.id}/loads/${assigned.body.load.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'running' }),
  });

  assert.equal(response.status, 409);
  assert.match(body.error, /completed load can only move to no further status/);
});

test('PATCH machine load status rejects an invalid status value', async () => {
  const syntheticId = Math.max(1, Number(String(Date.now()).slice(-7)));
  const { response, body } = await request(`/api/orders/${syntheticId}/loads/${syntheticId}/status`, {
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

test('splitLoadWeight uses integer hundredths for decimal weights', () => {
  assert.deepEqual(splitLoadWeight(4.75, 2.25), [2.25, 2.25, 0.25]);
  assert.deepEqual(splitLoadWeight(1.01, 0.5), [0.5, 0.5, 0.01]);
});

test('splitLoadWeight rejects too-small capacities before producing excessive loads', () => {
  assert.throws(() => splitLoadWeight(100, 0.01), /capacityKg must be at least 0.1 kg/);
  assert.throws(() => splitLoadWeight(1, 0.01), /capacityKg must be at least 0.1 kg/);
  assert.throws(() => splitLoadWeight(1, 0.001), /capacityKg must have no more than two decimal places/);
});

test('splitLoadWeight accepts supported precision and load-count boundaries', () => {
  assert.deepEqual(splitLoadWeight(0.01, 0.1), [0.01]);
  assert.equal(splitLoadWeight(100, 0.1).length, 1000);
  assert.deepEqual(splitLoadWeight(100, 100), [100]);
});

test('splitLoadWeight rejects invalid and over-precision inputs clearly', () => {
  for (const weight of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 'invalid']) {
    assert.throws(() => splitLoadWeight(weight, 8), /totalWeightKg/);
  }
  for (const capacity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 'invalid']) {
    assert.throws(() => splitLoadWeight(8, capacity), /capacityKg/);
  }
  assert.throws(() => splitLoadWeight(1.001, 1), /totalWeightKg must have no more than two decimal places/);
  assert.throws(() => splitLoadWeight(1, 1.001), /capacityKg must have no more than two decimal places/);
  assert.throws(() => splitLoadWeight(100.01, 10), /cannot exceed 100 kg/);
  assert.throws(() => splitLoadWeight(1, 100.01), /cannot exceed 100 kg/);
});

test('GET order load plan splits an 18kg order for an 8kg machine', { skip: !hasTestDatabase }, async () => {
  const order = await createOrderFixture({
    name: 'Eight kg load-plan customer',
    loadType: 'wash_only',
    weightKg: 18,
    wash_machine_type: 'regular',
  });
  const { response, body } = await request(
    `/api/orders/${order.id}/load-plan?capacity_kg=8`,
  );

  assert.equal(response.status, 200);
  assert.equal(body.order_id, order.id);
  assert.equal(body.total_weight_kg, 18);
  assert.equal(body.capacity_kg, 8);
  assert.equal(body.load_count, 3);
  assert.deepEqual(body.loads, [8, 8, 2]);
});

test('GET order load plan splits an 18kg order for a 10kg machine', { skip: !hasTestDatabase }, async () => {
  const order = await createOrderFixture({
    name: 'Ten kg load-plan customer',
    loadType: 'wash_only',
    weightKg: 18,
    wash_machine_type: 'regular',
  });
  const { response, body } = await request(
    `/api/orders/${order.id}/load-plan?capacity_kg=10`,
  );

  assert.equal(response.status, 200);
  assert.equal(body.load_count, 2);
  assert.deepEqual(body.loads, [10, 8]);
});

test('GET order load plan rejects an invalid machine capacity', async () => {
  const syntheticId = Math.max(1, Number(String(Date.now()).slice(-7)));
  const { response, body } = await request(
    `/api/orders/${syntheticId}/load-plan?capacity_kg=0`,
  );

  assert.equal(response.status, 400);
  assert.equal(
    body.error,
    'capacity_kg must be a number greater than 0',
  );
});

test('GET order load plan rejects impractically small and over-precision capacities', async () => {
  const syntheticId = Math.max(1, Number(String(Date.now()).slice(-7)));
  for (const [capacity, message] of [
    ['0.01', /from 0.1 to 100 kg/],
    ['0.123', /no more than two decimal places/],
  ]) {
    const { response, body } = await request(
      `/api/orders/${syntheticId}/load-plan?capacity_kg=${capacity}`,
    );
    assert.equal(response.status, 400);
    assert.match(body.error, message);
  }
});

test('washing and drying services retain their flat selected-machine prices across cycles', () => {
  assert.equal(calculateServicePrice('wash', 'regular', 2), 70);
  assert.equal(calculateServicePrice('wash', 'titan', 4), 90);
  assert.equal(calculateServicePrice('dry', 'regular', 3), 90);
  assert.equal(calculateServicePrice('dry', 'titan', 3), 110);
});

test('fold-only service is charged once per order regardless of cycle count', () => {
  assert.equal(calculateServicePrice('fold', 'regular', 4), 20);
  assert.equal(calculateOrderPrice({ loadType: 'fold_only', weightKg: 18 }), 20);
});

test('calculates load counts from machine capacity', () => {
  assert.equal(calculateLoadCount(8, 'regular'), 1);
  assert.equal(calculateLoadCount(9, 'regular'), 2);
  assert.equal(calculateLoadCount(10, 'titan'), 1);
  assert.equal(calculateLoadCount(18, 'titan'), 2);
});

test('wash-only base price does not change with capacity or extra machine cycles', () => {
  const regularSingleCycle = calculateOrderPrice({
    loadType: 'wash_only', weightKg: 8, washMachineType: 'regular',
  });
  const regularSplitCycles = calculateOrderPrice({
    loadType: 'wash_only', weightKg: 18, washMachineType: 'regular',
  });
  const titan = calculateOrderPrice({
    loadType: 'wash_only', weightKg: 18, washMachineType: 'titan',
  });
  assert.equal(regularSingleCycle, 70);
  assert.equal(regularSplitCycles, regularSingleCycle);
  assert.equal(titan, 90);
});

test('wash-fold base includes one folding fee and ignores extra machine cycles', () => {
  assert.equal(
    calculateOrderPrice({
      loadType: 'wash_fold',
      weightKg: 8,
      washMachineType: 'regular',
      dryMachineType: 'regular',
    }),
    180,
  );
  assert.equal(calculateOrderPrice({
    loadType: 'wash_fold',
    weightKg: 18,
    washMachineType: 'regular',
    dryMachineType: 'regular',
  }), 180);
  assert.equal(calculateOrderPrice({
    loadType: 'wash_fold',
    weightKg: 18,
    washMachineType: 'titan',
    dryMachineType: 'titan',
  }), 220);
});

test('requested add-on catalog is seeded idempotently at the specified prices', () => {
  const seed = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');
  for (const [name, price] of [
    ['Folding', '20.00'],
    ['Ariel — Sunrise Fresh', '10.00'],
    ['Downy — Antibac', '10.00'],
    ['Downy — Sunrise', '10.00'],
    ['Surf — Fabcon Sunbloom', '10.00'],
    ['Surf — Liquid Detergent Rose Fresh', '10.00'],
    ['Tide — Garden Bloom', '10.00'],
    ['Champion — Original', '10.00'],
    ['Zonrox — Colorsafe', '5.00'],
  ]) {
    assert.ok(seed.includes(`('${name}', ${price}, true)`), `${name} is present at ${price}`);
  }
  assert.match(seed, /ON CONFLICT \(name\) DO UPDATE[\s\S]*is_active = true/);
  assert.match(seed, /UPDATE service_addons[\s\S]*is_active = false/);
  assert.ok(seed.includes("WHERE name ~ '^Completion add-on [0-9]+$';"));
});

test('completion add-on validation rejects invalid, duplicate IDs and quantities', () => {
  assert.deepEqual(validateCompletionChoices({
    addon_decision: 'add', addons: [{ id: 1, quantity: 2 }],
  }), [{ id: 1, quantity: 2 }]);
  assert.throws(() => validateCompletionChoices({ addon_decision: 'add', addons: [{ id: 0 }] }), /positive whole number/);
  assert.throws(() => validateCompletionChoices({ addon_decision: 'add', addons: [{ id: 1, quantity: 101 }] }), /quantity must be a whole number/);
  assert.throws(() => validateCompletionChoices({ addon_decision: 'add', addons: [{ id: 1 }, { id: 1 }] }), /cannot be duplicated/);
  assert.throws(() => validateCompletionChoices({ addon_decision: 'add', addons: [] }), /select at least one add-on or explicitly skip/i);
  assert.throws(() => validateCompletionChoices({ addon_decision: 'skip', addons: [{ id: 1 }] }), /Skipped add-ons/);
});

test('order statuses follow Waiting, Washing, Drying, Folding, Ready, Completed in order', () => {
  let current = 'waiting';
  for (const status of ['washing', 'drying', 'folding', 'ready', 'completed']) {
    assert.equal(validateStatusChange(current, { status }).status, status);
    current = status;
  }
  assert.throws(() => validateStatusChange('waiting', { status: 'drying' }), /can only move to washing/);
  assert.equal(validateStatusChange('new', { status: 'waiting' }).status, 'waiting');
});
test('GET /api/reports/summary rejects invalid dates', async () => {
  const { response, body } = await request(
    '/api/reports/summary?from=invalid&to=2026-09-30'
  );

  assert.equal(response.status, 400);
  assert.match(body.error, /valid dates in YYYY-MM-DD format/);
});

test('GET /api/reports/summary rejects a reversed date range', async () => {
  const { response, body } = await request(
    '/api/reports/summary?from=2026-09-30&to=2026-09-01'
  );

  assert.equal(response.status, 400);
  assert.match(body.error, /on or before/);
});

test('GET /api/reports/summary rejects ranges longer than 366 days', async () => {
  const { response, body } = await request(
    '/api/reports/summary?from=2024-01-01&to=2026-09-30',
  );

  assert.equal(response.status, 400);
  assert.match(body.error, /cannot exceed 366 days/);
});

test('GET /api/reports/summary returns zero totals for an empty period', { skip: !hasTestDatabase }, async () => {
  const [emptyDate] = await findEmptyReportWindow(1);
  const { response, body } = await request(
    `/api/reports/summary?from=${emptyDate}&to=${emptyDate}`,
  );

  assert.equal(response.status, 200);
  assert.equal(body.sales, 0);
  assert.equal(body.collections, 0);
  assert.equal(body.outstanding, 0);
  assert.deepEqual(body.daily, [{ date: emptyDate, sales: 0, collections: 0 }]);
});
