-- Keep the selectable completion catalog canonical. Existing order_addons
-- snapshots are intentionally left unchanged.
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

-- Retire timestamp-named workflow-test entries without deleting rows that
-- historical order_addons may reference.
UPDATE service_addons
SET is_active = false,
    updated_at = now()
WHERE name ~ '^Completion add-on [0-9]+$'
  AND is_active = true;
