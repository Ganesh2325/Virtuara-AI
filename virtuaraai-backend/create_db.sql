-- Run this as the postgres superuser:
-- sudo -u postgres psql -f create_db.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'virtuara_user') THEN
    CREATE USER virtuara_user WITH PASSWORD 'virtuara_pass';
    RAISE NOTICE 'Created user: virtuara_user';
  ELSE
    RAISE NOTICE 'User virtuara_user already exists';
  END IF;
END
$$;

SELECT 'CREATE DATABASE virtuara_db OWNER virtuara_user'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'virtuara_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE virtuara_db TO virtuara_user;

\c virtuara_db
GRANT ALL ON SCHEMA public TO virtuara_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO virtuara_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO virtuara_user;

\echo '✓ Database virtuara_db and user virtuara_user are ready.'
