#!/bin/bash
set -e

# StockMate Pro - One-command setup & launch
# ============================================

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         StockMate Pro — Setup & Launch       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---------- Prerequisites ----------
check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}[✗]${NC} $1 is not installed."
        return 1
    fi
    return 0
}

echo -n "[~] Checking prerequisites..."

if ! check_cmd node; then
    echo -e "\n    Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

if ! check_cmd npm; then
    echo -e "\n    npm not found (should come with Node.js)"
    exit 1
fi

echo -e "\r${GREEN}[✓]${NC} Node.js $(node --version)"

# ---------- Environment ----------
if [ ! -f backend/.env ]; then
    echo ""
    echo -e "${YELLOW}[i]${NC} Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}[!]${NC} Please edit backend/.env with your database settings."
    echo "    Then run this script again."
    echo ""
    echo "    Example MySQL connection:"
    echo -e "    ${DIM}DATABASE_URL=mysql://root:password@localhost:3306/stockmate_pro${NC}"
    echo ""
    exit 0
fi
echo -e "${GREEN}[✓]${NC} Backend configuration found"

# ---------- Install dependencies ----------
echo ""
echo -e "${YELLOW}[~]${NC} Installing backend dependencies..."
(cd backend && npm install --loglevel=error)
echo -e "${GREEN}[✓]${NC} Backend dependencies installed"

echo -e "${YELLOW}[~]${NC} Installing frontend dependencies..."
(cd frontend && npm install --loglevel=error)
echo -e "${GREEN}[✓]${NC} Frontend dependencies installed"

# ---------- Database ----------
echo ""
echo -e "${YELLOW}[~]${NC} Generating Prisma client..."
(cd backend && npx prisma generate)
echo -e "${GREEN}[✓]${NC} Prisma client generated"

echo -e "${YELLOW}[~]${NC} Running database migrations..."
(cd backend && npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init 2>/dev/null)
echo -e "${GREEN}[✓]${NC} Database migrations applied"

echo -e "${YELLOW}[~]${NC} Seeding database with sample data..."
(cd backend && node prisma/seed.js) || echo -e "${YELLOW}[!]${NC} Seed may have partially completed"
echo -e "${GREEN}[✓]${NC} Database seeded"

# ---------- Build frontend ----------
echo ""
echo -e "${YELLOW}[~]${NC} Building frontend for production..."
(cd frontend && npm run build)
echo -e "${GREEN}[✓]${NC} Frontend built"

# ---------- Start servers ----------
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

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}[~]${NC} Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}[✓]${NC} Servers stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
(cd backend && npm run dev) &
BACKEND_PID=$!

# Wait for backend to be ready (max 30 seconds)
echo -n "[~] Waiting for backend to start..."
for i in $(seq 1 30); do
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo -e "\r${GREEN}[✓]${NC} Backend is running on http://localhost:5000"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "\r${YELLOW}[!]${NC} Backend may not be ready yet. Check http://localhost:5000/api/health"
    fi
    sleep 1
done

# Start frontend
(cd frontend && npx vite preview --port 3000) &
FRONTEND_PID=$!

sleep 2
echo -e "${GREEN}[✓]${NC} Frontend is running on http://localhost:3000"
echo ""

# Open browser if possible
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null
elif command -v open &> /dev/null; then
    open http://localhost:3000 2>/dev/null
fi

wait
