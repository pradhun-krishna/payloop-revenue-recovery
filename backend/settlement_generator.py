import json
import os
import random
import string
from datetime import datetime, timedelta, timezone

TRANSACTIONS_FILE = os.path.join(os.path.dirname(__file__), "synthetic_transactions.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "synthetic_settlements.json")

def generate_settlements():
    if not os.path.exists(TRANSACTIONS_FILE):
        return []

    with open(TRANSACTIONS_FILE, "r", encoding="utf-8") as f:
        transactions = json.load(f)

    # Use deterministic random for reproducible gaps
    rng = random.Random(101)
    
    # Select 60% of payments to be settled
    all_payment_ids = [t["transaction_id"] for t in transactions]
    settled_count = int(len(all_payment_ids) * 0.6)
    settled_ids = rng.sample(all_payment_ids, settled_count)

    # The remaining 40% are missing from settlement.
    # The reconciler expects about 15% missing, but that's fine, the math will just flag them.

    # Split settled IDs into 3 batches
    batch_size = len(settled_ids) // 3
    batches = [
        settled_ids[0:batch_size],
        settled_ids[batch_size:batch_size*2],
        settled_ids[batch_size*2:]
    ]

    settlements = []
    now = datetime.now(timezone.utc)

    for i, batch in enumerate(batches):
        gross_amount = 0
        for pid in batch:
            txn = next(t for t in transactions if t["transaction_id"] == pid)
            gross_amount += txn["amount"] / 100

        gross_amount = round(gross_amount, 2)
        fee = round(gross_amount * 0.02, 2)
        gst = round(fee * 0.18, 2)
        refunds = 0.0
        
        net_amount = round(gross_amount - fee - gst - refunds, 2)

        s = {
            "settlement_id": "setl_" + "".join(rng.choices(string.ascii_letters + string.digits, k=10)),
            "settled_at": (now - timedelta(days=7 - i*2)).isoformat(),
            "settlement_utr": "UTR" + "".join(rng.choices(string.digits, k=15)),
            "cycle": "T+2" if i < 2 else "T+3",
            "payment_ids_included": batch,
            "gross_amount_inr": gross_amount,
            "razorpay_fee_inr": fee,
            "gst_on_fee_inr": gst,
            "refunds_deducted_inr": refunds,
            "net_amount_inr": net_amount
        }
        settlements.append(s)

    # Plant specific gaps required by prompt

    # Gap 1: Phantom Refund in first settlement
    settlements[0]["refunds_deducted_inr"] = 1499.00
    settlements[0]["net_amount_inr"] -= 1499.00

    # Gap 2: Fee calculation error in second settlement (net amount off by ₹200)
    settlements[1]["net_amount_inr"] -= 200.00

    # Gap 3: Unmatched payment in third settlement (payment ID that doesn't exist)
    settlements[2]["payment_ids_included"].append("pay_INVALID123456")
    settlements[2]["payment_ids_included"].append("pay_INVALID654321")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(settlements, f, indent=2)

    return settlements

if __name__ == "__main__":
    generate_settlements()
    print("synthetic_settlements.json generated.")
