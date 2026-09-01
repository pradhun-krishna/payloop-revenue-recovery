"""
Agent Loop — Core Pipeline
============================
The heart of the triage system. Processes transactions sequentially —
not as a batch map, but as a deliberate agent that can pause, decide, and escalate.

This is intentionally sequential: a real agent makes one decision at a time,
logs it, and broadcasts it before moving on. This enables real-time frontend
visualization and gives the agent the ability to halt mid-batch.
"""

import asyncio
import json
import os
from typing import Callable, Awaitable

from classifier import classify, train_model
from anomaly_detector import run_anomaly_check
from decision_engine import get_recovery_action
from razorpay_client import razorpay_client, MOCK_MODE
import audit_logger
from reporter import generate_report
from summarizer import generate_nl_summary


# Type alias for the WebSocket broadcaster callback
Broadcaster = Callable[[dict], Awaitable[None]] | None

DATA_PATH = os.path.join(os.path.dirname(__file__), "synthetic_transactions.json")


async def execute_action(action: dict, txn: dict) -> dict:
    """
    Execute a recovery action against the Razorpay client.

    Args:
        action: Recovery action dict from decision engine
        txn: The transaction being processed

    Returns:
        API result dict with 'success' key
    """
    action_type = action.get("action", "")
    payment_id = txn.get("transaction_id", "")

    if action_type in ("RETRY_DELAYED", "RETRY_IMMEDIATE"):
        return await razorpay_client.retry_payment(payment_id, amount=txn.get("amount", 50000))

    elif action_type == "SEND_REMINDER":
        return await razorpay_client.send_reminder(payment_id)

    elif action_type == "SEND_UPDATE_LINK":
        return await razorpay_client.send_payment_link(
            amount=txn.get("amount", 50000),
            customer_email=txn.get("customer_email", "customer@example.com"),
            customer_phone=txn.get("customer_phone", "9876543210"),
            customer_name=txn.get("customer_name", "Customer"),
        )

    elif action_type in ("HUMAN_REVIEW", "ESCALATE_AND_HALT"):
        # No API call — these are flagged for human intervention
        return {"success": False, "skipped": True, "reason": action.get("description", "")}

    return {"success": False, "error": f"Unknown action type: {action_type}"}


def _determine_action_result(action: dict, api_result: dict, failure_class: str) -> str:
    """Map the API result to a human-readable action result string."""
    action_type = action.get("action", "")

    if action_type == "ESCALATE_AND_HALT":
        return "escalated"
    elif action_type == "HUMAN_REVIEW":
        return "human_review"
    elif api_result.get("skipped"):
        return "skipped"
    elif api_result.get("success"):
        return "success"
    else:
        return "failed"


async def run_agent(
    transactions: list[dict],
    broadcaster: Broadcaster = None,
    state: dict | None = None,
) -> tuple[dict, str]:
    """
    Core agent loop. Processes transactions one-by-one with real-time broadcasting.

    Args:
        transactions: List of transaction dicts to process
        broadcaster: Optional async callback to broadcast events via WebSocket
        state: Mutable dict for tracking agent status (shared with FastAPI)

    Returns:
        (report, nl_summary) tuple
    """
    if state is None:
        state = {}

    state["status"] = "running"
    state["processed"] = 0
    state["total"] = len(transactions)
    state["recovered"] = 0
    state["flagged"] = 0

    # Clear previous audit log for fresh run
    audit_logger.clear()

    # Ensure ML model is trained before we start
    try:
        train_model(transactions)
    except Exception as e:
        print(f"[agent] Warning: ML model training failed: {e}")

    # -----------------------------------------------------------------------
    # Step 1: Run anomaly check on entire batch
    # -----------------------------------------------------------------------
    anomaly_result = run_anomaly_check(transactions)
    state["flagged"] = len(anomaly_result.get("flagged_transaction_ids", []))

    if anomaly_result["halt"]:
        # We don't change state["status"] to "halted" here, because the loop is still processing.
        # If we did, a client could spawn a second concurrent background run.
        if broadcaster:
            await broadcaster({
                "type": "BATCH_HALT",
                "reason": anomaly_result["halt_reason"],
                "fraud_pct": anomaly_result.get("fraud_pct", 0),
                "flagged_count": len(anomaly_result.get("flagged_transaction_ids", [])),
            })

    flagged_ids = set(anomaly_result.get("flagged_transaction_ids", []))

    # -----------------------------------------------------------------------
    # Step 2: Process each transaction sequentially
    # -----------------------------------------------------------------------
    results = []

    for txn in transactions:
        txn_id = txn.get("transaction_id", "unknown")
        is_anomaly = txn_id in flagged_ids

        # 2a. Classify the failure
        failure_class, classifier_stage = classify(txn)

        # 2b. Determine recovery action
        if failure_class == "FRAUD_BLOCK" and anomaly_result["halt"]:
            # Fraud-blocked transaction in a halted batch — escalate, don't retry
            action = get_recovery_action("FRAUD_BLOCK")
            action_result = "escalated"
            api_result = {"success": False, "skipped": True}
            api_endpoint = None
        else:
            action = get_recovery_action(failure_class)
            # 2c. Execute the recovery action
            api_result = await execute_action(action, txn)
            action_result = _determine_action_result(action, api_result, failure_class)
            api_endpoint = action.get("api_call", "").replace("{id}", txn_id) if action.get("api_call") else None

        # 2d. Build and log audit entry
        log_entry = audit_logger.build_audit_entry(
            txn=txn,
            failure_class=failure_class,
            action=action,
            action_result=action_result,
            classifier_stage=classifier_stage,
            api_endpoint=api_endpoint if not (failure_class == "FRAUD_BLOCK" and anomaly_result["halt"]) else None,
            mock_mode=MOCK_MODE,
            anomaly_flagged=is_anomaly,
            reason=action.get("description", ""),
        )
        await audit_logger.append(log_entry)

        # 2e. Update state counters
        state["processed"] = state.get("processed", 0) + 1
        if action_result == "success":
            state["recovered"] = state.get("recovered", 0) + 1

        # 2f. Broadcast to frontend via WebSocket
        if broadcaster:
            z_score = txn.get("_z_score")
            await broadcaster({
                "type": "TXN_PROCESSED",
                "data": {
                    **log_entry,
                    "amount_inr": round(txn.get("amount", 0) / 100, 2),
                    "payment_method": txn.get("payment_method", ""),
                    "customer_name": txn.get("customer_name", ""),
                    "failure_reason": txn.get("failure_reason", ""),
                    "z_score": z_score,
                },
            })

            # Broadcast anomaly flag if applicable
            if is_anomaly:
                await broadcaster({
                    "type": "ANOMALY_FLAG",
                    "transaction_id": txn_id,
                    "amount_inr": round(txn.get("amount", 0) / 100, 2),
                    "z_score": z_score,
                })

        # Small delay so frontend can show real-time processing
        await asyncio.sleep(0.3)

        results.append(log_entry)

    # -----------------------------------------------------------------------
    # Step 3: Generate report and NL summary
    # -----------------------------------------------------------------------
    nl_summary = await generate_nl_summary(
        {
            "total_transactions": len(results),
            "recovered": state.get("recovered", 0),
            "recovery_rate_pct": round(state.get("recovered", 0) / len(results) * 100, 2) if results else 0,
            "human_review_queue": sum(1 for r in results if r.get("action_result") == "human_review"),
            "escalated": sum(1 for r in results if r.get("action_result") == "escalated"),
            "batch_halted": anomaly_result.get("halt", False),
            "halt_reason": anomaly_result.get("halt_reason"),
            "by_failure_class": {},  # will be computed by reporter
            "anomaly_flagged_count": len(flagged_ids),
            "false_interventions": 0,
        }
    )

    report = generate_report(results, anomaly_result, nl_summary)

    # Update final state
    if anomaly_result["halt"]:
        state["status"] = "halted"
    else:
        state["status"] = "complete"

    # Broadcast completion
    if broadcaster:
        await broadcaster({
            "type": "BATCH_COMPLETE",
            "report": report,
        })

    return report, nl_summary
