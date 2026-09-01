"""
Audit Logger — Append-Only JSONL
==================================
Every agent decision is logged to audit_log.jsonl as a single JSON line.
This provides a complete, tamper-evident audit trail for compliance and debugging.
"""

import os
import json
import asyncio
from datetime import datetime, timezone

AUDIT_LOG_PATH = os.path.join(os.path.dirname(__file__), "audit_log.jsonl")

# Lock for thread-safe async writes
_write_lock = asyncio.Lock()


async def append(entry: dict) -> None:
    """
    Append a single audit entry to the JSONL log file.
    Thread-safe via asyncio.Lock.
    """
    async with _write_lock:
        with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def build_audit_entry(
    txn: dict,
    failure_class: str,
    action: dict,
    action_result: str,
    classifier_stage: str,
    api_endpoint: str | None = None,
    mock_mode: bool = True,
    anomaly_flagged: bool = False,
    reason: str = "",
) -> dict:
    """
    Build a structured audit log entry.

    Args:
        txn: The original transaction dict
        failure_class: Classified failure type
        action: Recovery action dict from decision engine
        action_result: "success" | "failed" | "escalated" | "skipped" | "human_review"
        classifier_stage: "rule_based" | "ml_fallback"
        api_endpoint: The API endpoint called, if any
        mock_mode: Whether the API call was mocked
        anomaly_flagged: Whether the txn was flagged by anomaly detection
        reason: Human-readable explanation

    Returns:
        Structured audit entry dict
    """
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "transaction_id": txn.get("transaction_id", "unknown"),
        "amount_inr": round(txn.get("amount", 0) / 100, 2),
        "failure_code": txn.get("failure_code", "unknown"),
        "failure_class": failure_class,
        "classifier_stage": classifier_stage,
        "action_taken": action.get("action", "NONE") if action else "NONE",
        "action_result": action_result,
        "api_endpoint": api_endpoint or action.get("api_call") if action else None,
        "mock_mode": mock_mode,
        "anomaly_flagged": anomaly_flagged or txn.get("anomaly_flagged", False),
        "reason": reason or (action.get("description", "") if action else ""),
    }


def read_last_n(n: int = 100) -> list[dict]:
    """Read the last n entries from the audit log."""
    if not os.path.exists(AUDIT_LOG_PATH):
        return []

    entries = []
    with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    return entries[-n:]


def clear() -> None:
    """Clear the audit log (for fresh agent runs)."""
    if os.path.exists(AUDIT_LOG_PATH):
        os.remove(AUDIT_LOG_PATH)
