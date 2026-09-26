'use strict';

const express = require('express');
const db = require('../db');
const { asyncHandler } = require('../middleware/httpError');

const router = express.Router();

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

module.exports = router;