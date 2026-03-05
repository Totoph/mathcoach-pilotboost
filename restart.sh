#!/bin/bash
# ═══════════════════════════════════════════
# MathCoach PilotBoost — Clean Restart Script
# Kills ALL processes on ports 3000 & 8000,
# then starts backend + frontend cleanly.
# ═══════════════════════════════════════════

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔄 Stopping all processes on ports 3000 and 8000..."

# Kill anything on port 3000 (frontend)
for pid in $(lsof -t -i:3000 2>/dev/null); do
  kill -9 "$pid" 2>/dev/null && echo "  ✗ Killed PID $pid (port 3000)"
done

# Kill anything on port 8000 (backend)
for pid in $(lsof -t -i:8000 2>/dev/null); do
  kill -9 "$pid" 2>/dev/null && echo "  ✗ Killed PID $pid (port 8000)"
done

# Also kill any leftover next-server or uvicorn processes
pkill -9 -f "next-server" 2>/dev/null && echo "  ✗ Killed leftover next-server" || true
pkill -9 -f "next dev" 2>/dev/null && echo "  ✗ Killed leftover next dev" || true
pkill -9 -f "uvicorn app.main:app" 2>/dev/null && echo "  ✗ Killed leftover uvicorn" || true

# Wait for ports to be released
sleep 1

# Verify ports are free
if lsof -i:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "❌ Port 3000 still in use! Waiting 2s more..."
  sleep 2
fi
if lsof -i:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "❌ Port 8000 still in use! Waiting 2s more..."
  sleep 2
fi

echo ""
echo "🚀 Starting backend (port 8000)..."
cd "$DIR/backend"
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/mathcoach-backend.log 2>&1 &
BACKEND_PID=$!
echo "  ✓ Backend started (PID $BACKEND_PID)"

echo "🚀 Starting frontend (port 3000)..."
cd "$DIR/frontend"
nohup npm run dev -- -p 3000 > /tmp/mathcoach-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  ✓ Frontend started (PID $FRONTEND_PID)"

# Wait for them to be ready
echo ""
echo "⏳ Waiting for servers..."
for i in $(seq 1 15); do
  BACKEND_OK=false
  FRONTEND_OK=false
  curl -s http://localhost:8000/health >/dev/null 2>&1 && BACKEND_OK=true
  curl -s http://localhost:3000 >/dev/null 2>&1 && FRONTEND_OK=true
  if $BACKEND_OK && $FRONTEND_OK; then
    echo ""
    echo "═══════════════════════════════════════"
    echo "✅ Backend  → http://localhost:8000"
    echo "✅ Frontend → http://localhost:3000"
    echo "═══════════════════════════════════════"
    echo ""
    echo "Logs: tail -f /tmp/mathcoach-backend.log"
    echo "      tail -f /tmp/mathcoach-frontend.log"
    exit 0
  fi
  sleep 1
  printf "."
done

echo ""
echo "⚠️  Servers started but may still be loading."
echo "  Backend log:  tail -f /tmp/mathcoach-backend.log"
echo "  Frontend log: tail -f /tmp/mathcoach-frontend.log"
