'use strict';

require('dotenv').config();

const path = require('path');
const { Pool } = require('pg');
const { runMigrations } = require('./migrate');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exitCode = 1;
} else {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  (async () => {
    try {
      const client = await pool.connect();
      try {
        await runMigrations({
          client,
          directory: path.join(__dirname, 'migrations'),
          baselineExisting: process.argv.includes('--baseline'),
        });
        console.log('Database migrations are up to date.');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Migration run failed: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  })();
}
