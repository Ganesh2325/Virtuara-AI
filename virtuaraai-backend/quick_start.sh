#!/bin/bash
# Run this after sudo -u postgres psql -f create_db.sql
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Virtuara AI Backend — Quick Start ==="
echo ""

# Activate virtual environment
source venv/bin/activate

# Run all migrations
echo "[1/3] Running migrations..."
DJANGO_SETTINGS_MODULE=config.settings.development python manage.py migrate
echo "  ✓ Done"

# Seed subjects, plans, and admin user
echo "[2/3] Seeding initial data..."
DJANGO_SETTINGS_MODULE=config.settings.development python manage.py seed
echo "  ✓ Done"

# Kill anything already on port 8001
fuser -k 8001/tcp 2>/dev/null || true

# Start the server
echo "[3/3] Starting dev server on http://localhost:8001"
echo ""
echo "  Admin panel : http://localhost:8001/admin/"
echo "  Swagger docs: http://localhost:8001/api/docs/"
echo "  API base URL: http://localhost:8001/api/v1/"
echo ""
echo "  Default admin login:"
echo "    Email   : admin@virtuara.ai"
echo "    Password: Admin@1234"
echo ""
DJANGO_SETTINGS_MODULE=config.settings.development python manage.py runserver 8001
