-- Add laundry machines without recreating or deleting existing data.

CREATE TABLE IF NOT EXISTS machines (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    machine_type TEXT NOT NULL CHECK (machine_type IN ('regular', 'titan')),
    machine_kind TEXT NOT NULL CHECK (machine_kind IN ('washer', 'dryer')),
    capacity_kg NUMERIC(5, 2) NOT NULL CHECK (capacity_kg > 0),
    status      TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'running', 'maintenance')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS machines_type_idx
    ON machines (machine_type);

CREATE INDEX IF NOT EXISTS machines_kind_idx
    ON machines (machine_kind);

CREATE INDEX IF NOT EXISTS machines_status_idx
    ON machines (status);

-- Track each physical laundry load assigned to a machine.

CREATE TABLE IF NOT EXISTS machine_loads (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    machine_id  INTEGER NOT NULL REFERENCES machines (id) ON DELETE RESTRICT,
    load_number INTEGER NOT NULL CHECK (load_number > 0),
    weight_kg   NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0),
    status      TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'running', 'completed')),
    started_at  TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (order_id, load_number)
);

CREATE INDEX IF NOT EXISTS machine_loads_order_idx
    ON machine_loads (order_id);

CREATE INDEX IF NOT EXISTS machine_loads_machine_idx
    ON machine_loads (machine_id);

CREATE INDEX IF NOT EXISTS machine_loads_status_idx
    ON machine_loads (status);

-- Required LaundryLog machine inventory.
INSERT INTO machines (name, machine_type, machine_kind, capacity_kg)
VALUES
    ('Regular Washer 1', 'regular', 'washer', 8),
    ('Regular Washer 2', 'regular', 'washer', 8),
    ('Regular Washer 3', 'regular', 'washer', 8),
    ('Regular Dryer 1', 'regular', 'dryer', 8),
    ('Regular Dryer 2', 'regular', 'dryer', 8),
    ('Regular Dryer 3', 'regular', 'dryer', 8),
    ('Titan Washer 1', 'titan', 'washer', 10),
    ('Titan Dryer 1', 'titan', 'dryer', 10)
ON CONFLICT (name) DO NOTHING;
