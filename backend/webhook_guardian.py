"""
Webhook Guardian

Cross-checks every captured payment against the order store.
If payment exists in Razorpay but no order exists in our system,
it is a webhook failure — not a payment failure. The money arrived.
The order didn't. These are different problems requiring different solutions.

Recovery: auto-create the missing order, mark guardian_recovered=True.
Unrecoverable: payments where both email and phone are missing.
"""

import asyncio
from datetime import datetime, timezone
from order_store import order_store, create_order_from_payment

async def run_webhook_check(payments: list, broadcaster=None) -> dict:
    failures = []
    recovered = []
    unrecoverable = []

    for payment in payments:
        order = order_store.get(payment["transaction_id"])
        
        if order:
            continue  # matched, skip
            
        # webhook failure detected
        failures.append(payment)

        # Check if unrecoverable (missing contact info)
        if not payment.get("customer_email") and not payment.get("customer_phone"):
            unrecoverable.append({
                "payment_id": payment["transaction_id"],
                "amount_inr": payment["amount"] / 100,
                "reason": "Cannot auto-create order — customer contact info missing"
            })
        else:
            # auto-create order
            new_order = create_order_from_payment(payment)
            order_store[payment["transaction_id"]] = new_order
            recovered.append(new_order)
            
            if broadcaster:
                await broadcaster({
                    "type": "WEBHOOK_RECOVERY",
                    "data": {
                        "payment_id": payment["transaction_id"],
                        "order_id": new_order["order_id"],
                        "amount_inr": new_order["amount_inr"],
                        "product": new_order["product"],
                        "customer_name": new_order["customer_name"],
                        "action": "Order auto-created by Guardian",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "is_demo_simulation": new_order.get("is_demo_simulation", False)
                    }
                })
        
        await asyncio.sleep(0.2)  # pacing for live UI feel

    return {
        "total_payments_checked": len(payments),
        "orders_matched": len(payments) - len(failures),
        "webhook_failures_detected": len(recovered) + len(unrecoverable),
        "webhook_failures_recovered": len(recovered),
        "unrecoverable": len(unrecoverable),
        "revenue_at_risk_inr": sum(r["amount_inr"] for r in recovered) + 
                               sum(u["amount_inr"] for u in unrecoverable),
        "revenue_recovered_inr": sum(r["amount_inr"] for r in recovered),
        "recovered_orders": recovered,
        "unrecoverable_list": unrecoverable
    }
