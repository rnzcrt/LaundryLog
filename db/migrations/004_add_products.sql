-- Add product and soap inventory without affecting existing data.

CREATE TABLE IF NOT EXISTS products (
    id                  SERIAL PRIMARY KEY,
    name                TEXT NOT NULL UNIQUE
                        CHECK (length(trim(name)) > 0),
    unit                TEXT NOT NULL
                        CHECK (length(trim(unit)) > 0),
    stock_quantity      NUMERIC(10, 2) NOT NULL DEFAULT 0
                        CHECK (stock_quantity >= 0),
    low_stock_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5
                        CHECK (low_stock_threshold >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_name_idx
    ON products (name);
