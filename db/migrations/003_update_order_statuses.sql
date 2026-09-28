BEGIN;

-- Remove the old status restrictions.
ALTER TABLE orders
DROP CONSTRAINT orders_status_check;

ALTER TABLE order_status_history
DROP CONSTRAINT order_status_history_status_check;

-- Map existing statuses to the new workflow.
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

-- Set the new default for incoming orders.
ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'new';

-- Apply the seven-stage workflow restrictions.
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
