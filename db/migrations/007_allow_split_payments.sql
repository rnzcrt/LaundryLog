BEGIN;

ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_order_id_key;

CREATE INDEX IF NOT EXISTS payments_order_id_paid_at_idx
ON payments (order_id, paid_at DESC);

COMMIT;
