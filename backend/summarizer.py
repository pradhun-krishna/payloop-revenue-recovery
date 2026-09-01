"""
NL Summarizer — Gemini API Integration
=========================================
This is the ONLY place in the entire pipeline where generative AI is used.

Why here and not elsewhere:
- Classification is rule-based (deterministic, fast, explainable)
- Anomaly detection is statistical (Z-score)
- Recovery actions are hard-coded lookup tables

But a natural language summary of a batch report IS a genuine use case for an LLM:
the input is structured data, the output is prose, and slight variation is acceptable.

Uses gemini-1.5-flash for cost efficiency. Falls back to a hardcoded summary
if the API call fails — this step must NEVER block the pipeline.
"""

import os
import json

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

FALLBACK_SUMMARY = (
    "Batch processing complete. The agent classified and triaged all transactions "
    "using rule-based classification. Transactions requiring human review or security "
    "escalation have been flagged in the exceptions panel. Review the detailed breakdown "
    "above for recovery actions taken per failure class."
)


async def generate_nl_summary(report: dict) -> str:
    """
    Generate a 3-sentence plain English summary of the batch report using Gemini.

    Args:
        report: The full report dict from reporter.py

    Returns:
        Natural language summary string
    """
    if not GEMINI_API_KEY:
        return FALLBACK_SUMMARY

    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Build a concise prompt with the key report data
        report_excerpt = {
            "total_transactions": report.get("total_transactions"),
            "recovered": report.get("recovered"),
            "recovery_rate_pct": report.get("recovery_rate_pct"),
            "human_review_queue": report.get("human_review_queue"),
            "escalated": report.get("escalated"),
            "batch_halted": report.get("batch_halted"),
            "halt_reason": report.get("halt_reason"),
            "by_failure_class": report.get("by_failure_class"),
            "anomaly_flagged_count": report.get("anomaly_flagged_count"),
            "false_interventions": report.get("false_interventions"),
        }

        prompt = (
            "You are a payment operations assistant. Summarize this batch processing "
            "report in exactly 3 sentences for a merchant dashboard. Be direct and "
            "factual. Mention: (1) what happened in this batch, (2) what the agent "
            "recovered, (3) what needs human attention. Do NOT use markdown or bullet "
            "points — just plain sentences.\n\n"
            f"Report data:\n{json.dumps(report_excerpt, indent=2)}"
        )

        response = model.generate_content(prompt)
        summary = response.text.strip()

        # Sanity check: if response is empty or too short, use fallback
        if len(summary) < 20:
            return FALLBACK_SUMMARY

        return summary

    except Exception as e:
        # Never let the summarizer block the pipeline
        print(f"[summarizer] Gemini call failed: {e} — using fallback summary")
        return FALLBACK_SUMMARY

async def explain_gaps_with_gemini(gaps: list, orders: dict) -> list:
    """Single API call. Batch all gaps. Return plain_english per gap_id."""
    if not GEMINI_API_KEY:
        return _fallback_gap_explanations(gaps)

    prompt = f"""
You are explaining Razorpay payment settlement issues to a small D2C merchant 
in India who sells fashion products online. They are non-technical.
Write exactly one plain English sentence per gap. Be specific with amounts and 
order details where available. No jargon. No bullet points.

Gaps:
{json.dumps(gaps, indent=2)}

Orders context:
{json.dumps(list(orders.values())[:20], indent=2)}

Return ONLY valid JSON. No markdown. No explanation. Just this:
[{{"gap_id": "GAP_001", "plain_english": "sentence here"}}]
"""
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        explanations = json.loads(text.strip())
        for gap in gaps:
            match = next((e for e in explanations if e["gap_id"] == gap["gap_id"]), None)
            if match:
                gap["plain_english"] = match["plain_english"]
        return gaps
    except Exception as e:
        print(f"[summarizer] Gemini gap explanation failed: {e}")
        return _fallback_gap_explanations(gaps)


def _fallback_gap_explanations(gaps: list) -> list:
    fallbacks = {
        "MISSING_FROM_SETTLEMENT": "This payment is not in any settlement this week and will likely appear in the next cycle.",
        "PHANTOM_REFUND": "A refund was deducted from your settlement but does not match any order in the system.",
        "FEE_CALCULATION_ERROR": "The fees deducted from this settlement do not match the expected 2% plus GST calculation.",
        "UNMATCHED_PAYMENT": "This payment appears in your settlement but cannot be matched to any order."
    }
    for gap in gaps:
        gap["plain_english"] = fallbacks.get(gap["type"], "This gap needs manual review.")
    return gaps


async def generate_settlement_summary(settlements, matched, gaps, pending) -> str:
    if not GEMINI_API_KEY:
        return _fallback_settlement_summary(settlements, matched, gaps, pending)
        
    prompt = f"""
Write a 3-sentence plain English weekly payment summary for a D2C merchant.
Sentence 1: what came in this week (total, how many orders).
Sentence 2: what gaps or issues were found.
Sentence 3: what needs their attention right now.

Data:
- Settlements: {len(settlements)}, Net total: ₹{sum(s['net_amount_inr'] for s in settlements):,.2f}
- Orders matched: {len(matched)}
- Gaps found: {len(gaps)}
- Orders pending settlement: {len(pending)}
- High severity gaps: {len([g for g in gaps if g.get('severity') == 'high'])}

Write directly. No intro. No "Here is your summary". Just the 3 sentences.
"""
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[summarizer] Gemini settlement summary failed: {e}")
        return _fallback_settlement_summary(settlements, matched, gaps, pending)

def _fallback_settlement_summary(settlements, matched, gaps, pending) -> str:
    high_sev = len([g for g in gaps if g.get('severity') == 'high'])
    return (
        f"This week {len(settlements)} settlements were processed covering "
        f"{len(matched)} orders. {len(gaps)} gaps were detected requiring "
        f"attention. {high_sev} high severity issues need immediate review."
    )
