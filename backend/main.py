"""
FastAPI Backend — Main Entry Point
=====================================
REST endpoints + WebSocket for real-time agent feed.
"""

import os
import json
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from agent import run_agent
from reporter import load_report
import audit_logger

# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Manages active WebSocket connections for real-time broadcasting."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        """Send a message to all connected WebSocket clients."""
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()

# ---------------------------------------------------------------------------
# Agent state (module-level, no Redis needed)
# ---------------------------------------------------------------------------

agent_state: dict = {
    "status": "idle",   # idle | running | complete | halted
    "processed": 0,
    "total": 200,
    "recovered": 0,
    "flagged": 0,
}

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    yield
    # Cleanup on shutdown
    from razorpay_client import razorpay_client
    await razorpay_client.close()


app = FastAPI(
    title="Razorpay Payment Failure Triage Agent",
    description="AI-powered batch payment failure recovery system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Data path
# ---------------------------------------------------------------------------

DATA_PATH = os.path.join(os.path.dirname(__file__), "synthetic_transactions.json")


def _load_transactions() -> list[dict]:
    """Load synthetic transactions from disk."""
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/transactions")
async def get_transactions():
    """Return synthetic_transactions.json."""
    return _load_transactions()


@app.get("/api/report")
async def get_report():
    """Return report.json (empty object if not run yet)."""
    report = load_report()
    return report if report else {}


@app.get("/api/audit-log")
async def get_audit_log():
    """Return last 100 entries from audit_log.jsonl."""
    return audit_logger.read_last_n(100)


@app.get("/api/status")
async def get_status():
    """Return current agent status."""
    return {
        "status": agent_state.get("status", "idle"),
        "processed": agent_state.get("processed", 0),
        "total": agent_state.get("total", 200),
        "recovered": agent_state.get("recovered", 0),
        "flagged": agent_state.get("flagged", 0),
    }


@app.post("/api/run-agent")
async def start_agent(background_tasks: BackgroundTasks):
    """
    Start agent processing in the background.
    Returns immediately — progress is streamed via WebSocket.
    """
    if agent_state.get("status") == "running":
        return {"error": "Agent is already running", "status": "running"}

    # Reset state
    agent_state["status"] = "running"
    agent_state["processed"] = 0
    agent_state["recovered"] = 0
    agent_state["flagged"] = 0

    transactions = _load_transactions()
    agent_state["total"] = len(transactions)

    async def _run():
        try:
            await run_agent(
                transactions=transactions,
                broadcaster=manager.broadcast,
                state=agent_state,
            )
        except Exception as e:
            print(f"[main] Agent error: {e}")
            agent_state["status"] = "error"
            await manager.broadcast({"type": "ERROR", "message": str(e)})

    # Run in background
    background_tasks.add_task(_run)

    return {"status": "started", "total": len(transactions)}


@app.post("/api/reset")
async def reset_agent():
    """Reset agent state for a fresh run."""
    agent_state["status"] = "idle"
    agent_state["processed"] = 0
    agent_state["recovered"] = 0
    agent_state["flagged"] = 0
    audit_logger.clear()
    return {"status": "idle"}


# ---------------------------------------------------------------------------
# PayLoop Endpoints (Layer 1 & 2)
# ---------------------------------------------------------------------------

@app.post("/api/run-guardian")
async def run_guardian():
    """Run Webhook Guardian checks."""
    from webhook_guardian import run_webhook_check
    transactions = _load_transactions()
    
    # Run check and optionally broadcast
    result = await run_webhook_check(transactions, manager.broadcast)
    return result

@app.get("/api/settlements")
async def get_settlements():
    """Load or generate synthetic settlements."""
    from settlement_generator import generate_settlements
    import os
    
    settlements_path = os.path.join(os.path.dirname(__file__), "synthetic_settlements.json")
    if os.path.exists(settlements_path):
        with open(settlements_path, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        return generate_settlements()

@app.post("/api/run-reconciliation")
async def run_reconciler():
    """Run Settlement Reconciler."""
    from reconciler import run_reconciliation
    from order_store import get_all_orders
    from settlement_generator import generate_settlements
    import os
    
    transactions = _load_transactions()
    orders = get_all_orders()
    
    settlements_path = os.path.join(os.path.dirname(__file__), "synthetic_settlements.json")
    if os.path.exists(settlements_path):
        with open(settlements_path, "r", encoding="utf-8") as f:
            settlements = json.load(f)
    else:
        settlements = generate_settlements()
        
    result = await run_reconciliation(settlements, transactions, orders)
    return result

# ---------------------------------------------------------------------------
# Copilot Endpoints (Layer 3)
# ---------------------------------------------------------------------------

@app.post("/api/copilot/chat")
async def copilot_chat(request: dict):
    from copilot import ask_copilot
    from reporter import load_report
    from order_store import get_all_orders
    
    report = load_report() or {}
    orders = get_all_orders()
    
    # Bundle relevant state for the LLM
    context = {
        "agent_status": agent_state,
        "recent_report": report,
        "total_orders": len(orders)
    }
    
    answer = await ask_copilot(request.get("message", ""), context)
    return {"reply": answer}

@app.post("/api/copilot/draft-email")
async def copilot_draft_email(request: dict):
    from copilot import draft_recovery_email
    
    transaction_id = request.get("transaction_id")
    if not transaction_id:
        return {"error": "Missing transaction_id"}
        
    transactions = _load_transactions()
    transaction = next((t for t in transactions if t["transaction_id"] == transaction_id), None)
    
    if not transaction:
        return {"error": "Transaction not found"}
        
    email_text = await draft_recovery_email(transaction)
    return {"draft": email_text}

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------

@app.websocket("/ws/agent-feed")
async def agent_feed(ws: WebSocket):
    """
    WebSocket endpoint for real-time agent feed.
    Broadcasts TXN_PROCESSED, BATCH_HALT, ANOMALY_FLAG, and BATCH_COMPLETE events.
    """
    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive — wait for client messages (ping/pong)
            data = await ws.receive_text()
            # Client can send "ping" to keep alive
            if data == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
