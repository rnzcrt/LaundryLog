'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to seed the database.');
  process.exitCode = 1;
} else {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  (async () => {
    let client;
    try {
      client = await pool.connect();
      const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')
        .replace(/^\s*(BEGIN|COMMIT);\s*$/gim, '');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Sample data is present (safe to run again).');
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error(`Seed run failed: ${error.message}`);
      process.exitCode = 1;
    } finally {
      client?.release();
      await pool.end();
    }
  })();
}
