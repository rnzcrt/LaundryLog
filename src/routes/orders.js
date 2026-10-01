"use strict";

const express = require("express");
const db = require("../db");
const { HttpError, asyncHandler } = require("../middleware/httpError");
const { calculateOrderPrice } = require("../utils/pricing");
const {
  STATUSES,
  parseId,
  validateNewOrder,
  validateStatusChange,
  validatePayment,
  validateMachineLoad,
} = require("../validators/orderValidators");
const { splitLoadWeight } = require("../utils/loadSplitter");
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

/**
 * GET /api/orders
 * Optional query: ?status=washing  ?q=maria
 * The filter tabs on the order list use this.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, q } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      if (!STATUSES.includes(status)) {
        throw new HttpError(400, "Validation failed", [
          {
            field: "status",
            message: `status must be one of: all, ${STATUSES.join(", ")}`,
          },
        ]);
      }
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    if (q && String(q).trim() !== "") {
      params.push(`%${String(q).trim()}%`);
      conditions.push(
        `(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await db.query(
      `${ORDER_SELECT} ${where} ORDER BY o.created_at DESC`,
      params,
    );

    res.json({ count: rows.length, orders: rows });
  }),
);

/**
 * GET /api/orders/:id
 * One order with its customer, its status timeline and its payment.
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "order id");

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

/**
 * POST /api/orders
 * Creates the order, and the customer too if this is a first visit.
 * Both inserts plus the first history row happen in one transaction so a
 * half-written order can never be left behind.
 */
router.post(
  "/",
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
        [orderId, "waiting", "Order received"],
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
  const machineIds = [...new Set(completed.rows.map((row) => Number(row.machine_id)))];
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

/**
 * PATCH /api/orders/:id/status
 * Moves an order one step along new -> waiting -> washing -> drying -> folding -> ready -> completed.
 */
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "order id");
    const body = req.body || {};

    const order = await db.withTransaction(async (client) => {
      const current = await client.query(
        'SELECT id, status, load_type, weight_kg, price FROM orders WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (current.rows.length === 0) {
        throw new HttpError(404, `No order with id ${id}`);
      }

      const { status, note } = validateStatusChange(
        current.rows[0].status,
        body,
      );

      const before = current.rows[0];
      const machineKind = requiredMachineKind(before.load_type, status);
      let assignments = [];
      try {
        if (machineKind) {
          const useExistingWasherLoads = status === 'washing' &&
            (body.machine_assignments === undefined ||
              (Array.isArray(body.machine_assignments) && body.machine_assignments.length === 0));
          if (useExistingWasherLoads) {
            assignments = [];
          } else {
            assignments = validateMachineAssignments(
              body.machine_assignments,
              before.weight_kg,
            );
          }
        } else if (body.machine_assignments !== undefined &&
                   (!Array.isArray(body.machine_assignments) || body.machine_assignments.length > 0)) {
          throw new Error('This order stage does not require machine assignments');
        }
      } catch (error) {
        throw new HttpError(400, error.message);
      }

      let completionAddons = [];
      let addonDecision = null;
      if (status === 'completed') {
        try {
          completionAddons = validateCompletionChoices(body);
          addonDecision = body.addon_decision;
        } catch (error) {
          throw new HttpError(400, error.message);
        }
      } else if (body.addons !== undefined || body.addon_decision !== undefined) {
        throw new HttpError(400, 'Add-ons can only be confirmed when completing an order');
      }

      const oldMachineIds = await client.query(
        'SELECT DISTINCT machine_id FROM machine_loads WHERE order_id = $1',
        [id],
      );
      const lockMachineIds = [...new Set([
        ...oldMachineIds.rows.map((row) => Number(row.machine_id)),
        ...assignments.map((assignment) => assignment.machineId),
      ])].sort((a, b) => a - b);
      if (lockMachineIds.length) {
        const lockedMachines = await client.query(
          `SELECT id FROM machines WHERE id = ANY($1::integer[]) ORDER BY id FOR UPDATE`,
          [lockMachineIds],
        );
        if (lockedMachines.rowCount !== lockMachineIds.length) {
          throw new HttpError(409, 'One or more assigned machines no longer exist');
        }
      }

      if (status === 'washing' && !assignments.length && ['wash_fold', 'wash_only'].includes(before.load_type)) {
        const washerLoads = await client.query(
          `SELECT COALESCE(SUM(ml.weight_kg), 0) AS weight
           FROM machine_loads ml JOIN machines m ON m.id = ml.machine_id
           WHERE ml.order_id = $1 AND m.machine_kind = 'washer' AND ml.status = 'queued'`,
          [id],
        );
        const queuedWeightCentiKg = Math.round(Number(washerLoads.rows[0].weight) * 100);
        if (queuedWeightCentiKg === 0) {
          throw new HttpError(400, 'Select at least one available washer before starting the wash');
        }
        if (queuedWeightCentiKg !== Math.round(Number(before.weight_kg) * 100)) {
          throw new HttpError(409, 'Assign the full order weight to washer loads before starting the wash');
        }
        const started = await client.query(
          `UPDATE machine_loads ml
           SET status = 'running', started_at = COALESCE(started_at, now())
           FROM machines m
           WHERE ml.machine_id = m.id AND ml.order_id = $1
             AND m.machine_kind = 'washer' AND ml.status = 'queued'
           RETURNING ml.machine_id`,
          [id],
        );
        if (started.rowCount) {
          await client.query(
            "UPDATE machines SET status = 'running' WHERE id = ANY($1::integer[]) AND status <> 'maintenance'",
            [[...new Set(started.rows.map((row) => Number(row.machine_id))) ]],
          );
        }
      }

      if (status === 'drying' && ['wash_fold', 'wash_only'].includes(before.load_type)) {
        await finishMachineStage(client, id, 'washer');
      }

      if (machineKind) {
        const machineResult = await client.query(
          `SELECT id, machine_kind, capacity_kg, status
           FROM machines WHERE id = ANY($1::integer[]) ORDER BY id`,
          [assignments.map((assignment) => assignment.machineId)],
        );
        const machineById = new Map(machineResult.rows.map((machine) => [Number(machine.id), machine]));
        for (const assignment of assignments) {
          const machine = machineById.get(assignment.machineId);
          if (!machine || machine.machine_kind !== machineKind) {
            throw new HttpError(409, `Select only available ${machineKind}s for this order stage`);
          }
          if (machine.status !== 'available' || Number(machine.capacity_kg) < assignment.weightKg) {
            throw new HttpError(409, `${machine.name || 'Selected machine'} is unavailable or too small for its assigned load`);
          }
        }
        const busy = await client.query(
          `SELECT m.name FROM machines m
           WHERE m.id = ANY($1::integer[])
             AND EXISTS (SELECT 1 FROM machine_loads ml
                         WHERE ml.machine_id = m.id AND ml.status IN ('queued', 'running'))`,
          [assignments.map((assignment) => assignment.machineId)],
        );
        if (busy.rowCount) {
          throw new HttpError(409, `Machine is already assigned: ${busy.rows.map((row) => row.name).join(', ')}`);
        }
        const maxLoad = await client.query(
          'SELECT COALESCE(MAX(load_number), 0) AS max_load FROM machine_loads WHERE order_id = $1',
          [id],
        );
        let loadNumber = Number(maxLoad.rows[0].max_load) + 1;
        for (const assignment of assignments) {
          await client.query(
            `INSERT INTO machine_loads (order_id, machine_id, load_number, weight_kg, status)
             VALUES ($1, $2, $3, $4, 'queued')`,
            [id, assignment.machineId, loadNumber, assignment.weightKg],
          );
          loadNumber += 1;
        }
        if (status === 'drying') {
          await client.query(
            "UPDATE machines SET status = 'running' WHERE id = ANY($1::integer[]) AND status <> 'maintenance'",
            [assignments.map((assignment) => assignment.machineId)],
          );
          await client.query(
            `UPDATE machine_loads SET status = 'running', started_at = COALESCE(started_at, now())
             WHERE order_id = $1 AND machine_id = ANY($2::integer[]) AND status = 'queued'`,
            [id, assignments.map((assignment) => assignment.machineId)],
          );
        } else if (status === 'washing') {
          await client.query(
            "UPDATE machines SET status = 'running' WHERE id = ANY($1::integer[]) AND status <> 'maintenance'",
            [assignments.map((assignment) => assignment.machineId)],
          );
          await client.query(
            `UPDATE machine_loads SET status = 'running', started_at = COALESCE(started_at, now())
             WHERE order_id = $1 AND machine_id = ANY($2::integer[]) AND status = 'queued'`,
            [id, assignments.map((assignment) => assignment.machineId)],
          );
        }
      }

      if (status === 'folding' && ['wash_fold', 'dry_only'].includes(before.load_type)) {
        const dryerLoads = await client.query(
          `SELECT COALESCE(SUM(ml.weight_kg), 0) AS weight
           FROM machine_loads ml JOIN machines m ON m.id = ml.machine_id
           WHERE ml.order_id = $1 AND m.machine_kind = 'dryer' AND ml.status = 'running'`,
          [id],
        );
        if (Math.round(Number(dryerLoads.rows[0].weight) * 100) !==
            Math.round(Number(before.weight_kg) * 100)) {
          throw new HttpError(409, 'Assign and run the full order weight on dryers before folding');
        }
        await finishMachineStage(client, id, 'dryer');
      }

      if (status === 'completed' && addonDecision === 'add' && completionAddons.length) {
        const addonRows = await client.query(
          `SELECT id, name, price FROM service_addons
           WHERE id = ANY($1::integer[]) AND is_active = true
           ORDER BY id FOR SHARE`,
          [completionAddons.map((addon) => addon.id)],
        );
        if (addonRows.rowCount !== completionAddons.length) {
          throw new HttpError(409, 'One or more selected add-ons are no longer available');
        }
        const previouslyAdded = await client.query(
          `SELECT addon_id FROM order_addons
           WHERE order_id = $1 AND addon_id = ANY($2::integer[])`,
          [id, completionAddons.map((addon) => addon.id)],
        );
        if (previouslyAdded.rowCount) {
          throw new HttpError(409, 'An add-on has already been charged to this order');
        }
        const choicesById = new Map(completionAddons.map((addon) => [addon.id, addon]));
        let addedCents = 0;
        for (const addon of addonRows.rows) {
          const quantity = choicesById.get(Number(addon.id)).quantity;
          const unitPriceCents = Math.round(Number(addon.price) * 100);
          const lineTotalCents = unitPriceCents * quantity;
          addedCents += lineTotalCents;
          await client.query(
            `INSERT INTO order_addons
               (order_id, addon_id, name_snapshot, unit_price_snapshot, quantity, line_total)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, addon.id, addon.name, unitPriceCents / 100, quantity, lineTotalCents / 100],
          );
        }
        await client.query(
          'UPDATE orders SET price = price + $2::numeric / 100 WHERE id = $1',
          [id, addedCents],
        );
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
        "INSERT INTO order_status_history (order_id, status, note) VALUES ($1, $2, $3)",
        [id, status, note],
      );
      const full = await client.query(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
      return full.rows[0];
    });

    res.json({ order });
  }),
);

/**
 * POST /api/orders/:id/payment
 * Records a partial or final payment without allowing overpayment.
 */
router.post(
  "/:id/payment",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "order id");
    const { amount, method } = validatePayment(req.body);

    if (amount <= 0) {
      throw new HttpError(400, "Payment amount must be greater than zero");
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
  "/:id/load-plan",
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.id, "order_id");
    const capacityKg = Number(req.query.capacity_kg);

    if (!Number.isFinite(capacityKg) || capacityKg <= 0) {
      throw new HttpError(400, "capacity_kg must be a number greater than 0");
    }
    if (Math.abs(capacityKg * 100 - Math.round(capacityKg * 100)) > 1e-7) {
      throw new HttpError(400, "capacity_kg must have no more than two decimal places");
    }
    if (capacityKg < 0.1 || capacityKg > 100) {
      throw new HttpError(400, "capacity_kg must be from 0.1 to 100 kg");
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
      throw new HttpError(409, "This order does not have a valid weight");
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
  "/:id/loads",
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.id, "order_id");
    const { machineId, loadNumber, weightKg, notes } = validateMachineLoad(
      req.body,
    );

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `SELECT id, weight_kg, load_type
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId],
      );

      if (orderResult.rowCount === 0) {
        throw new HttpError(404, `No order with id ${orderId}`);
      }
      const orderRow = orderResult.rows[0];
      if (!orderRow.weight_kg || orderRow.load_type === 'fold_only') {
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

      if (machine.status === "maintenance") {
        throw new HttpError(409, "This machine is currently in maintenance");
      }
      if (machine.status === 'running') {
        throw new HttpError(409, 'This machine is already running a load');
      }

      const expectedKind = orderRow.load_type === 'wash_only'
        ? 'washer'
        : orderRow.load_type === 'dry_only'
          ? 'dryer'
          : null;
      if (expectedKind && machine.machine_kind !== expectedKind) {
        throw new HttpError(409, `This order requires a ${expectedKind}`);
      }

      if (weightKg > Number(machine.capacity_kg)) {
        throw new HttpError(
          409,
          `This load exceeds the machine capacity of ${machine.capacity_kg}kg`,
        );
      }

      const assignedResult = await client.query(
        'SELECT COALESCE(SUM(weight_kg), 0) AS assigned_kg FROM machine_loads WHERE order_id = $1',
        [orderId],
      );
      const assignedCentiKg = Math.round(Number(assignedResult.rows[0].assigned_kg) * 100);
      const nextCentiKg = assignedCentiKg + Math.round(weightKg * 100);
      const orderCentiKg = Math.round(Number(orderRow.weight_kg) * 100);
      if (nextCentiKg > orderCentiKg) {
        throw new HttpError(409, 'Assigned load weight cannot exceed the order weight');
      }

      const existingLoad = await client.query(
        `SELECT id
         FROM machine_loads
         WHERE machine_id = $1
           AND status IN ('queued', 'running')
         LIMIT 1`,
        [machineId],
      );

      if (existingLoad.rowCount > 0) {
        throw new HttpError(409, "This machine already has an active load");
      }

      const loadResult = await client.query(
        `INSERT INTO machine_loads
          (order_id, machine_id, load_number, weight_kg, status, notes)
         VALUES ($1, $2, $3, $4, 'queued', $5)
         RETURNING id, order_id, machine_id, load_number, weight_kg,
                   status, started_at, completed_at, notes, created_at`,
        [orderId, machineId, loadNumber, weightKg, notes],
      );

      await client.query("COMMIT");

      res.status(201).json({ load: loadResult.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

router.patch(
  "/:orderId/loads/:loadId/status",
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.orderId, "order_id");
    const loadId = parseId(req.params.loadId, "load_id");

    const allowedStatuses = ["queued", "running", "completed"];
    const nextStatus = String(req.body.status || "").trim();

    if (!allowedStatuses.includes(nextStatus)) {
      throw new HttpError(
        400,
        "status must be one of: queued, running, completed",
      );
    }

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const loadResult = await client.query(
        `SELECT ml.id,
                ml.order_id,
                ml.machine_id,
                ml.status,
                m.status AS machine_status
         FROM machine_loads ml
         JOIN machines m ON m.id = ml.machine_id
         WHERE ml.id = $1
           AND ml.order_id = $2
         FOR UPDATE`,
        [loadId, orderId],
      );

      if (loadResult.rowCount === 0) {
        throw new HttpError(
          404,
          `No machine load with id ${loadId} for order ${orderId}`,
        );
      }

      const load = loadResult.rows[0];

      const validTransitions = {
        queued: ["running"],
        running: ["completed"],
        completed: [],
      };

      if (!validTransitions[load.status].includes(nextStatus)) {
        throw new HttpError(
          409,
          `A ${load.status} load can only move to ${
            validTransitions[load.status].join(", ") || "no further status"
          }`,
        );
      }

      if (nextStatus === "running" && load.machine_status === "maintenance") {
        throw new HttpError(409, "This machine is currently in maintenance");
      }

      let updateQuery;
      let updateParams;

      if (nextStatus === "running") {
        updateQuery = `
          UPDATE machine_loads
          SET status = 'running',
              started_at = now()
          WHERE id = $1
          RETURNING id, order_id, machine_id, load_number, weight_kg,
                    status, started_at, completed_at, notes, created_at
        `;
        updateParams = [loadId];

        await client.query(
          `UPDATE machines
           SET status = 'running'
           WHERE id = $1`,
          [load.machine_id],
        );
      } else {
        updateQuery = `
          UPDATE machine_loads
          SET status = 'completed',
              completed_at = now()
          WHERE id = $1
          RETURNING id, order_id, machine_id, load_number, weight_kg,
                    status, started_at, completed_at, notes, created_at
        `;
        updateParams = [loadId];

        await client.query(
          `UPDATE machines
           SET status = 'available'
           WHERE id = $1`,
          [load.machine_id],
        );
      }

      const updatedLoad = await client.query(updateQuery, updateParams);

      await client.query("COMMIT");

      res.json({ load: updatedLoad.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

module.exports = router;
