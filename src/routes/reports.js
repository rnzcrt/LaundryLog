"use strict";

const express = require("express");
const db = require("../db");
const { HttpError, asyncHandler } = require("../middleware/httpError");

const router = express.Router();

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;

    if (!isValidDate(from) || !isValidDate(to)) {
      throw new HttpError(400, "from and to must be valid dates in YYYY-MM-DD format");
    }

    if (from > to) {
      throw new HttpError(400, "from must be on or before to");
    }

    const dayCount =
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        86400000 +
      1;

    if (dayCount > 366) {
      throw new HttpError(400, "Date range cannot exceed 366 days");
    }

    const { rows } = await db.query(
      `WITH bounds AS (
         SELECT
           ($1::date::timestamp AT TIME ZONE 'Asia/Manila') AS start_at,
           (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Manila') AS end_at
       ),
       days AS (
         SELECT generate_series($1::date, $2::date, interval '1 day')::date AS day
       ),
       sales AS (
         SELECT
           (o.created_at AT TIME ZONE 'Asia/Manila')::date AS day,
           SUM(o.price) AS amount
         FROM orders o
         CROSS JOIN bounds b
         WHERE o.created_at >= b.start_at
           AND o.created_at < b.end_at
         GROUP BY 1
       ),
       collections AS (
         SELECT
           (p.paid_at AT TIME ZONE 'Asia/Manila')::date AS day,
           SUM(p.amount) AS amount
         FROM payments p
         CROSS JOIN bounds b
         WHERE p.paid_at >= b.start_at
           AND p.paid_at < b.end_at
         GROUP BY 1
       ),
       outstanding AS (
         SELECT COALESCE(SUM(
           GREATEST(o.price - COALESCE(p.paid_amount, 0), 0)
         ), 0) AS amount
         FROM orders o
         CROSS JOIN bounds b
         LEFT JOIN LATERAL (
           SELECT SUM(amount) AS paid_amount
           FROM payments
           WHERE order_id = o.id
         ) p ON true
         WHERE o.created_at >= b.start_at
           AND o.created_at < b.end_at
       )
       SELECT
         d.day::text AS date,
         COALESCE(s.amount, 0) AS sales,
         COALESCE(c.amount, 0) AS collections,
         o.amount AS outstanding
       FROM days d
       LEFT JOIN sales s ON s.day = d.day
       LEFT JOIN collections c ON c.day = d.day
       CROSS JOIN outstanding o
       ORDER BY d.day`,
      [from, to],
    );

    const sales = rows.reduce((sum, row) => sum + Number(row.sales), 0);
    const collections = rows.reduce(
      (sum, row) => sum + Number(row.collections),
      0,
    );

    res.json({
      from,
      to,
      sales,
      collections,
      outstanding: Number(rows[0]?.outstanding || 0),
      daily: rows.map((row) => ({
        date: row.date,
        sales: Number(row.sales),
        collections: Number(row.collections),
      })),
    });
  }),
);

module.exports = router;
