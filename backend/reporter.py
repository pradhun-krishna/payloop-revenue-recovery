"""
Batch Report Generator
========================
Generates a comprehensive report.json after the agent finishes processing.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from collections import defaultdict

REPORT_PATH = os.path.join(os.path.dirname(__file__), "report.json")


def generate_report(
    results: list[dict],
    anomaly_result: dict,
    nl_summary: str = "",
) -> dict:
    """
    Generate a structured batch report from agent processing results.

    Args:
        results: List of audit log entries (one per transaction)
        anomaly_result: Output from anomaly_detector.run_anomaly_check()
        nl_summary: Natural language summary from Gemini

    Returns:
        Complete report dict
    """
    total = len(results)

    # Aggregate by failure class
    by_class: dict[str, dict] = defaultdict(lambda: {"count": 0, "recovered": 0, "failed": 0})
    recovered = 0
    human_review = 0
    escalated = 0
    false_interventions = 0
    total_amount = 0
    exceptions = []

    for entry in results:
        cls = entry.get("failure_class", "UNKNOWN")
        action_result = entry.get("action_result", "")
        amount = entry.get("amount_inr", 0)
        total_amount += amount

        by_class[cls]["count"] += 1

        if action_result == "success":
            by_class[cls]["recovered"] += 1
            recovered += 1
        elif action_result == "failed":
            by_class[cls]["failed"] += 1
            exceptions.append({
                "transaction_id": entry.get("transaction_id", ""),
                "failure_class": cls,
                "reason": f"Recovery action failed: {entry.get('action_taken', '')}",
            })
        elif action_result == "human_review":
            human_review += 1
        elif action_result == "escalated":
            escalated += 1
            exceptions.append({
                "transaction_id": entry.get("transaction_id", ""),
                "failure_class": cls,
                "reason": "Escalated to security team — fraud block",
            })

        # False intervention: BANK_HARD_DECLINE that was retried (should be 0)
        if cls == "BANK_HARD_DECLINE" and entry.get("action_taken") in ("RETRY_DELAYED", "RETRY_IMMEDIATE"):
            false_interventions += 1

    # False intervention cost: count × avg amount × 2% bank fee
    avg_amount = total_amount / total if total > 0 else 0
    false_intervention_cost = round(false_interventions * avg_amount * 0.02, 2)

    recovery_rate = round((recovered / total * 100), 2) if total > 0 else 0.0

    report = {
        "run_id": str(uuid.uuid4()),
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_transactions": total,
        "processed": total,
        "by_failure_class": dict(by_class),
        "recovered": recovered,
        "recovery_rate_pct": recovery_rate,
        "human_review_queue": human_review,
        "escalated": escalated,
        "false_interventions": false_interventions,
        "false_intervention_cost_inr": false_intervention_cost,
        "anomaly_flagged_count": len(anomaly_result.get("flagged_transaction_ids", [])),
        "batch_halted": anomaly_result.get("halt", False),
        "halt_reason": anomaly_result.get("halt_reason"),
        "exceptions": exceptions,
        "nl_summary": nl_summary,
    }

    # Save to file
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    return report


def load_report() -> dict | None:
    """Load the saved report, if it exists."""
    if not os.path.exists(REPORT_PATH):
        return None
    with open(REPORT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)
