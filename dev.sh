#!/bin/bash
# SharePlate - Start full development environment

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null
    [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null
    docker compose -f "$ROOT_DIR/infra/docker-compose.yml" stop
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

trap cleanup INT TERM

echo -e "${CYAN}"
echo "  ____  _    ___  ____  ____  ____  _      __  ____  ____ "
echo " / ___)| |  / _ \|  _ \|  __)| __ \| |    / _\|_  _||  __)"
echo " \___ \| |_| (_) | |_) ) _)  |    /| |__ /    \ ||  | _|  "
echo " |____/|____\___/|  __/|____)|_|\_\|____|\_/\_/ ||  |____)"
echo "                 |_|                                        "
echo -e "${NC}"

# 1. Docker
echo -e "${YELLOW}[1/3] Starting Docker services (postgres + azurite)...${NC}"
docker compose -f "$ROOT_DIR/infra/docker-compose.yml" up -d
if [[ $? -ne 0 ]]; then
    echo -e "${RED}Failed to start Docker services. Is Docker running?${NC}"
    exit 1
fi
echo -e "${GREEN}  Docker services ready.${NC}"

# 2. Backend
echo -e "${YELLOW}[2/3] Starting .NET backend (http://localhost:5211)...${NC}"
(cd "$ROOT_DIR/backend" && dotnet run --project SharePlate.API/SharePlate.API.csproj 2>&1 | sed "s/^/  ${CYAN}[backend]${NC} /") &
BACKEND_PID=$!

# Give the backend a moment to start
sleep 2

# 3. Frontend
echo -e "${YELLOW}[3/3] Starting frontend (Vite dev server)...${NC}"
(cd "$ROOT_DIR/frontend" && npm run dev 2>&1 | sed "s/^/  ${GREEN}[frontend]${NC} /") &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}All services started.${NC}"
echo -e "  Backend  → ${CYAN}http://localhost:5211${NC}"
echo -e "  Frontend → ${GREEN}http://localhost:5173${NC}"
echo -e "  Swagger  → ${CYAN}http://localhost:5211/swagger${NC}"
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop all services."
echo ""

wait
