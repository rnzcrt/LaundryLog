'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REQUIRED_COLUMNS,
  listMigrations,
  migrationSql,
  runMigrations,
} = require('../db/migrate');

function makeDirectory(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laundrylog-migrations-'));
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, name), contents);
  }
  return directory;
}

function fakeClient({ preexistingTables = false, failOnSql = null } = {}) {
  const calls = [];
  const history = [];
  let historyTable = false;
  const client = {
    calls,
    history,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes("to_regclass('public.laundrylog_migration_history')")) {
        return { rows: [{ table_name: historyTable ? 'laundrylog_migration_history' : null }] };
      }
      if (sql.includes('has_app_tables')) {
        return { rows: [{ has_app_tables: preexistingTables }] };
      }
      if (sql.includes('information_schema.columns')) {
        return { rows: Object.entries(REQUIRED_COLUMNS).flatMap(([table_name, columns]) =>
          columns.map((column_name) => ({ table_name, column_name })),
        ) };
      }
      if (sql.includes('pg_get_constraintdef')) {
        return { rows: [
          { table_name: 'orders', conname: 'orders_load_type_check', definition: "CHECK ('wash_fold'::text, 'wash_only'::text, 'dry_only'::text, 'fold_only'::text)" },
          { table_name: 'orders', conname: 'orders_status_check', definition: "CHECK ('new'::text, 'waiting'::text, 'washing'::text, 'drying'::text, 'folding'::text, 'ready'::text, 'completed'::text)" },
          { table_name: 'order_status_history', conname: 'order_status_history_status_check', definition: "CHECK ('new'::text, 'waiting'::text, 'washing'::text, 'drying'::text, 'folding'::text, 'ready'::text, 'completed'::text)" },
          { table_name: 'product_movements', conname: 'product_movements_movement_type_check', definition: "CHECK ('stock_in'::text, 'usage'::text, 'adjustment'::text)" },
        ] };
      }
      if (sql.includes('has_single_payment_constraint')) {
        return { rows: [{ has_single_payment_constraint: false }] };
      }
      if (sql.startsWith('CREATE TABLE IF NOT EXISTS laundrylog_migration_history')) {
        historyTable = true;
        return { rows: [] };
      }
      if (sql.startsWith('SELECT version, name, checksum')) return { rows: [...history] };
      if (sql.startsWith('INSERT INTO laundrylog_migration_history')) {
        history.push({ version: params[0], name: params[1], checksum: params[2] });
        return { rows: [] };
      }
      if (failOnSql && sql.includes(failOnSql)) throw new Error('simulated SQL failure');
      return { rows: [] };
    },
  };
  return client;
}

test('migration files are applied in numerical order', () => {
  const directory = makeDirectory({
    '010_later.sql': 'SELECT 10;',
    '002_middle.sql': 'SELECT 2;',
    '001_first.sql': 'SELECT 1;',
  });
  assert.deepEqual(listMigrations(directory).map((item) => item.name), [
    '001_first.sql', '002_middle.sql', '010_later.sql',
  ]);
});

test('duplicate numeric migration versions are rejected', () => {
  const directory = makeDirectory({
    '001_first.sql': 'SELECT 1;',
    '01_also_first.sql': 'SELECT 1;',
  });
  assert.throws(() => listMigrations(directory), /Duplicate migration version 1/);
});

test('migration transaction wrappers are removed so history shares the runner transaction', () => {
  assert.equal(migrationSql('\nBEGIN;\nSELECT 1;\nCOMMIT;\n'), '\nSELECT 1;\n');
});

test('migration history prevents an already-applied migration from running twice', async () => {
  const directory = makeDirectory({ '001_first.sql': 'SELECT migration_one;' });
  const client = fakeClient();

  const first = await runMigrations({ client, directory, logger: { log() {} } });
  const second = await runMigrations({ client, directory, logger: { log() {} } });

  assert.deepEqual(first.applied, ['001_first.sql']);
  assert.deepEqual(second.applied, []);
  assert.equal(client.calls.filter((call) => call.sql.includes('SELECT migration_one')).length, 1);
  assert.equal(client.history.length, 1);
  assert.equal(client.history[0].name, '001_first.sql');
  assert.match(client.history[0].checksum, /^[a-f0-9]{64}$/);
});

test('migration history versions missing from the checkout are rejected', async () => {
  const directory = makeDirectory({ '001_first.sql': 'SELECT migration_one;' });
  const client = fakeClient();
  await runMigrations({ client, directory, logger: { log() {} } });

  await assert.rejects(
    runMigrations({ client, directory: makeDirectory({}), logger: { log() {} } }),
    /versions missing from this checkout: 1/,
  );
});

test('failed migration rolls back and does not add a history row', async () => {
  const directory = makeDirectory({ '001_broken.sql': 'SELECT break_migration;' });
  const client = fakeClient({ failOnSql: 'break_migration' });

  await assert.rejects(
    runMigrations({ client, directory, logger: { log() {} } }),
    /Migration 001_broken.sql failed: simulated SQL failure/,
  );
  assert.deepEqual(client.history, []);
  assert.ok(client.calls.some((call) => call.sql === 'ROLLBACK'));
});

test('existing untracked LaundryLog databases are refused without applying migrations', async () => {
  const directory = makeDirectory({ '001_first.sql': 'SELECT migration_one;' });
  const client = fakeClient({ preexistingTables: true });

  await assert.rejects(
    runMigrations({ client, directory, logger: { log() {} } }),
    /contains LaundryLog tables but has no migration history/,
  );
  assert.equal(client.calls.some((call) => call.sql.includes('SELECT migration_one')), false);
});

test('explicit baseline records migration history only for a verified current schema', async () => {
  const directory = makeDirectory({
    '001_first.sql': 'SELECT migration_one;',
    '002_second.sql': 'SELECT migration_two;',
  });
  const client = fakeClient({ preexistingTables: true });

  await runMigrations({
    client,
    directory,
    baselineExisting: true,
    logger: { log() {} },
  });

  assert.deepEqual(client.history.map((row) => row.name), ['001_first.sql', '002_second.sql']);
  assert.equal(client.calls.some((call) => call.sql.includes('SELECT migration_one')), false);
  assert.ok(client.calls.some((call) => call.sql === 'COMMIT'));
});

test('baseline for an existing version 007 schema applies new migrations additively', async () => {
  const directory = makeDirectory({
    '001_first.sql': 'SELECT migration_one;',
    '007_split_payments.sql': 'SELECT migration_seven;',
    '008_customer_updated_at.sql': 'SELECT add_customer_updated_at;',
    '009_service_addons.sql': 'SELECT add_service_addons;',
    '010_order_due_completion.sql': 'SELECT add_order_dates;',
  });
  const client = fakeClient({ preexistingTables: true });

  await runMigrations({
    client,
    directory,
    baselineExisting: true,
    logger: { log() {} },
  });

  assert.deepEqual(client.history.map((row) => row.version), [1, 7, 8, 9, 10]);
  assert.equal(client.calls.some((call) => call.sql.includes('SELECT migration_one')), false);
  assert.equal(client.calls.some((call) => call.sql.includes('SELECT migration_seven')), false);
  assert.equal(client.calls.filter((call) => call.sql.includes('SELECT add_customer_updated_at')).length, 1);
  assert.equal(client.calls.filter((call) => call.sql.includes('SELECT add_service_addons')).length, 1);
  assert.equal(client.calls.filter((call) => call.sql.includes('SELECT add_order_dates')).length, 1);
});

test('seed data targets current migrated tables and workflow values', () => {
  const seed = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');
  const migrations = fs.readdirSync(path.join(__dirname, '..', 'db', 'migrations'));
  assert.ok(migrations.includes('007_allow_split_payments.sql'));
  assert.match(seed, /INSERT INTO machine_loads/);
  assert.match(seed, /INSERT INTO products/);
  assert.match(seed, /INSERT INTO product_movements/);
  assert.match(seed, /'completed'/);
  assert.doesNotMatch(seed, /'received'|'picked_up'/);
  assert.match(seed, /NOT EXISTS/);
});
