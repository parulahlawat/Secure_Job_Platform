#!/bin/bash
# Start FCS application with HTTPS

set -e

echo "🔐 Starting FCS with HTTPS..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if certificates exist
if [ ! -f "certs/server.crt" ] || [ ! -f "certs/server.key" ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found. Generating...${NC}"
    bash generate-certs.sh
fi

echo -e "${BLUE}📌 Frontend: https://127.0.0.1:3000${NC}"
echo -e "${BLUE}📌 Backend:  https://localhost:8000${NC}"
echo -e "${BLUE}📌 API Docs: https://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}⚠️  HTTPS uses self-signed certificates${NC}"
echo -e "${YELLOW}    Browser will show security warning - this is normal for development${NC}"
echo -e "${YELLOW}    Click 'Advanced' > 'Proceed to localhost' to continue${NC}"
echo ""

# Start backend in background
echo -e "${GREEN}▶ Starting Backend Server...${NC}"
cd backend
source ../.venv/bin/activate

uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --ssl-keyfile=../certs/server.key \
  --ssl-certfile=../certs/server.crt \
  --reload &

BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
sleep 2

# Start frontend in background (from parent directory)
cd ..
echo -e "${GREEN}▶ Starting Frontend Server...${NC}"
cd frontend

npm run dev &

FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}✅ All services started with HTTPS!${NC}"
echo ""
echo "Application is running:"
echo -e "  ${BLUE}Frontend: https://127.0.0.1:3000${NC}"
echo -e "  ${BLUE}Backend:  https://localhost:8000${NC}"
echo ""
echo "Press Ctrl+C to stop all services..."
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
