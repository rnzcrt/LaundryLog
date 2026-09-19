-- LaundryLog schema
-- Run with: psql "$DATABASE_URL" -f db/schema.sql
-- Dropping first keeps this re-runnable while the project is still changing shape.

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

-- Repeat customers, so staff do not retype a name and phone every visit.
CREATE TABLE customers (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
    phone       TEXT NOT NULL UNIQUE CHECK (length(trim(phone)) > 0),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per drop-off.
-- Weight-based loads (wash_fold, wash_only) carry weight_kg;
-- piece-based loads (dry_clean, press_only) carry item_count.
-- The CHECK below enforces that rule in the database, not only in the API.
CREATE TABLE orders (
    id           SERIAL PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
    load_type    TEXT NOT NULL CHECK (load_type IN ('wash_fold', 'wash_only', 'dry_clean', 'press_only')),
    weight_kg    NUMERIC(5, 2) CHECK (weight_kg > 0),
    item_count   INTEGER CHECK (item_count > 0),
    price        NUMERIC(8, 2) NOT NULL CHECK (price >= 0),
    status       TEXT NOT NULL DEFAULT 'received'
                 CHECK (status IN ('received', 'washing', 'ready', 'picked_up')),
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT measure_matches_load_type CHECK (
        (load_type IN ('wash_fold', 'wash_only') AND weight_kg IS NOT NULL AND item_count IS NULL)
        OR
        (load_type IN ('dry_clean', 'press_only') AND item_count IS NOT NULL AND weight_kg IS NULL)
    )
);

CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_customer_idx ON orders (customer_id);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);

-- Every status change is appended here, so an order has a timeline
-- instead of just a current value.
CREATE TABLE order_status_history (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status      TEXT NOT NULL CHECK (status IN ('received', 'washing', 'ready', 'picked_up')),
    note        TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, changed_at);

-- One payment per order for now; split payments are out of scope for v1.
CREATE TABLE payments (
    id        SERIAL PRIMARY KEY,
    order_id  INTEGER NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
    amount    NUMERIC(8, 2) NOT NULL CHECK (amount >= 0),
    method    TEXT NOT NULL CHECK (method IN ('cash', 'gcash', 'card')),
    paid_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
