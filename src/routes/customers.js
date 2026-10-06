"use strict";

const express = require("express");
const db = require("../db");
const { HttpError, asyncHandler } = require("../middleware/httpError");
const {
  parseId,
  validateNewCustomer,
  validateCustomerUpdate,
} = require("../validators/orderValidators");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const params = [];
    let where = "";

    if (q && String(q).trim() !== "") {
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
              COUNT(o.id) FILTER (WHERE o.status <> 'completed')::int AS open_order_count       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       ${where}
       GROUP BY c.id
       ORDER BY c.name`,
      params,
    );

    res.json({ count: rows.length, customers: rows });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "customer id");

    const customer = await db.query(
      "SELECT id, name, phone, notes, created_at, updated_at FROM customers WHERE id = $1",
      [id],
    );
    if (customer.rows.length === 0) {
      throw new HttpError(404, `No customer with id ${id}`);
    }

    const orders = await db.query(
      `SELECT o.id, o.load_type, o.weight_kg, o.item_count, o.price,
              o.status, o.created_at,
              COALESCE(pay.paid_amount, 0) AS paid_amount,
              GREATEST(o.price - COALESCE(pay.paid_amount, 0), 0) AS outstanding_amount
       FROM orders o
       LEFT JOIN LATERAL (
         SELECT SUM(amount) AS paid_amount FROM payments WHERE order_id = o.id
       ) pay ON true
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [id],
    );

    const summary = orders.rows.reduce((total, order) => ({
      spending: total.spending + Number(order.price),
      paid: total.paid + Number(order.paid_amount),
      outstanding: total.outstanding + Number(order.outstanding_amount),
    }), { spending: 0, paid: 0, outstanding: 0 });

    res.json({ customer: customer.rows[0], orders: orders.rows, summary });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, phone, notes } = validateNewCustomer(req.body);

    const { rows } = await db.query(
      `INSERT INTO customers (name, phone, notes)
       VALUES ($1, $2, $3)
       RETURNING id, name, phone, notes, created_at, updated_at`,
      [name, phone, notes],
    );

    res
      .status(201)
      .location(`/api/customers/${rows[0].id}`)
      .json({ customer: rows[0] });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'customer id');
    const updates = validateCustomerUpdate(req.body);
    const { rows } = await db.query(
      `UPDATE customers
       SET name = CASE WHEN $2 THEN $3 ELSE name END,
           phone = CASE WHEN $4 THEN $5 ELSE phone END,
           notes = CASE WHEN $6 THEN $7 ELSE notes END,
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, phone, notes, created_at, updated_at`,
      [
        id,
        Object.hasOwn(updates, 'name'), updates.name ?? null,
        Object.hasOwn(updates, 'phone'), updates.phone ?? null,
        Object.hasOwn(updates, 'notes'), updates.notes ?? null,
      ],
    );

    if (rows.length === 0) {
      throw new HttpError(404, `No customer with id ${id}`);
    }
    res.json({ customer: rows[0] });
  }),
);

module.exports = router;
