-- Track stock additions and usage without altering existing inventory.

CREATE TABLE IF NOT EXISTS product_movements (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL
                  CHECK (movement_type IN ('stock_in', 'usage')),
    quantity    NUMERIC(10, 2) NOT NULL
                CHECK (quantity > 0),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_movements_product_created_idx
    ON product_movements (product_id, created_at DESC);
