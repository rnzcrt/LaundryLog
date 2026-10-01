'use strict';

const path = require('path');
const express = require('express');

const db = require('./db');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const machinesRouter = require('./routes/machines');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const basicAuth = require('./middleware/basicAuth');
const productsRouter = require("./routes/products");
const reportsRouter = require('./routes/reports');
const addonsRouter = require('./routes/addons');

const app = express();

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
  });
  next();
});

// Liveness-only endpoint for hosting health checks; it reveals no database state.
app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));

app.use(basicAuth);
app.use(express.json({ limit: '32kb' }));

// Small request log, useful while building.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - started}ms)`);
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
app.use('/api/products', productsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/addons', addonsRouter);


app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
