ALTER TABLE product_movements
DROP CONSTRAINT IF EXISTS product_movements_movement_type_check;

ALTER TABLE product_movements
ADD CONSTRAINT product_movements_movement_type_check
CHECK (movement_type IN ('stock_in', 'usage', 'adjustment'));
