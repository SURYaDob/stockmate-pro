#!/bin/bash
set -euo pipefail

# StockMate Pro - One-command setup & launch
# ============================================
#
# Usage:
#   ./start.sh           # Production mode (build + preview servers)
#   ./start.sh --dev     # Dev mode (Vite hot-reload + nodemon)
#   ./start.sh -d        # Dev mode shorthand
#   ./start.sh --help    # Show this message

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Track background PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""
_CLEANUP_DONE=0

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---------- Help ----------
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    sed -n '3,11p' "$0"
    exit 0
fi

# Parse --dev flag
DEV_MODE=0
for arg in "$@"; do
  if [ "$arg" = "--dev" ] || [ "$arg" = "-d" ]; then
    DEV_MODE=1
  fi
done

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         StockMate Pro — Setup & Launch       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---------- Orphan cleanup trap (fires on any exit) ----------
cleanup() {
    if [ "$_CLEANUP_DONE" = "1" ]; then return; fi
    _CLEANUP_DONE=1
    echo ""
    echo -e "${YELLOW}[~]${NC} Shutting down..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    # Kill any orphan node processes started by this script on our ports
    lsof -ti tcp:5000 -ti tcp:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}[✓]${NC} Servers stopped."
    exit 0
}
trap cleanup EXIT SIGINT SIGTERM

# ---------- Helper: print a step header ----------
step() {
    echo -e "${YELLOW}[~]${NC} $1"
}

ok() {
    echo -e "${GREEN}[✓]${NC} $1"
}

fail() {
    echo -e "${RED}[✗]${NC} $1"
}

# ---------- Prerequisites ----------
check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        fail "$1 is not installed."
        return 1
    fi
    return 0
}

# Validate project structure
if [ ! -d "$SCRIPT_DIR/backend" ]; then
    fail "Cannot find 'backend' folder next to this script."
    echo "    Make sure you are running start.sh from the project root."
    exit 1
fi
if [ ! -d "$SCRIPT_DIR/frontend" ]; then
    fail "Cannot find 'frontend' folder next to this script."
    echo "    Make sure you are running start.sh from the project root."
    exit 1
fi

step "Checking prerequisites..."

if ! check_cmd node; then
    echo "    Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check minimum Node version
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ] 2>/dev/null; then
    fail "Node.js $(node --version) is too old. Please install Node.js 18+."
    exit 1
fi

if ! check_cmd npm; then
    echo "    npm not found (should come with Node.js)"
    exit 1
fi

ok "Node.js $(node --version)"

# ---------- Environment ----------
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo ""
    echo -e "${YELLOW}[i]${NC} Creating backend/.env with default SQLite settings..."
    cat > "$SCRIPT_DIR/backend/.env" << 'EOF'
# Backend Configuration
PORT=5000
NODE_ENV=development

# SQLite Database (stored locally)
DATABASE_URL=file:./prisma/stockmate.db

# JWT Secrets
JWT_ACCESS_SECRET=stockmate-default-access-secret-change-in-production
JWT_REFRESH_SECRET=stockmate-default-refresh-secret-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000
EOF
    echo -e "${YELLOW}[!]${NC} Created default backend/.env. Edit if needed."
fi
ok "Backend configuration found"

# ---------- Install dependencies ----------
echo ""
step "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install --loglevel=error
ok "Backend dependencies installed"

step "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install --loglevel=error
ok "Frontend dependencies installed"

# ---------- Database ----------
echo ""
step "Generating Prisma client..."
cd "$SCRIPT_DIR/backend"
npx prisma generate
ok "Prisma client generated"

step "Running database migrations..."
if npx prisma migrate deploy 2>/dev/null; then
    ok "Database migrations applied"
else
    echo -e "${YELLOW}[!]${NC} First-time setup — creating initial migration..."
    if ! npx prisma migrate dev --name init 2>/dev/null; then
        fail "Migration failed. Try deleting backend/prisma/stockmate.db and re-running."
        exit 1
    fi
    ok "Database migrations applied"
fi

step "Seeding database with sample data..."
if ! node prisma/seed.js; then
    echo -e "${YELLOW}[!]${NC} Seed may have partially completed (expected on re-seed)"
fi
ok "Database seeded"

cd "$SCRIPT_DIR"

echo ""
ok "Setup complete!"
echo ""

# ---------- Start servers ----------
if [ "$DEV_MODE" = "1" ]; then
    echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║    Starting Dev Mode (Vite + Nodemon)        ║${NC}"
    echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}║${NC}  Frontend:  ${CYAN}http://localhost:3000${NC}             ║"
    echo -e "${BOLD}║${NC}  Backend:   ${CYAN}http://localhost:5000${NC}             ║"
    echo -e "${BOLD}║${NC}  API via:   Vite proxy (/api → :5000)    ║"
    echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${DIM}Login Credentials:${NC}"
    echo -e "${DIM}─────────────────────────────────────────────${NC}"
    echo -e "  ${DIM}Admin:        admin@stockmate.com / Admin@123${NC}"
    echo -e "  ${DIM}Store Manager: manager@stockmate.com / Manager@123${NC}"
    echo -e "  ${DIM}Staff:        staff@stockmate.com / Staff@123${NC}"
    echo -e "  ${DIM}Accountant:   accountant@stockmate.com / Accountant@123${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all servers.${NC}"
    echo ""

    # Start both together via frontend's dev:all (uses concurrently)
    cd "$SCRIPT_DIR/frontend"
    npm run dev:all
else
    # Build frontend for production
    echo ""
    step "Building frontend for production..."
    cd "$SCRIPT_DIR/frontend"
    npm run build
    ok "Frontend built"
    cd "$SCRIPT_DIR"

    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║         Starting StockMate Pro                ║${NC}"
    echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}║${NC}  Frontend:  ${CYAN}http://localhost:3000${NC}             ║"
    echo -e "${BOLD}║${NC}  Backend:   ${CYAN}http://localhost:5000${NC}             ║"
    echo -e "${BOLD}║${NC}  API Docs:  ${CYAN}http://localhost:5000/api/health${NC}  ║"
    echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${DIM}Login Credentials:${NC}"
    echo -e "${DIM}─────────────────────────────────────────────${NC}"
    echo -e "  ${DIM}Admin:        admin@stockmate.com / Admin@123${NC}"
    echo -e "  ${DIM}Store Manager: manager@stockmate.com / Manager@123${NC}"
    echo -e "  ${DIM}Staff:        staff@stockmate.com / Staff@123${NC}"
    echo -e "  ${DIM}Accountant:   accountant@stockmate.com / Accountant@123${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all servers.${NC}"
    echo ""

    # Start backend (no subshell — keeps $! pointing at the actual node process)
    cd "$SCRIPT_DIR/backend"
    npm run dev &
    BACKEND_PID=$!
    cd "$SCRIPT_DIR"

    # Wait for backend to be ready (max 30 seconds)
    echo -n "[~] Waiting for backend to start..."
    for ((i=1; i<=30; i++)); do
        if curl -sf http://localhost:5000/api/health > /dev/null 2>&1; then
            echo -e "\r${GREEN}[✓]${NC} Backend is running on http://localhost:5000"
            break
        fi
        if [ "$i" -eq 30 ]; then
            echo -e "\r${YELLOW}[!]${NC} Backend may not be ready yet. Check http://localhost:5000/api/health"
        fi
        sleep 1
    done

    # Start frontend (no subshell)
    cd "$SCRIPT_DIR/frontend"
    npx vite preview --port 3000 &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"

    # Wait for frontend to be ready (max 15 seconds)
    echo -n "[~] Waiting for frontend to start..."
    for ((i=1; i<=15; i++)); do
        if curl -sf http://localhost:3000 > /dev/null 2>&1; then
            echo -e "\r${GREEN}[✓]${NC} Frontend is running on http://localhost:3000"
            break
        fi
        if [ "$i" -eq 15 ]; then
            echo -e "\r${YELLOW}[!]${NC} Frontend may not be ready yet. Check http://localhost:3000"
        fi
        sleep 1
    done
    echo ""

    # Open browser if possible
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000 2>/dev/null || true
    elif command -v open &> /dev/null; then
        open http://localhost:3000 2>/dev/null || true
    fi

    # Wait for either process to exit (Ctrl+C sends SIGINT/SIGTERM → trap cleanup → exit)
    wait
fi
