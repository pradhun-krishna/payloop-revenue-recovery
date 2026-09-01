"""
Anomaly Detector — Z-Score Based
==================================
Runs before recovery decisions. Two independent checks:

1. FRAUD_SPIKE: If FRAUD_BLOCK transactions exceed 20% of batch → halt batch.
   This simulates detecting a possible abuse ring or compromised credentials.

2. AMOUNT_ANOMALY: Flag individual transactions where amount > mean + 2.5σ.
   These are not blocked — just flagged for the audit trail and dashboard.
"""

import numpy as np
from collections import Counter


FRAUD_THRESHOLD_PCT = 0.20  # 20% — batch halts above this
AMOUNT_Z_THRESHOLD = 2.5    # Standard deviations above mean


def run_anomaly_check(transactions: list[dict]) -> dict:
    """
    Analyze the batch for anomalies before recovery processing.

    Args:
        transactions: list of transaction dicts with 'failure_code' and 'amount'

    Returns:
        {
            "halt": bool,
            "halt_reason": str or None,
            "flagged_transaction_ids": [list of anomaly-flagged txn ids],
            "fraud_pct": float
        }
    """
    n = len(transactions)
    if n == 0:
        return {
            "halt": False,
            "halt_reason": None,
            "flagged_transaction_ids": [],
            "fraud_pct": 0.0,
        }

    # -----------------------------------------------------------------------
    # Check 1: Fraud spike detection
    # -----------------------------------------------------------------------
    failure_counts = Counter(txn.get("failure_code", "") for txn in transactions)
    fraud_count = failure_counts.get("FRAUD_BLOCK", 0)
    fraud_pct = fraud_count / n

    halt = fraud_pct > FRAUD_THRESHOLD_PCT
    halt_reason = None
    if halt:
        halt_reason = (
            f"Fraud spike detected: {fraud_count} of {n} transactions "
            f"({fraud_pct:.1%}) flagged as FRAUD_BLOCK — "
            f"possible abuse ring or compromised merchant credentials"
        )

    # -----------------------------------------------------------------------
    # Check 2: Amount anomaly detection (Z-score)
    # -----------------------------------------------------------------------
    amounts = np.array([txn.get("amount", 0) for txn in transactions], dtype=float)
    mean_amount = np.mean(amounts)
    std_amount = np.std(amounts)

    flagged_ids = []
    if std_amount > 0:
        for txn in transactions:
            amount = txn.get("amount", 0)
            z_score = (amount - mean_amount) / std_amount
            if z_score > AMOUNT_Z_THRESHOLD:
                flagged_ids.append(txn["transaction_id"])
                # Store z-score on the transaction for downstream use
                txn["_z_score"] = round(z_score, 2)
                txn["anomaly_flagged"] = True

    return {
        "halt": halt,
        "halt_reason": halt_reason,
        "flagged_transaction_ids": flagged_ids,
        "fraud_pct": round(fraud_pct * 100, 1),
    }
