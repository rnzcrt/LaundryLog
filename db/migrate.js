'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HISTORY_TABLE = 'laundrylog_migration_history';
const LOCK_ID = 1279545932;

const REQUIRED_COLUMNS = {
  customers: ['id', 'name', 'phone', 'notes', 'created_at'],
  orders: ['id', 'customer_id', 'load_type', 'weight_kg', 'item_count', 'price', 'status', 'note', 'created_at', 'updated_at'],
  order_status_history: ['id', 'order_id', 'status', 'note', 'changed_at'],
  payments: ['id', 'order_id', 'amount', 'method', 'paid_at'],
  machines: ['id', 'name', 'machine_type', 'machine_kind', 'capacity_kg', 'status', 'created_at'],
  machine_loads: ['id', 'order_id', 'machine_id', 'load_number', 'weight_kg', 'status', 'started_at', 'completed_at', 'notes', 'created_at'],
  products: ['id', 'name', 'unit', 'stock_quantity', 'low_stock_threshold', 'created_at', 'updated_at'],
  product_movements: ['id', 'product_id', 'movement_type', 'quantity', 'notes', 'created_at'],
};

function listMigrations(directory) {
  const migrations = fs.readdirSync(directory)
    .filter((name) => /^\d+_[a-z0-9_]+\.sql$/i.test(name))
    .map((name) => ({
      name,
      version: Number(name.match(/^\d+/)[0]),
      file: path.join(directory, name),
    }))
    .sort((a, b) => a.version - b.version || a.name.localeCompare(b.name));

  for (let i = 1; i < migrations.length; i += 1) {
    if (migrations[i - 1].version === migrations[i].version) {
      throw new Error(`Duplicate migration version ${migrations[i].version}`);
    }
  }
  return migrations;
}

function migrationSql(sql) {
  return sql.replace(/^\s*(BEGIN|COMMIT);\s*$/gim, '');
}

async function runMigrations({
  client,
  directory,
  logger = console,
  baselineExisting: allowBaseline = false,
}) {
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
  try {
    const historyExists = await client.query(
      "SELECT to_regclass('public.laundrylog_migration_history') AS table_name",
    );
    const hasHistoryTable = Boolean(historyExists.rows[0].table_name);

    let baselineExisting = false;
    let baselineThroughVersion = Number.POSITIVE_INFINITY;
    if (!hasHistoryTable) {
      const existing = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = ANY($1::text[])
         ) AS has_app_tables`,
        [[...Object.keys(REQUIRED_COLUMNS), 'service_addons', 'order_addons']],
      );
      if (existing.rows[0].has_app_tables) {
        if (allowBaseline) {
          baselineExisting = true;
          const schemaState = await assertCurrentSchema(client);
          if (!schemaState.customerUpdatedAt) {
            baselineThroughVersion = 7;
          } else if (!schemaState.serviceAddons) {
            baselineThroughVersion = 8;
          } else if (!schemaState.orderDates) {
            baselineThroughVersion = 9;
          }
        } else {
          throw new Error(
            'Database contains LaundryLog tables but has no migration history. No migrations were applied. Back up and inspect the schema; use `npm run migrate -- --baseline` only for a supported existing LaundryLog schema state.',
          );
        }
      }
    }

    await client.query(`CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const migrations = listMigrations(directory);
    if (baselineExisting) {
      await client.query('BEGIN');
      try {
        const baselineMigrations = migrations.filter(
          (migration) => migration.version <= baselineThroughVersion,
        );
        for (const migration of baselineMigrations) {
          const sql = fs.readFileSync(migration.file, 'utf8');
          const checksum = crypto.createHash('sha256').update(sql).digest('hex');
          await client.query(
            `INSERT INTO ${HISTORY_TABLE} (version, name, checksum) VALUES ($1, $2, $3)`,
            [migration.version, migration.name, checksum],
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Could not record verified migration baseline: ${error.message}`, {
          cause: error,
        });
      }
      logger.log(`Recorded verified baseline for migrations through ${baselineThroughVersion === Number.POSITIVE_INFINITY ? 'current' : baselineThroughVersion}`);
    }

    const history = await client.query(
      `SELECT version, name, checksum FROM ${HISTORY_TABLE} ORDER BY version`,
    );
    const applied = new Map(history.rows.map((row) => [Number(row.version), row]));
    const localVersions = new Set(migrations.map((migration) => migration.version));
    const unknownVersions = history.rows
      .filter((row) => !localVersions.has(Number(row.version)))
      .map((row) => row.version);
    if (unknownVersions.length) {
      throw new Error(`Migration history contains versions missing from this checkout: ${unknownVersions.join(', ')}`);
    }

    for (const migration of migrations) {
      const sql = fs.readFileSync(migration.file, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const previous = applied.get(migration.version);

      if (previous) {
        if (previous.name !== migration.name || previous.checksum !== checksum) {
          throw new Error(
            `Applied migration ${migration.version} (${previous.name}) differs from ${migration.name}. Applied migrations must not be edited.`,
          );
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migrationSql(sql));
        await client.query(
          `INSERT INTO ${HISTORY_TABLE} (version, name, checksum) VALUES ($1, $2, $3)`,
          [migration.version, migration.name, checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.name} failed: ${error.message}`, {
          cause: error,
        });
      }

      applied.set(migration.version, {
        version: migration.version,
        name: migration.name,
        checksum,
      });
      logger.log(`Applied ${migration.name}`);
    }

    return { applied: migrations.filter((migration) => !history.rows.some(
      (row) => Number(row.version) === migration.version,
    )).map((migration) => migration.name) };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
  }
}

async function assertCurrentSchema(client) {
  const tableNames = [
    ...Object.keys(REQUIRED_COLUMNS),
    'service_addons',
    'order_addons',
  ];
  const columns = await client.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [tableNames],
  );
  const found = new Map();
  for (const row of columns.rows) {
    if (!found.has(row.table_name)) found.set(row.table_name, new Set());
    found.get(row.table_name).add(row.column_name);
  }

  const missing = [];
  for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
    for (const column of required) {
      if (!found.get(table)?.has(column)) missing.push(`${table}.${column}`);
    }
  }
  if (missing.length) {
    throw new Error(`Cannot baseline an incomplete schema; missing: ${missing.join(', ')}`);
  }
  const customerUpdatedAt = found.get('customers')?.has('updated_at') || false;
  const dueDate = found.get('orders')?.has('due_date') || false;
  const completedAt = found.get('orders')?.has('completed_at') || false;
  if (dueDate !== completedAt) {
    throw new Error('Cannot baseline: order date columns are only partially present');
  }
  const orderDates = dueDate && completedAt;
  const addonTableNames = ['service_addons', 'order_addons'];
  const addonTablesPresent = addonTableNames.map((table) => found.has(table));
  const hasAnyAddonTable = addonTablesPresent.some(Boolean);
  const hasServiceAddons = addonTablesPresent.every(Boolean);
  const addonRequiredColumns = {
    service_addons: ['id', 'name', 'price', 'is_active', 'created_at', 'updated_at'],
    order_addons: ['id', 'order_id', 'addon_id', 'name_snapshot', 'unit_price_snapshot', 'quantity', 'line_total', 'created_at'],
  };
  if (hasAnyAddonTable && !hasServiceAddons) {
    throw new Error('Cannot baseline: add-on schema is only partially present');
  }
  if (hasServiceAddons) {
    for (const [table, required] of Object.entries(addonRequiredColumns)) {
      for (const column of required) {
        if (!found.get(table)?.has(column)) {
          throw new Error(`Cannot baseline an incomplete schema; missing: ${table}.${column}`);
        }
      }
    }
  }

  const constraints = await client.query(
    `SELECT c.conrelid::regclass::text AS table_name,
            c.conname, pg_get_constraintdef(c.oid) AS definition
     FROM pg_constraint c
     WHERE c.connamespace = 'public'::regnamespace`,
  );
  const constraint = (table, name) =>
    constraints.rows.find((row) => row.table_name === table && row.conname === name)?.definition || '';
  const requiredDefinitions = [
    ['orders', 'orders_load_type_check', ["'wash_fold'", "'wash_only'", "'dry_only'", "'fold_only'"]],
    ['orders', 'orders_status_check', ["'new'", "'waiting'", "'washing'", "'drying'", "'folding'", "'ready'", "'completed'"]],
    ['order_status_history', 'order_status_history_status_check', ["'new'", "'waiting'", "'washing'", "'drying'", "'folding'", "'ready'", "'completed'"]],
    ['product_movements', 'product_movements_movement_type_check', ["'stock_in'", "'usage'", "'adjustment'"]],
  ];
  for (const [table, name, markers] of requiredDefinitions) {
    const definition = constraint(table, name);
    if (markers.some((marker) => !definition.includes(marker))) {
      throw new Error(`Cannot baseline: ${table}.${name} does not match the current schema`);
    }
  }

  const paymentConstraint = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_index i
       WHERE i.indrelid = 'public.payments'::regclass
         AND i.indisunique
         AND (SELECT count(*) FROM unnest(i.indkey::smallint[]) AS key(attnum) WHERE key.attnum > 0) = 1
         AND (SELECT a.attname
              FROM unnest(i.indkey::smallint[]) AS key(attnum)
              JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = key.attnum
              WHERE key.attnum > 0) = 'order_id'
     ) AS has_single_payment_constraint`,
  );
  if (paymentConstraint.rows[0].has_single_payment_constraint) {
    throw new Error('Cannot baseline: payments still restrict each order to one payment');
  }
  return { customerUpdatedAt, serviceAddons: hasServiceAddons, orderDates };
}

module.exports = {
  HISTORY_TABLE,
  REQUIRED_COLUMNS,
  assertCurrentSchema,
  listMigrations,
  migrationSql,
  runMigrations,
};
