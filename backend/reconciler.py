"""
Settlement Reconciler

Maps every payment in every settlement back to an order.
Flags gaps using deterministic arithmetic and dict lookups.
No ML. No AI. Reconciliation rules are accounting rules.

AI is used exactly once: a single batched Gemini call to generate
plain English explanations for detected gaps.
"""

import uuid
from datetime import datetime, timezone
from summarizer import explain_gaps_with_gemini, generate_settlement_summary

async def run_reconciliation(settlements: list, payments: list, orders: dict) -> dict:
    gaps = []
    matched = []
    pending = []
    gap_counter = 1

    all_settled_payment_ids = set()
    for s in settlements:
        all_settled_payment_ids.update(s["payment_ids_included"])

    for s in settlements:
        # check fee calculation
        expected_fee = round(s["gross_amount_inr"] * 0.02, 2)
        expected_gst = round(expected_fee * 0.18, 2)
        expected_net = round(
            s["gross_amount_inr"] - expected_fee - expected_gst - s["refunds_deducted_inr"], 2
        )
        if abs(expected_net - s["net_amount_inr"]) > 1.0:
            gaps.append({
                "gap_id": f"GAP_{gap_counter:03d}",
                "type": "FEE_CALCULATION_ERROR",
                "severity": "high",
                "amount_inr": abs(expected_net - s["net_amount_inr"]),
                "settlement_id": s["settlement_id"],
                "payment_id": None,
                "order_id": None,
                "plain_english": None,
                "suggested_action": "Contact Razorpay support with settlement ID"
            })
            gap_counter += 1

        for pay_id in s["payment_ids_included"]:
            payment = next((p for p in payments if p["transaction_id"] == pay_id), None)
            
            if not payment:
                gaps.append({
                    "gap_id": f"GAP_{gap_counter:03d}",
                    "type": "UNMATCHED_PAYMENT",
                    "severity": "medium",
                    "amount_inr": 0,
                    "settlement_id": s["settlement_id"],
                    "payment_id": pay_id,
                    "order_id": None,
                    "plain_english": None,
                    "suggested_action": "Verify payment ID in Razorpay dashboard"
                })
                gap_counter += 1
                continue

            order = orders.get(pay_id)
            if order:
                matched.append({"payment_id": pay_id, "order_id": order["order_id"]})
        
        # check refunds
        if s["refunds_deducted_inr"] > 0:
            # verify refund matches an order
            refund_matched = any(
                o.get("status") == "cancelled" 
                for o in orders.values()
                if o.get("razorpay_payment_id") in s["payment_ids_included"]
            )
            if not refund_matched:
                gaps.append({
                    "gap_id": f"GAP_{gap_counter:03d}",
                    "type": "PHANTOM_REFUND",
                    "severity": "high",
                    "amount_inr": s["refunds_deducted_inr"],
                    "settlement_id": s["settlement_id"],
                    "payment_id": None,
                    "order_id": None,
                    "plain_english": None,
                    "suggested_action": "Raise dispute with Razorpay — refund has no matching order"
                })
                gap_counter += 1

    # payments not in any settlement
    for p in payments:
        if p["transaction_id"] not in all_settled_payment_ids:
            order = orders.get(p["transaction_id"])
            amount = p.get("amount", 0) / 100
            pending.append({
                "payment_id": p["transaction_id"],
                "order_id": order["order_id"] if order else None,
                "amount_inr": amount,
                "product": order["product"] if order else "Unknown",
                "is_demo_simulation": p.get("is_demo_simulation", False)
            })
            gaps.append({
                "gap_id": f"GAP_{gap_counter:03d}",
                "type": "MISSING_FROM_SETTLEMENT",
                "severity": "low",
                "amount_inr": amount,
                "settlement_id": None,
                "payment_id": p["transaction_id"],
                "order_id": order["order_id"] if order else None,
                "plain_english": None,
                "suggested_action": "Expected in next T+2 or T+3 settlement cycle",
                "is_demo_simulation": p.get("is_demo_simulation", False)
            })
            gap_counter += 1

    # single batched Gemini call for all gap explanations
    gaps = await explain_gaps_with_gemini(gaps, orders)
    nl_summary = await generate_settlement_summary(settlements, matched, gaps, pending)

    return {
        "reconciliation_id": str(uuid.uuid4()),
        "run_at": datetime.now(timezone.utc).isoformat(),
        "period": "Last 7 days",
        "settlements_processed": len(settlements),
        "total_gross_inr": sum(s["gross_amount_inr"] for s in settlements),
        "total_fees_inr": sum(s["razorpay_fee_inr"] + s["gst_on_fee_inr"] for s in settlements),
        "total_net_inr": sum(s["net_amount_inr"] for s in settlements),
        "total_orders_matched": len(matched),
        "gaps": gaps,
        "orders_pending_settlement": pending,
        "summary_table": [
            {
                "settlement_id": s["settlement_id"],
                "settled_at": s["settled_at"],
                "cycle": s["cycle"],
                "gross_inr": s["gross_amount_inr"],
                "net_inr": s["net_amount_inr"],
                "orders_count": len([
                    p for p in s["payment_ids_included"] 
                    if orders.get(p)
                ]),
                "gaps_count": len([g for g in gaps if g["settlement_id"] == s["settlement_id"]]),
                "status": "clean" if not any(
                    g["settlement_id"] == s["settlement_id"] for g in gaps
                ) else "gaps_found"
            }
            for s in settlements
        ],
        "nl_summary": nl_summary
    }
