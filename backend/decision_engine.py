"""
Decision Engine — Deterministic Recovery Action Mapper
=======================================================
Maps each failure class to a specific recovery action.

This is a hard-coded, fully deterministic mapping. No AI, no ML, no randomness.
The mapping encodes domain knowledge about Razorpay payment failures:

- NETWORK_TIMEOUT → retry after delay (transient network issues resolve themselves)
- INSUFFICIENT_FUNDS → remind customer (give them time to add funds)
- BANK_HARD_DECLINE → human review (retrying wastes money and worsens decline rates)
- CARD_EXPIRY → send update link (customer needs to provide new card details)
- UPI_TIMEOUT → retry immediately (UPI timeouts are often transient)
- FRAUD_BLOCK → escalate and halt (never retry fraudulent transactions)
"""


RECOVERY_ACTIONS: dict[str, dict] = {
    "NETWORK_TIMEOUT": {
        "action": "RETRY_DELAYED",
        "description": "Retry payment after 15-minute window",
        "retry_after_minutes": 15,
        "api_call": "POST /payments/{id}/retry",
    },
    "INSUFFICIENT_FUNDS_USER": {
        "action": "SEND_REMINDER",
        "description": "Send payment reminder to customer via SMS and email",
        "retry_after_minutes": None,
        "api_call": "POST /payments/{id}/notify",
    },
    "BANK_HARD_DECLINE": {
        "action": "HUMAN_REVIEW",
        "description": (
            "Flag for human review. Do not retry — retrying a hard decline "
            "wastes merchant money and may worsen decline rate."
        ),
        "retry_after_minutes": None,
        "api_call": None,
    },
    "CARD_EXPIRY": {
        "action": "SEND_UPDATE_LINK",
        "description": "Send Razorpay payment link for customer to update card details",
        "retry_after_minutes": None,
        "api_call": "POST /payment_links",
    },
    "UPI_TIMEOUT": {
        "action": "RETRY_IMMEDIATE",
        "description": "Retry UPI collect request immediately",
        "retry_after_minutes": 0,
        "api_call": "POST /payments/{id}/retry",
    },
    "FRAUD_BLOCK": {
        "action": "ESCALATE_AND_HALT",
        "description": "STOP. Do not retry. Flag for security team review. Log separately.",
        "retry_after_minutes": None,
        "api_call": None,
    },
    "USER_ABANDONED": {
        "action": "SEND_RECOVERY_EMAIL",
        "description": "Trigger AI Copilot to draft and send tailored cart recovery email with 1-click retry link",
        "retry_after_minutes": None,
        "api_call": "POST /payment_links/abandoned_cart",
    },
}

# Fallback for any unrecognized failure class
DEFAULT_ACTION = {
    "action": "HUMAN_REVIEW",
    "description": "Unknown failure class — flagged for manual review",
    "retry_after_minutes": None,
    "api_call": None,
}


def get_recovery_action(failure_class: str) -> dict:
    """
    Get the deterministic recovery action for a given failure class.

    Args:
        failure_class: The classified failure type (e.g. "NETWORK_TIMEOUT")

    Returns:
        Action dict with 'action', 'description', 'retry_after_minutes', 'api_call'
    """
    return RECOVERY_ACTIONS.get(failure_class, DEFAULT_ACTION)
