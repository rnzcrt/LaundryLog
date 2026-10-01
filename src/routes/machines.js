'use strict';

const express = require('express');
const db = require('../db');
const { HttpError, asyncHandler } = require('../middleware/httpError');
const { parseId } = require('../validators/orderValidators');

const router = express.Router();

const MACHINE_TYPES = ['regular', 'titan'];
const MACHINE_KINDS = ['washer', 'dryer'];

function validateMachine(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Validation failed', [
      { field: 'body', message: 'Request body must be a JSON object' },
    ]);
  }

  const errors = [];
  const fields = ['name', 'machine_type', 'machine_kind', 'capacity_kg', 'status'];
  if (partial && !fields.some((field) => Object.hasOwn(body, field))) {
    errors.push({ field: 'body', message: 'At least one machine field must be provided' });
  }

  if (!partial || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.push({ field: 'name', message: 'Machine name is required' });
    } else if (body.name.trim().length > 120) {
      errors.push({ field: 'name', message: 'Machine name must be 120 characters or fewer' });
    }
  }
  if (!partial || Object.hasOwn(body, 'machine_type')) {
    if (!MACHINE_TYPES.includes(body.machine_type)) {
      errors.push({ field: 'machine_type', message: 'Machine type must be regular or titan' });
    }
  }
  if (!partial || Object.hasOwn(body, 'machine_kind')) {
    if (!MACHINE_KINDS.includes(body.machine_kind)) {
      errors.push({ field: 'machine_kind', message: 'Machine kind must be washer or dryer' });
    }
  }
  if (!partial || Object.hasOwn(body, 'capacity_kg')) {
    const capacity = Number(body.capacity_kg);
    if (!Number.isFinite(capacity) || capacity < 0.1 || capacity > 100 ||
        Math.abs(capacity * 100 - Math.round(capacity * 100)) > 1e-7) {
      errors.push({ field: 'capacity_kg', message: 'Capacity must be 0.1–100 kg with at most two decimal places' });
    }
  }
  if (partial && Object.hasOwn(body, 'status') &&
      !['available', 'maintenance'].includes(body.status)) {
    errors.push({ field: 'status', message: 'Status must be available or maintenance; running is load-controlled' });
  }

  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return Object.fromEntries(fields
    .filter((field) => Object.hasOwn(body, field))
    .map((field) => [field, body[field]]));
}

/**
 * GET /api/machines
 * Returns all laundry machines and their current status.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(
      `SELECT id,
              name,
              machine_type,
              machine_kind,
              capacity_kg,
              status,
              created_at
       FROM machines
       ORDER BY machine_kind, machine_type, id`,
    );

    res.json({ count: rows.length, machines: rows });
  }),
);

router.post('/', asyncHandler(async (req, res) => {
  const machine = validateMachine(req.body);
  const { rows } = await db.query(
    `INSERT INTO machines (name, machine_type, machine_kind, capacity_kg)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, machine_type, machine_kind, capacity_kg, status, created_at`,
    [machine.name.trim(), machine.machine_type, machine.machine_kind, Number(machine.capacity_kg)],
  );
  res.status(201).location(`/api/machines/${rows[0].id}`).json({ machine: rows[0] });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'machine id');
  const machine = validateMachine(req.body, true);
  const changesMachineConfiguration = ['machine_type', 'machine_kind', 'capacity_kg', 'status']
    .some((field) => Object.hasOwn(machine, field));

  const result = await db.withTransaction(async (client) => {
    const current = await client.query('SELECT id FROM machines WHERE id = $1 FOR UPDATE', [id]);
    if (current.rowCount === 0) throw new HttpError(404, `No machine with id ${id}`);

    if (changesMachineConfiguration) {
      const activeLoads = await client.query(
        `SELECT 1 FROM machine_loads
         WHERE machine_id = $1 AND status IN ('queued', 'running')
         LIMIT 1`,
        [id],
      );
      if (activeLoads.rowCount) {
        throw new HttpError(409, 'Finish or unassign active loads before changing machine capacity, type, kind, or availability');
      }
    }

    const { rows } = await client.query(
      `UPDATE machines
       SET name = CASE WHEN $2 THEN $3 ELSE name END,
           machine_type = CASE WHEN $4 THEN $5 ELSE machine_type END,
           machine_kind = CASE WHEN $6 THEN $7 ELSE machine_kind END,
           capacity_kg = CASE WHEN $8 THEN $9 ELSE capacity_kg END,
           status = CASE WHEN $10 THEN $11 ELSE status END
       WHERE id = $1
       RETURNING id, name, machine_type, machine_kind, capacity_kg, status, created_at`,
      [id,
        Object.hasOwn(machine, 'name'), machine.name?.trim() ?? null,
        Object.hasOwn(machine, 'machine_type'), machine.machine_type ?? null,
        Object.hasOwn(machine, 'machine_kind'), machine.machine_kind ?? null,
        Object.hasOwn(machine, 'capacity_kg'), machine.capacity_kg === undefined ? null : Number(machine.capacity_kg),
        Object.hasOwn(machine, 'status'), machine.status ?? null],
    );
    return rows[0];
  });

  res.json({ machine: result });
}));

module.exports = router;
