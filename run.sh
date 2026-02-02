#!/bin/bash

# MindGlass - Run both backend and frontend
# Usage: ./run.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting MindGlass...${NC}"

# Check if .env exists in backend
if [ ! -f backend/.env ]; then
    echo -e "${RED}Error: backend/.env not found${NC}"
    echo "Please create backend/.env with your CEREBRAS_API_KEY"
    exit 1
fi

# Kill existing processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}Done!${NC}"
}
trap cleanup EXIT

# Start backend
echo -e "${BLUE}Starting backend on http://localhost:8000...${NC}"
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend ready!${NC}"
        break
    fi
    sleep 0.5
done

# Start frontend
echo -e "${BLUE}Starting frontend on http://localhost:5173...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}Frontend ready!${NC}"
        break
    fi
    sleep 0.5
done

echo ""
echo -e "${GREEN}MindGlass is running!${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:8000${NC}"
echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Keep script running
wait
