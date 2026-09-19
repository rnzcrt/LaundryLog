-- Sample data for development.
-- Run with: psql "$DATABASE_URL" -f db/seed.sql
-- Safe to re-run after db/schema.sql, which recreates the tables.

INSERT INTO customers (name, phone, notes) VALUES
    ('Maria Santos',   '0917-555-0142', 'Prefers fabric softener, no bleach'),
    ('Juan Dela Cruz', '0928-555-0199', NULL),
    ('Ana Reyes',      '0905-555-0163', 'Calls before pickup'),
    ('Paolo Mendoza',  '0918-555-0177', NULL);

INSERT INTO orders (customer_id, load_type, weight_kg, item_count, price, status, note, created_at) VALUES
    (1, 'wash_fold',  4.50, NULL, 315.00, 'washing',   'Two bedsheets included', now() - interval '3 hours'),
    (2, 'dry_clean',  NULL,    2, 480.00, 'ready',     NULL,                     now() - interval '1 day'),
    (3, 'wash_fold',  6.20, NULL, 434.00, 'picked_up', NULL,                     now() - interval '2 days'),
    (1, 'press_only', NULL,    5, 175.00, 'received',  'Polo barongs, hang dry', now() - interval '40 minutes'),
    (4, 'wash_only',  3.00, NULL, 180.00, 'received',  NULL,                     now() - interval '15 minutes'),
    (2, 'wash_fold',  8.00, NULL, 560.00, 'ready',     'Rush order',             now() - interval '5 hours'),
    (3, 'dry_clean',  NULL,    1, 350.00, 'washing',   NULL,                     now() - interval '6 hours');

-- Timeline entries matching the statuses above.
INSERT INTO order_status_history (order_id, status, note, changed_at) VALUES
    (1, 'received', 'Dropped off at counter', now() - interval '3 hours'),
    (1, 'washing',  NULL,                     now() - interval '2 hours'),
    (2, 'received', NULL,                     now() - interval '1 day'),
    (2, 'washing',  NULL,                     now() - interval '22 hours'),
    (2, 'ready',    'Bagged and tagged',      now() - interval '18 hours'),
    (3, 'received', NULL,                     now() - interval '2 days'),
    (3, 'washing',  NULL,                     now() - interval '47 hours'),
    (3, 'ready',    NULL,                     now() - interval '44 hours'),
    (3, 'picked_up','Paid in cash',           now() - interval '43 hours'),
    (4, 'received', NULL,                     now() - interval '40 minutes'),
    (5, 'received', NULL,                     now() - interval '15 minutes'),
    (6, 'received', NULL,                     now() - interval '5 hours'),
    (6, 'washing',  NULL,                     now() - interval '4 hours'),
    (6, 'ready',    NULL,                     now() - interval '1 hour'),
    (7, 'received', NULL,                     now() - interval '6 hours'),
    (7, 'washing',  NULL,                     now() - interval '5 hours');

INSERT INTO payments (order_id, amount, method, paid_at) VALUES
    (3, 434.00, 'cash', now() - interval '43 hours');
