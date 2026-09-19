'use strict';

const express = require('express');
const db = require('../db');
const { HttpError, asyncHandler } = require('../middleware/httpError');
const { parseId, validateNewCustomer } = require('../validators/orderValidators');

const router = express.Router();

/**
 * GET /api/customers
 * The counter directory: who has been here, and how much they have open.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const params = [];
    let where = '';

    if (q && String(q).trim() !== '') {
      params.push(`%${String(q).trim()}%`);
      where = `WHERE c.name ILIKE $1 OR c.phone ILIKE $1`;
    }

    const { rows } = await db.query(
      `SELECT c.id,
              c.name,
              c.phone,
              c.notes,
              c.created_at,
              COUNT(o.id)::int AS order_count,
              COUNT(o.id) FILTER (WHERE o.status <> 'picked_up')::int AS open_order_count
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       ${where}
       GROUP BY c.id
       ORDER BY c.name`,
      params,
    );

    res.json({ count: rows.length, customers: rows });
  }),
);

/** GET /api/customers/:id - one customer and their order history. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'customer id');

    const customer = await db.query(
      'SELECT id, name, phone, notes, created_at FROM customers WHERE id = $1',
      [id],
    );
    if (customer.rows.length === 0) {
      throw new HttpError(404, `No customer with id ${id}`);
    }

    const orders = await db.query(
      `SELECT id, load_type, weight_kg, item_count, price, status, created_at
       FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
      [id],
    );

    res.json({ customer: customer.rows[0], orders: orders.rows });
  }),
);

/** POST /api/customers - add a customer without starting an order. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, phone, notes } = validateNewCustomer(req.body);

    const { rows } = await db.query(
      `INSERT INTO customers (name, phone, notes)
       VALUES ($1, $2, $3)
       RETURNING id, name, phone, notes, created_at`,
      [name, phone, notes],
    );

    res.status(201).location(`/api/customers/${rows[0].id}`).json({ customer: rows[0] });
  }),
);

module.exports = router;
