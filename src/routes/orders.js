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
         COALESCE(pay.paid_amount, 0) AS paid_amount,
         pay.paid_method,
         pay.latest_paid_at AS paid_at,
         CASE
           WHEN COALESCE(pay.paid_amount, 0) >= o.price THEN 'FULLY PAID'
           ELSE 'UNPAID'
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

    res.json({
      order: rows[0],
      history: history.rows,
      payments: payments.rows,
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

    const price = calculateOrderPrice({
      loadType: input.loadType,
      weightKg: input.weightKg,
      washMachineType: input.washMachineType,
      dryMachineType: input.dryMachineType,
    });

    const order = await db.withTransaction(async (client) => {
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
            "INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING id",
            [input.name, input.phone],
          );
          customerId = created.rows[0].id;
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
        `INSERT INTO orders (customer_id, load_type, weight_kg, item_count, price, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          customerId,
          input.loadType,
          input.weightKg,
          input.itemCount,
          price,
          input.note,
        ],
      );
      const orderId = inserted.rows[0].id;

      await client.query(
        "INSERT INTO order_status_history (order_id, status, note) VALUES ($1, $2, $3)",
        [orderId, "new", "Dropped off at counter"],
      );

      const full = await client.query(`${ORDER_SELECT} WHERE o.id = $1`, [
        orderId,
      ]);
      return full.rows[0];
    });

    res.status(201).location(`/api/orders/${order.id}`).json({ order });
  }),
);

/**
 * PATCH /api/orders/:id/status
 * Moves an order one step along new -> waiting -> washing -> drying -> folding -> ready -> completed.
 */
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "order id");

    const current = await db.query("SELECT status FROM orders WHERE id = $1", [
      id,
    ]);
    if (current.rows.length === 0) {
      throw new HttpError(404, `No order with id ${id}`);
    }

    const { status, note } = validateStatusChange(
      current.rows[0].status,
      req.body,
    );

    const order = await db.withTransaction(async (client) => {
      await client.query(
        "UPDATE orders SET status = $1, updated_at = now() WHERE id = $2",
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

    const capacityKg = Number(req.query.capacity_kg);

    if (!Number.isFinite(capacityKg) || capacityKg <= 0) {
      throw new HttpError(400, "capacity_kg must be a number greater than 0");
    }

    const loads = splitLoadWeight(weightKg, capacityKg);

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
        `SELECT id, weight_kg
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId],
      );

      if (orderResult.rowCount === 0) {
        throw new HttpError(404, `No order with id ${orderId}`);
      }

      const machineResult = await client.query(
        `SELECT id, name, machine_kind, capacity_kg, status
         FROM machines
         WHERE id = $1`,
        [machineId],
      );

      if (machineResult.rowCount === 0) {
        throw new HttpError(404, `No machine with id ${machineId}`);
      }

      const machine = machineResult.rows[0];

      if (machine.status === "maintenance") {
        throw new HttpError(409, "This machine is currently in maintenance");
      }

      if (weightKg > Number(machine.capacity_kg)) {
        throw new HttpError(
          409,
          `This load exceeds the machine capacity of ${machine.capacity_kg}kg`,
        );
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
