BEGIN;

ALTER TABLE orders
DROP CONSTRAINT orders_status_check;

ALTER TABLE order_status_history
DROP CONSTRAINT order_status_history_status_check;

UPDATE orders
SET status = CASE
  WHEN status = 'received' THEN 'new'
  WHEN status = 'picked_up' THEN 'completed'
  ELSE status
END;

UPDATE order_status_history
SET status = CASE
  WHEN status = 'received' THEN 'new'
  WHEN status = 'picked_up' THEN 'completed'
  ELSE status
END;

ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'new',
  'waiting',
  'washing',
  'drying',
  'folding',
  'ready',
  'completed'
));

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_status_check
CHECK (status IN (
  'new',
  'waiting',
  'washing',
  'drying',
  'folding',
  'ready',
  'completed'
));

COMMIT;
