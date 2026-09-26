'use strict';

const path = require('path');
const express = require('express');

const db = require('./db');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const machinesRouter = require('./routes/machines');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const basicAuth = require('./middleware/basicAuth');

const app = express();

app.use(express.json());

app.use(basicAuth);

// Small request log, useful while building.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

// The staff-facing page.
app.use(express.static(path.join(__dirname, '..', 'public')));

/** Confirms the server is up and that it can actually reach Postgres. */
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({
      status: 'degraded',
      database: 'unreachable',
    });
  }
});

app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/machines', machinesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
