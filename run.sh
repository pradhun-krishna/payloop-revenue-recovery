#!/bin/bash
# Razorpay Payment Failure Triage Agent — Single Start Script
# Starts both backend (FastAPI) and frontend (Vite) in parallel.

set -e

echo "=== Razorpay Payment Failure Triage Agent ==="
echo ""

# Generate synthetic data if not exists
if [ ! -f backend/synthetic_transactions.json ]; then
    echo "[1/4] Generating synthetic transaction data..."
    cd backend && python data_generator.py && cd ..
else
    echo "[1/4] Synthetic data already exists — skipping"
fi

# Train ML model if not exists
if [ ! -f backend/models/classifier.pkl ]; then
    echo "[2/4] Training ML classifier model..."
    cd backend && python classifier.py && cd ..
else
    echo "[2/4] ML model already trained — skipping"
fi

# Start backend
echo "[3/4] Starting FastAPI backend on :8000..."
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start frontend
echo "[4/4] Starting Vite frontend on :5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== Both services started ==="
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both."

# Wait for both and handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
