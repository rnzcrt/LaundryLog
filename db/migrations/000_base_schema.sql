-- Initial schema for a fresh LaundryLog database.
-- Keep this at the start of the migration sequence; later migrations evolve it.

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    phone TEXT NOT NULL UNIQUE CHECK (length(trim(phone)) > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
    load_type TEXT NOT NULL CHECK (load_type IN ('wash_fold', 'wash_only', 'dry_clean', 'press_only')),
    weight_kg NUMERIC(5, 2) CHECK (weight_kg > 0),
    item_count INTEGER CHECK (item_count > 0),
    price NUMERIC(8, 2) NOT NULL CHECK (price >= 0),
    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'washing', 'ready', 'picked_up')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT measure_matches_load_type CHECK (
        (load_type IN ('wash_fold', 'wash_only') AND weight_kg IS NOT NULL AND item_count IS NULL)
        OR (load_type IN ('dry_clean', 'press_only') AND item_count IS NOT NULL AND weight_kg IS NULL)
    )
);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_customer_idx ON orders (customer_id);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);

CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('received', 'washing', 'ready', 'picked_up')),
    note TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, changed_at);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
    amount NUMERIC(8, 2) NOT NULL CHECK (amount >= 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'gcash', 'card')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
