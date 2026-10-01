-- Retired legacy schema file.
-- Use `npm run migrate` to create/update the current schema. This file is kept
-- as a guard for old instructions and deliberately performs no destructive SQL.
DO $$
BEGIN
  RAISE EXCEPTION 'db/schema.sql is retired; use npm run migrate instead';
END;
$$;
