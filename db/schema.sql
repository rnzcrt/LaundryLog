DO $$
BEGIN
  RAISE EXCEPTION 'db/schema.sql is retired; use npm run migrate instead';
END;
$$;
