'use strict';

const express = require('express');
const db = require('../db');
const { HttpError, asyncHandler } = require('../middleware/httpError');
const { calculateOrderPrice } = require('../utils/pricing');
const {
  STATUSES,
  parseId,
  validateNewOrder,
  validateStatusChange,
  validatePayment,
  validateMachineLoad,
} = require('../validators/orderValidators');
const { splitLoadWeight } = require('../utils/loadSplitter');
const {
  requiredMachineKind,
  validateMachineAssignments,
  validateCompletionChoices,
} = require('../utils/orderWorkflow');

const router = express.Router();

const ORDER_SELECT = `
  SELECT o.id,
         o.customer_id,
         c.name AS customer_name,
         c.phone AS customer_phone,
         o.load_type,
         o.weight_kg,
         o.item_count,
         o.price,
         o.status,
         o.note,
         o.created_at,
         o.updated_at,
         o.due_date::text AS due_date,
         o.completed_at,
         COALESCE(pay.paid_amount, 0) AS paid_amount,
         pay.paid_method,
         pay.latest_paid_at AS paid_at,
         CASE
           WHEN COALESCE(pay.paid_amount, 0) >= o.price THEN 'PAID'
           WHEN COALESCE(pay.paid_amount, 0) <= 0 THEN 'UNPAID'
           ELSE 'PARTIAL'
         END AS payment_status,
         GREATEST(o.price - COALESCE(pay.paid_amount, 0), 0) AS outstanding_amount
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN LATERAL (
    SELECT SUM(amount) AS paid_amount,
           CASE WHEN COUNT(*) = 1 THEN MIN(method) ELSE NULL END AS paid_method,
           MAX(paid_at) AS latest_paid_at
    FROM payments
    WHERE order_id = o.id
  ) pay ON true
`;

const LOAD_COLUMNS = `id, order_id, machine_id, load_number, weight_kg,
                      status, started_at, completed_at, notes, created_at`;

const LOAD_TRANSITIONS = {
  queued: ['running'],
  running: ['completed'],
  completed: [],
};

const EXCLUSIVE_MACHINE_KIND = { wash_only: 'washer', dry_only: 'dryer' };

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      if (!STATUSES.includes(status)) {
        throw new HttpError(400, 'Validation failed', [
          {
            field: 'status',
            message: `status must be one of: all, ${STATUSES.join(', ')}`,
          },
        ]);
      }
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    if (q && String(q).trim() !== '') {
      params.push(`%${String(q).trim()}%`);
      conditions.push(
        `(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `${ORDER_SELECT} ${where} ORDER BY o.created_at DESC`,
      params,
    );

    res.json({ count: rows.length, orders: rows });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');

    const { rows } = await db.query(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
    if (rows.length === 0) {
      throw new HttpError(404, `No order with id ${id}`);
    }

    const history = await db.query(
      "SELECT status, note, changed_at FROM order_status_history WHERE order_id = $1 ORDER BY changed_at",
      [id],
    );

    const payments = await db.query(
      `SELECT id, order_id, amount, method, paid_at
       FROM payments
       WHERE order_id = $1
       ORDER BY paid_at DESC, id DESC`,
      [id],
    );

    const loads = await db.query(
      `SELECT ml.id, ml.machine_id, m.name AS machine_name,
              m.machine_kind, m.capacity_kg, ml.load_number, ml.weight_kg,
              ml.status, ml.started_at, ml.completed_at, ml.notes
       FROM machine_loads ml
       JOIN machines m ON m.id = ml.machine_id
       WHERE ml.order_id = $1
       ORDER BY ml.load_number`,
      [id],
    );

    const addons = await db.query(
      `SELECT addon_id, name_snapshot AS name,
              unit_price_snapshot AS unit_price, quantity, line_total
       FROM order_addons WHERE order_id = $1 ORDER BY id`,
      [id],
    );

    res.json({
      order: rows[0],
      history: history.rows,
      payments: payments.rows,
      loads: loads.rows,
      addons: addons.rows,
    });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = validateNewOrder(req.body);

    const basePrice = calculateOrderPrice({
      loadType: input.loadType,
      weightKg: input.weightKg,
      washMachineType: input.washMachineType,
      dryMachineType: input.dryMachineType,
    });

    const order = await db.withTransaction(async (client) => {
      const selectedAddons = [];
      if (input.addons.length > 0) {
        const addonRows = await client.query(
          `SELECT id, name, price
           FROM service_addons
           WHERE id = ANY($1::integer[]) AND is_active = true`,
          [input.addons.map((addon) => addon.id)],
        );
        const addonsById = new Map(addonRows.rows.map((addon) => [Number(addon.id), addon]));
        if (addonsById.size !== input.addons.length) {
          throw new HttpError(400, 'One or more selected add-ons are unavailable');
        }
        for (const requested of input.addons) {
          const addon = addonsById.get(requested.id);
          const unitPriceCents = Math.round(Number(addon.price) * 100);
          selectedAddons.push({
            id: addon.id,
            name: addon.name,
            unitPriceCents,
            quantity: requested.quantity,
            lineTotalCents: unitPriceCents * requested.quantity,
          });
        }
      }
      const price = (
        Math.round(basePrice * 100) +
        selectedAddons.reduce((sum, addon) => sum + addon.lineTotalCents, 0)
      ) / 100;
      let customerId = input.customerId;

      if (customerId === null) {
        const existing = await client.query(
          "SELECT id FROM customers WHERE phone = $1",
          [input.phone],
        );
        if (existing.rows.length > 0) {
          customerId = existing.rows[0].id;
        } else {
          const created = await client.query(
            `INSERT INTO customers (name, phone)
             VALUES ($1, $2)
             ON CONFLICT (phone) DO NOTHING
             RETURNING id`,
            [input.name, input.phone],
          );
          if (created.rows.length > 0) {
            customerId = created.rows[0].id;
          } else {
            const concurrent = await client.query(
              'SELECT id FROM customers WHERE phone = $1',
              [input.phone],
            );
            customerId = concurrent.rows[0].id;
          }
        }
      } else {
        const found = await client.query(
          "SELECT id FROM customers WHERE id = $1",
          [customerId],
        );
        if (found.rows.length === 0) {
          throw new HttpError(404, `No customer with id ${customerId}`);
        }
      }

      const inserted = await client.query(
        `INSERT INTO orders (customer_id, load_type, weight_kg, item_count, price, note, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'waiting')
         RETURNING id`,
        [
          customerId,
          input.loadType,
          input.weightKg,
          input.itemCount,
          price,
          input.note,
          input.dueDate,
        ],
      );
      const orderId = inserted.rows[0].id;

      for (const addon of selectedAddons) {
        await client.query(
          `INSERT INTO order_addons
             (order_id, addon_id, name_snapshot, unit_price_snapshot, quantity, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, addon.id, addon.name, addon.unitPriceCents / 100,
            addon.quantity, addon.lineTotalCents / 100],
        );
      }

      await client.query(
        "INSERT INTO order_status_history (order_id, status, note) VALUES ($1, $2, $3)",
        [orderId, 'waiting', 'Order received'],
      );

      const full = await client.query(`${ORDER_SELECT} WHERE o.id = $1`, [
        orderId,
      ]);
      return {
        ...full.rows[0],
        addons: selectedAddons.map((addon) => ({
          name: addon.name,
          unit_price: addon.unitPriceCents / 100,
          quantity: addon.quantity,
          line_total: addon.lineTotalCents / 100,
        })),
      };
    });

    res.status(201).location(`/api/orders/${order.id}`).json({ order });
  }),
);

const WASHER_LOAD_TYPES = ['wash_fold', 'wash_only'];
const DRYER_LOAD_TYPES = ['wash_fold', 'dry_only'];

function toCentiKg(weight) {
  return Math.round(Number(weight) * 100);
}

function uniqueNumbers(values) {
  return [...new Set(values.map(Number))];
}

async function finishMachineStage(client, orderId, machineKind) {
  const completed = await client.query(
    `UPDATE machine_loads ml
     SET status = 'completed', completed_at = COALESCE(completed_at, now())
     FROM machines m
     WHERE ml.machine_id = m.id AND ml.order_id = $1
       AND m.machine_kind = $2 AND ml.status IN ('queued', 'running')
     RETURNING ml.machine_id`,
    [orderId, machineKind],
  );
  const machineIds = uniqueNumbers(completed.rows.map((row) => row.machine_id));
  if (machineIds.length) {
    await client.query(
      `UPDATE machines m SET status = 'available'
       WHERE m.id = ANY($1::integer[]) AND m.status = 'running'
         AND NOT EXISTS (SELECT 1 FROM machine_loads ml
                         WHERE ml.machine_id = m.id AND ml.status IN ('queued', 'running'))`,
      [machineIds],
    );
  }
}

async function startQueuedLoads(client, orderId, machineIds) {
  await client.query(
    `UPDATE machines SET status = 'running'
     WHERE id = ANY($1::integer[]) AND status <> 'maintenance'`,
    [machineIds],
  );
  await client.query(
    `UPDATE machine_loads SET status = 'running', started_at = COALESCE(started_at, now())
     WHERE order_id = $1 AND machine_id = ANY($2::integer[]) AND status = 'queued'`,
    [orderId, machineIds],
  );
}

function parseMachineAssignments(body, order, status, machineKind) {
  const supplied = body.machine_assignments;

  if (!machineKind) {
    const suppliedAny = supplied !== undefined && (!Array.isArray(supplied) || supplied.length > 0);
    if (suppliedAny) {
      throw new HttpError(400, 'This order stage does not require machine assignments');
    }
    return [];
  }

  const reusesQueuedWasherLoads = status === 'washing' &&
    (supplied === undefined || (Array.isArray(supplied) && supplied.length === 0));
  if (reusesQueuedWasherLoads) return [];

  try {
    return validateMachineAssignments(supplied, order.weight_kg);
  } catch (error) {
    throw new HttpError(400, error.message);
  }
}

function parseCompletionChoices(body, status) {
  if (status !== 'completed') {
    if (body.addons !== undefined || body.addon_decision !== undefined) {
      throw new HttpError(400, 'Add-ons can only be confirmed when completing an order');
    }
    return { completionAddons: [], addonDecision: null };
  }
  try {
    return {
      completionAddons: validateCompletionChoices(body),
      addonDecision: body.addon_decision,
    };
  } catch (error) {
    throw new HttpError(400, error.message);
  }
}

async function lockOrderMachines(client, orderId, assignments) {
  const existing = await client.query(
    'SELECT DISTINCT machine_id FROM machine_loads WHERE order_id = $1',
    [orderId],
  );
  const machineIds = uniqueNumbers([
    ...existing.rows.map((row) => row.machine_id),
    ...assignments.map((assignment) => assignment.machineId),
  ]).sort((a, b) => a - b);
  if (machineIds.length === 0) return;

  const locked = await client.query(
    'SELECT id FROM machines WHERE id = ANY($1::integer[]) ORDER BY id FOR UPDATE',
    [machineIds],
  );
  if (locked.rowCount !== machineIds.length) {
    throw new HttpError(409, 'One or more assigned machines no longer exist');
  }
}

async function startQueuedWasherLoads(client, order) {
  const queued = await client.query(
    `SELECT COALESCE(SUM(ml.weight_kg), 0) AS weight
     FROM machine_loads ml JOIN machines m ON m.id = ml.machine_id
     WHERE ml.order_id = $1 AND m.machine_kind = 'washer' AND ml.status = 'queued'`,
    [order.id],
  );
  const queuedCentiKg = toCentiKg(queued.rows[0].weight);
  if (queuedCentiKg === 0) {
    throw new HttpError(400, 'Select at least one available washer before starting the wash');
  }
  if (queuedCentiKg !== toCentiKg(order.weight_kg)) {
    throw new HttpError(409, 'Assign the full order weight to washer loads before starting the wash');
  }

  const started = await client.query(
    `UPDATE machine_loads ml
     SET status = 'running', started_at = COALESCE(started_at, now())
     FROM machines m
     WHERE ml.machine_id = m.id AND ml.order_id = $1
       AND m.machine_kind = 'washer' AND ml.status = 'queued'
     RETURNING ml.machine_id`,
    [order.id],
  );
  if (started.rowCount) {
    await client.query(
      `UPDATE machines SET status = 'running'
       WHERE id = ANY($1::integer[]) AND status <> 'maintenance'`,
      [uniqueNumbers(started.rows.map((row) => row.machine_id))],
    );
  }
}

async function assignMachineLoads(client, { orderId, machineKind, assignments }) {
  const machineIds = assignments.map((assignment) => assignment.machineId);

  const machineResult = await client.query(
    `SELECT id, name, machine_kind, capacity_kg, status
     FROM machines WHERE id = ANY($1::integer[]) ORDER BY id`,
    [machineIds],
  );
  const machineById = new Map(machineResult.rows.map((machine) => [Number(machine.id), machine]));
  for (const assignment of assignments) {
    const machine = machineById.get(assignment.machineId);
    if (!machine || machine.machine_kind !== machineKind) {
      throw new HttpError(409, `Select only available ${machineKind}s for this order stage`);
    }
    if (machine.status !== 'available' || Number(machine.capacity_kg) < assignment.weightKg) {
      throw new HttpError(409, `${machine.name} is unavailable or too small for its assigned load`);
    }
  }

  const busy = await client.query(
    `SELECT m.name FROM machines m
     WHERE m.id = ANY($1::integer[])
       AND EXISTS (SELECT 1 FROM machine_loads ml
                   WHERE ml.machine_id = m.id AND ml.status IN ('queued', 'running'))`,
    [machineIds],
  );
  if (busy.rowCount) {
    throw new HttpError(409, `Machine is already assigned: ${busy.rows.map((row) => row.name).join(', ')}`);
  }

  const maxLoad = await client.query(
    'SELECT COALESCE(MAX(load_number), 0) AS max_load FROM machine_loads WHERE order_id = $1',
    [orderId],
  );
  let loadNumber = Number(maxLoad.rows[0].max_load) + 1;
  for (const assignment of assignments) {
    await client.query(
      `INSERT INTO machine_loads (order_id, machine_id, load_number, weight_kg, status)
       VALUES ($1, $2, $3, $4, 'queued')`,
      [orderId, assignment.machineId, loadNumber, assignment.weightKg],
    );
    loadNumber += 1;
  }
}

async function finishDryerStage(client, order) {
  const dryerLoads = await client.query(
    `SELECT COALESCE(SUM(ml.weight_kg), 0) AS weight
     FROM machine_loads ml JOIN machines m ON m.id = ml.machine_id
     WHERE ml.order_id = $1 AND m.machine_kind = 'dryer' AND ml.status = 'running'`,
    [order.id],
  );
  if (toCentiKg(dryerLoads.rows[0].weight) !== toCentiKg(order.weight_kg)) {
    throw new HttpError(409, 'Assign and run the full order weight on dryers before folding');
  }
  await finishMachineStage(client, order.id, 'dryer');
}

async function chargeCompletionAddons(client, orderId, completionAddons) {
  const addonIds = completionAddons.map((addon) => addon.id);

  const addonRows = await client.query(
    `SELECT id, name, price FROM service_addons
     WHERE id = ANY($1::integer[]) AND is_active = true
     ORDER BY id FOR SHARE`,
    [addonIds],
  );
  if (addonRows.rowCount !== completionAddons.length) {
    throw new HttpError(409, 'One or more selected add-ons are no longer available');
  }

  const previouslyAdded = await client.query(
    `SELECT addon_id FROM order_addons
     WHERE order_id = $1 AND addon_id = ANY($2::integer[])`,
    [orderId, addonIds],
  );
  if (previouslyAdded.rowCount) {
    throw new HttpError(409, 'An add-on has already been charged to this order');
  }

  const quantityById = new Map(completionAddons.map((addon) => [addon.id, addon.quantity]));
  let addedCents = 0;
  for (const addon of addonRows.rows) {
    const quantity = quantityById.get(Number(addon.id));
    const unitPriceCents = Math.round(Number(addon.price) * 100);
    const lineTotalCents = unitPriceCents * quantity;
    addedCents += lineTotalCents;
    await client.query(
      `INSERT INTO order_addons
         (order_id, addon_id, name_snapshot, unit_price_snapshot, quantity, line_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, addon.id, addon.name, unitPriceCents / 100, quantity, lineTotalCents / 100],
    );
  }
  await client.query(
    'UPDATE orders SET price = price + $2::numeric / 100 WHERE id = $1',
    [orderId, addedCents],
  );
}

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');
    const body = req.body || {};

    const order = await db.withTransaction(async (client) => {
      const current = await client.query(
        'SELECT id, status, load_type, weight_kg, price FROM orders WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (current.rows.length === 0) {
        throw new HttpError(404, `No order with id ${id}`);
      }
      const before = current.rows[0];

      const { status, note } = validateStatusChange(before.status, body);
      const machineKind = requiredMachineKind(before.load_type, status);
      const assignments = parseMachineAssignments(body, before, status, machineKind);
      const { completionAddons, addonDecision } = parseCompletionChoices(body, status);

      await lockOrderMachines(client, id, assignments);

      if (status === 'washing' && !assignments.length && WASHER_LOAD_TYPES.includes(before.load_type)) {
        await startQueuedWasherLoads(client, before);
      }
      if (status === 'drying' && WASHER_LOAD_TYPES.includes(before.load_type)) {
        await finishMachineStage(client, id, 'washer');
      }
      if (machineKind && assignments.length) {
        await assignMachineLoads(client, { orderId: id, machineKind, assignments });
        if (status === 'drying' || status === 'washing') {
          await startQueuedLoads(
            client,
            id,
            assignments.map((assignment) => assignment.machineId),
          );
        }
      }
      if (status === 'folding' && DRYER_LOAD_TYPES.includes(before.load_type)) {
        await finishDryerStage(client, before);
      }
      if (status === 'completed' && addonDecision === 'add' && completionAddons.length) {
        await chargeCompletionAddons(client, id, completionAddons);
      }

      await client.query(
        `UPDATE orders
         SET status = $1,
             updated_at = now(),
             completed_at = CASE WHEN $1 = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END
         WHERE id = $2`,
        [status, id],
      );
      await client.query(
        'INSERT INTO order_status_history (order_id, status, note) VALUES ($1, $2, $3)',
        [id, status, note],
      );
      const full = await client.query(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
      return full.rows[0];
    });

    res.json({ order });
  }),
);

router.post(
  '/:id/payment',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');
    const { amount, method } = validatePayment(req.body);

    if (amount <= 0) {
      throw new HttpError(400, 'Payment amount must be greater than zero');
    }

    const payment = await db.withTransaction(async (client) => {
      const orderResult = await client.query(
        "SELECT id, price FROM orders WHERE id = $1 FOR UPDATE",
        [id],
      );

      if (orderResult.rows.length === 0) {
        throw new HttpError(404, `No order with id ${id}`);
      }

      const order = orderResult.rows[0];
      const paidResult = await client.query(
        "SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM payments WHERE order_id = $1",
        [id],
      );

      const priceCents = Math.round(Number(order.price) * 100);
      const paidCents = Math.round(Number(paidResult.rows[0].paid_amount) * 100);
      const amountCents = Math.round(amount * 100);
      const balanceCents = priceCents - paidCents;

      if (amountCents > balanceCents) {
        throw new HttpError(
          400,
          `Payment exceeds the remaining balance of ${(Math.max(balanceCents, 0) / 100).toFixed(2)}`,
        );
      }

      const result = await client.query(
        `INSERT INTO payments (order_id, amount, method)
         VALUES ($1, $2, $3)
         RETURNING id, order_id, amount, method, paid_at`,
        [id, amountCents / 100, method],
      );

      return result.rows[0];
    });

    res.status(201).json({ payment });
  }),
);

router.get(
  '/:id/load-plan',
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.id, 'order_id');
    const capacityKg = Number(req.query.capacity_kg);

    if (!Number.isFinite(capacityKg) || capacityKg <= 0) {
      throw new HttpError(400, 'capacity_kg must be a number greater than 0');
    }
    if (Math.abs(capacityKg * 100 - Math.round(capacityKg * 100)) > 1e-7) {
      throw new HttpError(400, 'capacity_kg must have no more than two decimal places');
    }
    if (capacityKg < 0.1 || capacityKg > 100) {
      throw new HttpError(400, 'capacity_kg must be from 0.1 to 100 kg');
    }

    const { rows } = await db.query(
      `SELECT id, weight_kg
       FROM orders
       WHERE id = $1`,
      [orderId],
    );

    if (rows.length === 0) {
      throw new HttpError(404, `No order with id ${orderId}`);
    }

    const weightKg = Number(rows[0].weight_kg);

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      throw new HttpError(409, 'This order does not have a valid weight');
    }

    let loads;
    try {
      loads = splitLoadWeight(weightKg, capacityKg);
    } catch (error) {
      throw new HttpError(400, error.message);
    }

    res.json({
      order_id: orderId,
      total_weight_kg: weightKg,
      capacity_kg: capacityKg,
      load_count: loads.length,
      loads,
    });
  }),
);

router.post(
  '/:id/loads',
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.id, 'order_id');
    const { machineId, loadNumber, weightKg, notes } = validateMachineLoad(req.body);

    const load = await db.withTransaction(async (client) => {
      const orderResult = await client.query(
        'SELECT id, weight_kg, load_type FROM orders WHERE id = $1 FOR UPDATE',
        [orderId],
      );
      if (orderResult.rowCount === 0) {
        throw new HttpError(404, `No order with id ${orderId}`);
      }
      const order = orderResult.rows[0];
      if (!order.weight_kg || order.load_type === 'fold_only') {
        throw new HttpError(409, 'This order does not have a machine-assignable load');
      }

      const machineResult = await client.query(
        `SELECT id, name, machine_kind, capacity_kg, status
         FROM machines
         WHERE id = $1
         FOR UPDATE`,
        [machineId],
      );
      if (machineResult.rowCount === 0) {
        throw new HttpError(404, `No machine with id ${machineId}`);
      }
      const machine = machineResult.rows[0];

      if (machine.status === 'maintenance') {
        throw new HttpError(409, 'This machine is currently in maintenance');
      }
      if (machine.status === 'running') {
        throw new HttpError(409, 'This machine is already running a load');
      }

      const expectedKind = EXCLUSIVE_MACHINE_KIND[order.load_type];
      if (expectedKind && machine.machine_kind !== expectedKind) {
        throw new HttpError(409, `This order requires a ${expectedKind}`);
      }
      if (weightKg > Number(machine.capacity_kg)) {
        throw new HttpError(409, `This load exceeds the machine capacity of ${machine.capacity_kg}kg`);
      }

      const assigned = await client.query(
        'SELECT COALESCE(SUM(weight_kg), 0) AS assigned_kg FROM machine_loads WHERE order_id = $1',
        [orderId],
      );
      if (toCentiKg(assigned.rows[0].assigned_kg) + toCentiKg(weightKg) > toCentiKg(order.weight_kg)) {
        throw new HttpError(409, 'Assigned load weight cannot exceed the order weight');
      }

      const activeLoad = await client.query(
        `SELECT id FROM machine_loads
         WHERE machine_id = $1 AND status IN ('queued', 'running')
         LIMIT 1`,
        [machineId],
      );
      if (activeLoad.rowCount > 0) {
        throw new HttpError(409, 'This machine already has an active load');
      }

      const inserted = await client.query(
        `INSERT INTO machine_loads
           (order_id, machine_id, load_number, weight_kg, status, notes)
         VALUES ($1, $2, $3, $4, 'queued', $5)
         RETURNING ${LOAD_COLUMNS}`,
        [orderId, machineId, loadNumber, weightKg, notes],
      );
      return inserted.rows[0];
    });

    res.status(201).json({ load });
  }),
);

router.patch(
  '/:orderId/loads/:loadId/status',
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.orderId, 'order_id');
    const loadId = parseId(req.params.loadId, 'load_id');
    const nextStatus = String((req.body || {}).status || '').trim();

    if (!Object.keys(LOAD_TRANSITIONS).includes(nextStatus)) {
      throw new HttpError(400, 'status must be one of: queued, running, completed');
    }

    const load = await db.withTransaction(async (client) => {
      const loadResult = await client.query(
        `SELECT ml.id, ml.machine_id, ml.status, m.status AS machine_status
         FROM machine_loads ml
         JOIN machines m ON m.id = ml.machine_id
         WHERE ml.id = $1 AND ml.order_id = $2
         FOR UPDATE`,
        [loadId, orderId],
      );
      if (loadResult.rowCount === 0) {
        throw new HttpError(404, `No machine load with id ${loadId} for order ${orderId}`);
      }
      const current = loadResult.rows[0];

      const allowedNext = LOAD_TRANSITIONS[current.status];
      if (!allowedNext.includes(nextStatus)) {
        throw new HttpError(
          409,
          `A ${current.status} load can only move to ${allowedNext.join(', ') || 'no further status'}`,
        );
      }
      if (nextStatus === 'running' && current.machine_status === 'maintenance') {
        throw new HttpError(409, 'This machine is currently in maintenance');
      }

      const starting = nextStatus === 'running';
      await client.query('UPDATE machines SET status = $2 WHERE id = $1', [
        current.machine_id,
        starting ? 'running' : 'available',
      ]);
      const updated = await client.query(
        starting
          ? `UPDATE machine_loads SET status = 'running', started_at = now()
             WHERE id = $1 RETURNING ${LOAD_COLUMNS}`
          : `UPDATE machine_loads SET status = 'completed', completed_at = now()
             WHERE id = $1 RETURNING ${LOAD_COLUMNS}`,
        [loadId],
      );
      return updated.rows[0];
    });

    res.json({ load });
  }),
);

module.exports = router;
