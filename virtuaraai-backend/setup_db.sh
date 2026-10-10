#!/bin/bash
set -e

echo "=== Virtuara AI — Database Setup ==="

# ── 1. Create PostgreSQL user and database ────────────────────
echo "[1/5] Creating PostgreSQL user and database..."
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'virtuara_user') THEN
    CREATE USER virtuara_user WITH PASSWORD 'virtuara_pass';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE virtuara_db OWNER virtuara_user'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'virtuara_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE virtuara_db TO virtuara_user;
SQL

sudo -u postgres psql -d virtuara_db -c "GRANT ALL ON SCHEMA public TO virtuara_user;"
echo "  ✓ Database ready: virtuara_db"

# ── 2. Create .env from example ──────────────────────────────
echo "[2/5] Creating .env file..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
  # Generate a secret key
  SECRET=$(python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits + '!@#$%^&*') for _ in range(50)))")
  sed -i "s/your-secret-key-here-change-in-production/$SECRET/" "$SCRIPT_DIR/.env"
  echo "  ✓ .env created with generated SECRET_KEY"
else
  echo "  ✓ .env already exists"
fi

# ── 3. Create Python virtual environment ─────────────────────
echo "[3/5] Setting up Python virtual environment..."
cd "$SCRIPT_DIR"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo "  ✓ Python packages installed"

# ── 4. Run migrations ─────────────────────────────────────────
echo "[4/5] Running Django migrations..."
python manage.py migrate --settings=config.settings.development
echo "  ✓ Migrations applied"

# ── 5. Load initial data ──────────────────────────────────────
echo "[5/5] Loading initial data (subjects & plans)..."
python manage.py loaddata fixtures/subjects.json --settings=config.settings.development
python manage.py loaddata fixtures/plans.json --settings=config.settings.development
echo "  ✓ Initial data loaded"

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Create a superuser:"
echo "  source venv/bin/activate"
echo "  python manage.py createsuperuser --settings=config.settings.development"
echo ""
echo "Start the dev server:"
echo "  python manage.py runserver 8000 --settings=config.settings.development"
echo ""
echo "Swagger docs: http://localhost:8000/api/docs/"
