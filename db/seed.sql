-- Idempotent sample data for a local/demo database. Every generated order and
-- movement has a marker so rerunning this file does not duplicate sample rows.
BEGIN;

INSERT INTO customers (name, phone, notes) VALUES
    ('Maria Santos', '0917-555-0142', 'Prefers fabric softener, no bleach'),
    ('Juan Dela Cruz', '0928-555-0199', NULL),
    ('Ana Reyes', '0905-555-0163', 'Calls before pickup'),
    ('Paolo Mendoza', '0918-555-0177', NULL)
ON CONFLICT (phone) DO NOTHING;

WITH seed_orders(name, phone, load_type, weight_kg, item_count, price, status, note) AS (
    VALUES
      ('Maria Santos', '0917-555-0142', 'wash_fold', 4.50::numeric, NULL::integer, 315.00::numeric, 'washing', '[LaundryLog sample] Bedsheets included'),
      ('Juan Dela Cruz', '0928-555-0199', 'dry_clean', NULL::numeric, 2, 480.00::numeric, 'ready', '[LaundryLog sample] Dry clean items'),
      ('Ana Reyes', '0905-555-0163', 'wash_fold', 6.20::numeric, NULL::integer, 434.00::numeric, 'completed', '[LaundryLog sample] Pickup example'),
      ('Paolo Mendoza', '0918-555-0177', 'wash_only', 3.00::numeric, NULL::integer, 180.00::numeric, 'new', '[LaundryLog sample] New drop-off')
), inserted AS (
    INSERT INTO orders (customer_id, load_type, weight_kg, item_count, price, status, note, created_at)
    SELECT c.id, s.load_type, s.weight_kg, s.item_count, s.price, s.status, s.note, now() - interval '1 hour'
    FROM seed_orders s
    JOIN customers c ON c.phone = s.phone
    WHERE NOT EXISTS (
      SELECT 1 FROM orders o WHERE o.note = s.note
    )
    RETURNING id, status, note
)
INSERT INTO order_status_history (order_id, status, note, changed_at)
SELECT id, status, 'LaundryLog sample data', now() - interval '1 hour'
FROM inserted;

INSERT INTO payments (order_id, amount, method, paid_at)
SELECT o.id, 200.00, 'cash', now() - interval '50 minutes'
FROM orders o
WHERE o.note = '[LaundryLog sample] Bedsheets included'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id);

INSERT INTO payments (order_id, amount, method, paid_at)
SELECT o.id, 115.00, 'gcash', now() - interval '10 minutes'
FROM orders o
WHERE o.note = '[LaundryLog sample] Bedsheets included'
  AND NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.method = 'gcash'
  );

INSERT INTO machine_loads
    (order_id, machine_id, load_number, weight_kg, status, completed_at, notes)
SELECT o.id, m.id, 1, LEAST(o.weight_kg, m.capacity_kg), 'completed', now(), 'LaundryLog sample load'
FROM orders o
JOIN machines m ON m.name = 'Regular Washer 1'
WHERE o.note = '[LaundryLog sample] Bedsheets included'
  AND NOT EXISTS (
    SELECT 1 FROM machine_loads ml
    WHERE ml.order_id = o.id AND ml.load_number = 1
  );

INSERT INTO products (name, unit, stock_quantity, low_stock_threshold) VALUES
    ('Laundry detergent', 'liters', 12, 3),
    ('Fabric softener', 'liters', 7, 2),
    ('Stain remover', 'bottles', 2, 3)
ON CONFLICT (name) DO NOTHING;

-- Requested optional completion add-ons. Exact-name upserts keep this safe to
-- rerun and leave order_addons historical name/price snapshots untouched.
INSERT INTO service_addons (name, price, is_active) VALUES
    ('Folding', 20.00, true),
    ('Ariel — Sunrise Fresh', 10.00, true),
    ('Downy — Antibac', 10.00, true),
    ('Downy — Sunrise', 10.00, true),
    ('Surf — Fabcon Sunbloom', 10.00, true),
    ('Surf — Liquid Detergent Rose Fresh', 10.00, true),
    ('Tide — Garden Bloom', 10.00, true),
    ('Champion — Original', 10.00, true),
    ('Zonrox — Colorsafe', 5.00, true)
ON CONFLICT (name) DO UPDATE
SET price = EXCLUDED.price,
    is_active = true,
    updated_at = now();

-- Retire legacy timestamp-named workflow-test add-ons without deleting their
-- rows or changing any order_addons snapshots that may reference them.
UPDATE service_addons
SET is_active = false,
    updated_at = now()
WHERE name ~ '^Completion add-on [0-9]+$';

INSERT INTO product_movements (product_id, movement_type, quantity, notes)
SELECT p.id, 'stock_in', 12, 'LaundryLog sample seed: opening detergent stock'
FROM products p
WHERE p.name = 'Laundry detergent'
  AND NOT EXISTS (SELECT 1 FROM product_movements WHERE notes = 'LaundryLog sample seed: opening detergent stock');

INSERT INTO product_movements (product_id, movement_type, quantity, notes)
SELECT p.id, 'stock_in', 7, 'LaundryLog sample seed: opening softener stock'
FROM products p
WHERE p.name = 'Fabric softener'
  AND NOT EXISTS (SELECT 1 FROM product_movements WHERE notes = 'LaundryLog sample seed: opening softener stock');

INSERT INTO product_movements (product_id, movement_type, quantity, notes)
SELECT p.id, 'stock_in', 2, 'LaundryLog sample seed: opening stain remover stock'
FROM products p
WHERE p.name = 'Stain remover'
  AND NOT EXISTS (SELECT 1 FROM product_movements WHERE notes = 'LaundryLog sample seed: opening stain remover stock');

COMMIT;
