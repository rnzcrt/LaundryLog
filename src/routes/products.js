"use strict";

const express = require("express");
const db = require("../db");
const { HttpError, asyncHandler } = require("../middleware/httpError");
const { parseId } = require("../validators/orderValidators");

const router = express.Router();

const PRODUCT_SELECT = `
  SELECT id,
         name,
         unit,
         stock_quantity,
         low_stock_threshold,
         (stock_quantity <= low_stock_threshold) AS low_stock,
         created_at,
         updated_at
  FROM products
`;

// GET /api/products
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(
      `${PRODUCT_SELECT} ORDER BY name`,
    );

    res.json({ count: rows.length, products: rows });
  }),
);

// POST /api/products
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, unit, stock_quantity = 0, low_stock_threshold = 5 } =
      req.body || {};

    const errors = [];

    if (typeof name !== "string" || !name.trim()) {
      errors.push({ field: "name", message: "Product name is required" });
    }

    if (typeof unit !== "string" || !unit.trim()) {
      errors.push({ field: "unit", message: "Unit is required" });
    }

    const stock = Number(stock_quantity);
    const threshold = Number(low_stock_threshold);

    if (!Number.isFinite(stock) || stock < 0) {
      errors.push({
        field: "stock_quantity",
        message: "Stock must be a non-negative number",
      });
    }

    if (!Number.isFinite(threshold) || threshold < 0) {
      errors.push({
        field: "low_stock_threshold",
        message: "Low-stock threshold must be a non-negative number",
      });
    }

    if (errors.length) {
      throw new HttpError(400, "Validation failed", errors);
    }

    try {
      const { rows } = await db.query(
        `INSERT INTO products (name, unit, stock_quantity, low_stock_threshold)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, unit, stock_quantity, low_stock_threshold,
                   (stock_quantity <= low_stock_threshold) AS low_stock,
                   created_at, updated_at`,
        [name.trim(), unit.trim(), stock, threshold],
      );

      res.status(201).location(`/api/products/${rows[0].id}`).json({
        product: rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        throw new HttpError(409, "A product with this name already exists");
      }
      throw error;
    }
  }),
);

// PATCH /api/products/:id
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "product id");
    const { name, unit, stock_quantity, low_stock_threshold } =
      req.body || {};

    const currentResult = await db.query(
      "SELECT id, name, unit, stock_quantity, low_stock_threshold FROM products WHERE id = $1",
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new HttpError(404, `No product with id ${id}`);
    }

    const current = currentResult.rows[0];
    const next = {
      name: name === undefined ? current.name : name,
      unit: unit === undefined ? current.unit : unit,
      stock_quantity:
        stock_quantity === undefined
          ? Number(current.stock_quantity)
          : Number(stock_quantity),
      low_stock_threshold:
        low_stock_threshold === undefined
          ? Number(current.low_stock_threshold)
          : Number(low_stock_threshold),
    };

    const errors = [];

    if (typeof next.name !== "string" || !next.name.trim()) {
      errors.push({ field: "name", message: "Product name is required" });
    }

    if (typeof next.unit !== "string" || !next.unit.trim()) {
      errors.push({ field: "unit", message: "Unit is required" });
    }

    if (
      !Number.isFinite(next.stock_quantity) ||
      next.stock_quantity < 0
    ) {
      errors.push({
        field: "stock_quantity",
        message: "Stock must be a non-negative number",
      });
    }

    if (
      !Number.isFinite(next.low_stock_threshold) ||
      next.low_stock_threshold < 0
    ) {
      errors.push({
        field: "low_stock_threshold",
        message: "Low-stock threshold must be a non-negative number",
      });
    }

    if (errors.length) {
      throw new HttpError(400, "Validation failed", errors);
    }

    try {
      const { rows } = await db.query(
        `UPDATE products
         SET name = $1,
             unit = $2,
             stock_quantity = $3,
             low_stock_threshold = $4,
             updated_at = now()
         WHERE id = $5
         RETURNING id, name, unit, stock_quantity, low_stock_threshold,
                   (stock_quantity <= low_stock_threshold) AS low_stock,
                   created_at, updated_at`,
        [
          next.name.trim(),
          next.unit.trim(),
          next.stock_quantity,
          next.low_stock_threshold,
          id,
        ],
      );

      res.json({ product: rows[0] });
    } catch (error) {
      if (error.code === "23505") {
        throw new HttpError(409, "A product with this name already exists");
      }
      throw error;
    }
  }),
);

module.exports = router;
