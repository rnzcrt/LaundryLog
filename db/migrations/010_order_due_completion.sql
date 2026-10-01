-- Add optional promise dates and a dedicated completion timestamp.
ALTER TABLE orders
ADD COLUMN due_date DATE,
ADD COLUMN completed_at TIMESTAMPTZ;
