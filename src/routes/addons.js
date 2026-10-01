'use strict';

const express = require('express');
const db = require('../db');
const { HttpError, asyncHandler } = require('../middleware/httpError');
const { parseId } = require('../validators/orderValidators');

const router = express.Router();

function validateAddon(body = {}, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Validation failed', [
      { field: 'body', message: 'Request body must be a JSON object' },
    ]);
  }
  const errors = [];
  if (!partial || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.push({ field: 'name', message: 'Add-on name is required' });
    } else if (body.name.trim().length > 120) {
      errors.push({ field: 'name', message: 'Add-on name must be 120 characters or fewer' });
    }
  }
  if (!partial || Object.hasOwn(body, 'price')) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-7) {
      errors.push({ field: 'price', message: 'Price must be a non-negative amount with at most two decimals' });
    }
  }
  if (partial && Object.hasOwn(body, 'is_active') && typeof body.is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'is_active must be true or false' });
  }
  if (partial && !['name', 'price', 'is_active'].some((field) => Object.hasOwn(body, field))) {
    errors.push({ field: 'body', message: 'At least one add-on field must be provided' });
  }
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return {
    name: Object.hasOwn(body, 'name') ? body.name.trim() : undefined,
    price: Object.hasOwn(body, 'price') ? Math.round(Number(body.price) * 100) / 100 : undefined,
    isActive: body.is_active,
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const includeInactive = req.query.include_inactive === 'true';
  if (req.query.include_inactive !== undefined && !['true', 'false'].includes(req.query.include_inactive)) {
    throw new HttpError(400, 'include_inactive must be true or false');
  }
  const { rows } = await db.query(
    `SELECT id, name, price, is_active, created_at, updated_at
     FROM service_addons
     ${includeInactive ? '' : 'WHERE is_active = true'}
     ORDER BY name`,
  );
  res.json({ count: rows.length, addons: rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  const addon = validateAddon(req.body);
  const { rows } = await db.query(
    `INSERT INTO service_addons (name, price)
     VALUES ($1, $2)
     RETURNING id, name, price, is_active, created_at, updated_at`,
    [addon.name, addon.price],
  );
  res.status(201).location(`/api/addons/${rows[0].id}`).json({ addon: rows[0] });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'add-on id');
  const addon = validateAddon(req.body, true);
  const { rows } = await db.query(
    `UPDATE service_addons
     SET name = CASE WHEN $2 THEN $3 ELSE name END,
         price = CASE WHEN $4 THEN $5 ELSE price END,
         is_active = CASE WHEN $6 THEN $7 ELSE is_active END,
         updated_at = now()
     WHERE id = $1
     RETURNING id, name, price, is_active, created_at, updated_at`,
    [id, addon.name !== undefined, addon.name ?? null,
      addon.price !== undefined, addon.price ?? null,
      Object.hasOwn(req.body, 'is_active'), addon.isActive ?? null],
  );
  if (rows.length === 0) throw new HttpError(404, `No add-on with id ${id}`);
  res.json({ addon: rows[0] });
}));

module.exports = router;
