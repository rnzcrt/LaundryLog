'use strict';

const express = require('express');
const db = require('../db');
const { HttpError, asyncHandler } = require('../middleware/httpError');
const {
  STATUSES,
  parseId,
  validateNewOrder,
  validateStatusChange,
  validatePayment,
  validateMachineLoad,
} = require('../validators/orderValidators');

const router = express.Router();

const ORDER_SELECT = `
  SELECT o.id,
         o.customer_id,
         c.name  AS customer_name,
         c.phone AS customer_phone,
         o.load_type,
         o.weight_kg,
         o.item_count,
         o.price,
         o.status,
         o.note,
         o.created_at,
         o.updated_at,
         p.amount AS paid_amount,
         p.method AS paid_method,
         p.paid_at
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN payments p ON p.order_id = o.id
`;

/**
 * GET /api/orders
 * Optional query: ?status=washing  ?q=maria
 * The filter tabs on the order list use this.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      if (!STATUSES.includes(status)) {
        throw new HttpError(400, 'Validation failed', [
          { field: 'status', message: `status must be one of: all, ${STATUSES.join(', ')}` },
        ]);
      }
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    if (q && String(q).trim() !== '') {
      params.push(`%${String(q).trim()}%`);
      conditions.push(`(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(`${ORDER_SELECT} ${where} ORDER BY o.created_at DESC`, params);

    res.json({ count: rows.length, orders: rows });
  }),
);

/**
 * GET /api/orders/:id
 * One order with its customer, its status timeline and its payment.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');

    const { rows } = await db.query(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
    if (rows.length === 0) {
      throw new HttpError(404, `No order with id ${id}`);
    }

    const history = await db.query(
      'SELECT status, note, changed_at FROM order_status_history WHERE order_id = $1 ORDER BY changed_at',
      [id],
    );

    res.json({ order: rows[0], history: history.rows });
  }),
);

/**
 * POST /api/orders
 * Creates the order, and the customer too if this is a first visit.
 * Both inserts plus the first history row happen in one transaction so a
 * half-written order can never be left behind.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = validateNewOrder(req.body);

    const order = await db.withTransaction(async (client) => {
      let customerId = input.customerId;

      if (customerId === null) {
        const existing = await client.query('SELECT id FROM customers WHERE phone = $1', [input.phone]);
        if (existing.rows.length > 0) {
          customerId = existing.rows[0].id;
        } else {
          const created = await client.query(
            'INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING id',
            [input.name, input.phone],
          );
          customerId = created.rows[0].id;
        }
      } else {
        const found = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
        if (found.rows.length === 0) {
          throw new HttpError(404, `No customer with id ${customerId}`);
        }
      }

      const inserted = await client.query(
        `INSERT INTO orders (customer_id, load_type, weight_kg, item_count, price, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [customerId, input.loadType, input.weightKg, input.itemCount, input.price, input.note],
      );
      const orderId = inserted.rows[0].id;

      await client.query(
        'INSERT INTO order_status_history (order_id, status, note) VALUES ($1, $2, $3)',
        [orderId, 'received', 'Dropped off at counter'],
      );

      const full = await client.query(`${ORDER_SELECT} WHERE o.id = $1`, [orderId]);
      return full.rows[0];
    });

    res.status(201).location(`/api/orders/${order.id}`).json({ order });
  }),
);

/**
 * PATCH /api/orders/:id/status
 * Moves an order one step along received -> washing -> ready -> picked up.
 */
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');

    const current = await db.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      throw new HttpError(404, `No order with id ${id}`);
    }

    const { status, note } = validateStatusChange(current.rows[0].status, req.body);

    const order = await db.withTransaction(async (client) => {
      await client.query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
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

/**
 * POST /api/orders/:id/payment
 * Records payment for an order. One payment per order for now.
 */
router.post(
  '/:id/payment',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');
    const { amount, method } = validatePayment(req.body);

    const order = await db.query('SELECT id FROM orders WHERE id = $1', [id]);
    if (order.rows.length === 0) {
      throw new HttpError(404, `No order with id ${id}`);
    }

    const { rows } = await db.query(
      `INSERT INTO payments (order_id, amount, method)
       VALUES ($1, $2, $3)
       RETURNING id, order_id, amount, method, paid_at`,
      [id, amount, method],
    );

    res.status(201).json({ payment: rows[0] });
  }),
);

router.post(
  '/:id/loads',
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.id, 'order_id');
    const { machineId, loadNumber, weightKg, notes } = validateMachineLoad(req.body);

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

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

      if (machine.status === 'maintenance') {
        throw new HttpError(409, 'This machine is currently in maintenance');
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
        throw new HttpError(409, 'This machine already has an active load');
      }

      const loadResult = await client.query(
        `INSERT INTO machine_loads
          (order_id, machine_id, load_number, weight_kg, status, notes)
         VALUES ($1, $2, $3, $4, 'queued', $5)
         RETURNING id, order_id, machine_id, load_number, weight_kg,
                   status, started_at, completed_at, notes, created_at`,
        [orderId, machineId, loadNumber, weightKg, notes],
      );

      await client.query('COMMIT');

      res.status(201).json({ load: loadResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

router.patch(
  '/:orderId/loads/:loadId/status',
  asyncHandler(async (req, res) => {
    const orderId = parseId(req.params.orderId, 'order_id');
    const loadId = parseId(req.params.loadId, 'load_id');

    const allowedStatuses = ['queued', 'running', 'completed'];
    const nextStatus = String(req.body.status || '').trim();

    if (!allowedStatuses.includes(nextStatus)) {
      throw new HttpError(
        400,
        'status must be one of: queued, running, completed',
      );
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

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
        queued: ['running'],
        running: ['completed'],
        completed: [],
      };

      if (!validTransitions[load.status].includes(nextStatus)) {
        throw new HttpError(
          409,
          `A ${load.status} load can only move to ${
            validTransitions[load.status].join(', ') || 'no further status'
          }`,
        );
      }

      if (nextStatus === 'running' && load.machine_status === 'maintenance') {
        throw new HttpError(
          409,
          'This machine is currently in maintenance',
        );
      }

      let updateQuery;
      let updateParams;

      if (nextStatus === 'running') {
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

      await client.query('COMMIT');

      res.json({ load: updatedLoad.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

module.exports = router;
