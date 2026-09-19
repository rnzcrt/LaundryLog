'use strict';

require('dotenv').config();

const app = require('./app');
const { pool } = require('./db');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`LaundryLog is running at http://localhost:${port}`);
});

// Close the database pool cleanly on Ctrl+C.
function shutdown(signal) {
  console.log(`\n${signal} received, shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
