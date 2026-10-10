#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/virtuaraai-backend"
FRONTEND="$ROOT/virtuaraai-main"

BACKEND_PORT=8001
FRONTEND_PORT=3002

# ── colours ───────────────────────────────────────────────────
GREEN='\033[0;32m'; GOLD='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${GOLD}[Virtuara]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
err()  { echo -e "${RED}  ✗${NC} $1"; }

# ── kill anything on our ports ─────────────────────────────────
for port in $BACKEND_PORT $FRONTEND_PORT; do
  pid=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null && log "Killed existing process on port $port"
  fi
done

# ── check postgres ─────────────────────────────────────────────
if ! pg_isready -q 2>/dev/null; then
  err "PostgreSQL is not running. Start it with: sudo service postgresql start"
  exit 1
fi
ok "PostgreSQL is running"

# ── backend ────────────────────────────────────────────────────
log "Starting Django backend on port $BACKEND_PORT..."
cd "$BACKEND"
source venv/bin/activate

# Run any pending migrations silently
DJANGO_SETTINGS_MODULE=config.settings.development python manage.py migrate --run-syncdb -v 0 2>/dev/null
ok "Migrations up to date"

DJANGO_SETTINGS_MODULE=config.settings.development python manage.py runserver $BACKEND_PORT \
  > /tmp/virtuara-backend.log 2>&1 &
BACKEND_PID=$!
ok "Backend PID $BACKEND_PID → http://localhost:$BACKEND_PORT"

# wait for backend to be ready
for i in $(seq 1 20); do
  if curl -sf "http://localhost:$BACKEND_PORT/api/v1/subjects/" > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# ── frontend ───────────────────────────────────────────────────
log "Starting Next.js frontend on port $FRONTEND_PORT..."
cd "$FRONTEND"
npm run dev -- -p $FRONTEND_PORT > /tmp/virtuara-frontend.log 2>&1 &
FRONTEND_PID=$!
ok "Frontend PID $FRONTEND_PID → http://localhost:$FRONTEND_PORT"

# ── summary ────────────────────────────────────────────────────
echo ""
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Virtuara AI is running!${NC}"
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Frontend  ${NC}→  http://localhost:$FRONTEND_PORT"
echo -e "  ${GREEN}Admin     ${NC}→  http://localhost:$BACKEND_PORT/admin/"
echo -e "  ${GREEN}API docs  ${NC}→  http://localhost:$BACKEND_PORT/api/docs/"
echo ""
echo -e "  Admin login: ${GOLD}admin@virtuara.ai${NC} / ${GOLD}Admin@1234${NC}"
echo ""
echo -e "  Logs: tail -f /tmp/virtuara-backend.log"
echo -e "        tail -f /tmp/virtuara-frontend.log"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop everything"
echo ""

# ── trap Ctrl+C to kill both ───────────────────────────────────
cleanup() {
  echo ""
  log "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  ok "Stopped"
}
trap cleanup INT TERM

wait $BACKEND_PID $FRONTEND_PID
