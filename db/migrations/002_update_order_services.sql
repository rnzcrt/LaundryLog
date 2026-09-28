BEGIN;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_load_type_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_load_type_check
  CHECK (load_type IN (
    'wash_fold',
    'wash_only',
    'dry_only',
    'fold_only',
    'dry_clean',
    'press_only'
  ));

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS measure_matches_load_type;

ALTER TABLE orders
  ADD CONSTRAINT measure_matches_load_type CHECK (
    (
      load_type IN ('wash_fold', 'wash_only', 'dry_only', 'fold_only')
      AND weight_kg IS NOT NULL
      AND item_count IS NULL
    )
    OR
    (
      load_type IN ('dry_clean', 'press_only')
      AND item_count IS NOT NULL
      AND weight_kg IS NULL
    )
  );

COMMIT;
