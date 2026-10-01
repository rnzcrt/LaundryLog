-- Add an update timestamp for editable customer contact records.
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
