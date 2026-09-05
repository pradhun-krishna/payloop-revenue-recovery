import json
import os
import random
import string
from datetime import datetime, timezone

TRANSACTIONS_FILE = os.path.join(os.path.dirname(__file__), "synthetic_transactions.json")

PRODUCTS = [
    "Classic Kurta", "Linen Shirt", "Cotton Saree",
    "Ethnic Jacket", "Printed Dupatta", "Silk Blouse"
]

def _generate_order_id() -> str:
    return "ORD_" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

def create_order_from_payment(payment: dict) -> dict:
    """Helper to auto-create an order from a payment record."""
    return {
        "order_id": _generate_order_id(),
        "razorpay_payment_id": payment["transaction_id"],
        "amount_inr": payment["amount"] / 100,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "customer_name": payment.get("customer_name", "Unknown Customer"),
        "customer_email": payment.get("customer_email", "unknown@example.com"),
        "customer_phone": payment.get("customer_phone", "0000000000"),
        "product": random.choice(PRODUCTS),
        "quantity": random.randint(1, 3),
        "webhook_received": False,
        "guardian_recovered": True,
        "is_demo_simulation": payment.get("is_demo_simulation", False)
    }

def _initialize_order_store() -> dict:
    """
    Simulates a merchant's order database.
    Loads the 200 synthetic transactions. For 80% of them, generates an order.
    The remaining 20% simulate silent webhook failures (payment exists, order does not).
    """
    if not os.path.exists(TRANSACTIONS_FILE):
        return {}

    with open(TRANSACTIONS_FILE, "r", encoding="utf-8") as f:
        transactions = json.load(f)

    store = {}
    
    # Deterministic randomness for reproducible results
    rng = random.Random(42)

    for txn in transactions:
        # Simulate 80% success rate for webhooks
        if rng.random() < 0.8:
            store[txn["transaction_id"]] = {
                "order_id": _generate_order_id(),
                "razorpay_payment_id": txn["transaction_id"],
                "amount_inr": txn["amount"] / 100,
                "status": rng.choice(["created", "fulfilled"]),
                "created_at": txn["created_at"],
                "customer_name": txn.get("customer_name", "Unknown"),
                "customer_email": txn.get("customer_email", ""),
                "customer_phone": txn.get("customer_phone", ""),
                "product": rng.choice(PRODUCTS),
                "quantity": rng.randint(1, 3),
                "webhook_received": True,
                "guardian_recovered": False
            }
        else:
            # 20% webhook failure: order does not exist in store.
            # To test unrecoverable logic, randomly strip customer info for 10% of failures
            if rng.random() < 0.1:
                txn["customer_email"] = ""
                txn["customer_phone"] = ""

    return store

# Singleton order store
order_store = _initialize_order_store()

def get_all_orders() -> dict:
    return order_store

def reset_store():
    global order_store
    order_store = _initialize_order_store()
