"""
Synthetic Transaction Generator
================================
Generates 200 realistic failed Razorpay transactions for the triage agent to process.

Failure distribution is deliberately skewed: FRAUD_BLOCK at 22% to trigger the
anomaly detector's batch halt threshold (>20%).
"""

import json
import random
import string
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TOTAL_TRANSACTIONS = 200

FAILURE_DISTRIBUTION = {
    "NETWORK_TIMEOUT": 0.25,
    "INSUFFICIENT_FUNDS_USER": 0.20,
    "BANK_HARD_DECLINE": 0.18,
    "FRAUD_BLOCK": 0.22,
    "CARD_EXPIRY": 0.08,
    "UPI_TIMEOUT": 0.07,
}

FAILURE_REASONS = {
    "NETWORK_TIMEOUT": "Gateway did not respond within timeout window",
    "INSUFFICIENT_FUNDS_USER": "Customer account has insufficient funds",
    "BANK_HARD_DECLINE": "Transaction declined by issuing bank",
    "FRAUD_BLOCK": "Transaction flagged by fraud risk engine",
    "CARD_EXPIRY": "Card has expired or expiry date is invalid",
    "UPI_TIMEOUT": "UPI collect request timed out",
}

PAYMENT_METHODS = ["card", "upi", "netbanking"]
PAYMENT_WEIGHTS = [0.40, 0.35, 0.25]

# Realistic Indian first and last names
FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Sai", "Arnav",
    "Dhruv", "Kabir", "Ananya", "Diya", "Isha", "Kavya", "Myra", "Saanvi",
    "Aanya", "Priya", "Riya", "Neha", "Rohan", "Karan", "Vikram", "Rahul",
    "Amit", "Sneha", "Pooja", "Meera", "Lakshmi", "Deepa", "Suresh", "Ramesh",
    "Ganesh", "Harsha", "Nisha", "Tanvi", "Shreya", "Akash", "Nikhil", "Manish",
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Nair",
    "Iyer", "Joshi", "Mehta", "Shah", "Das", "Chatterjee", "Mukherjee",
    "Banerjee", "Pillai", "Menon", "Rao", "Desai", "Kulkarni", "Patil",
    "Bhat", "Agarwal", "Mishra", "Pandey", "Tiwari", "Saxena", "Kapoor",
    "Malhotra",
]

EMAIL_DOMAINS = [
    "gmail.com", "yahoo.co.in", "outlook.com", "hotmail.com",
    "rediffmail.com", "protonmail.com",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_transaction_id() -> str:
    """Generate a Razorpay-style payment ID: pay_ + 14 alphanumeric chars."""
    chars = string.ascii_letters + string.digits
    return "pay_" + "".join(random.choices(chars, k=14))


def generate_phone() -> str:
    """Generate a realistic Indian mobile number starting with 9."""
    return "9" + "".join(str(random.randint(0, 9)) for _ in range(9))


def generate_email(first_name: str, last_name: str) -> str:
    """Generate a realistic email from a name."""
    separators = [".", "_", ""]
    sep = random.choice(separators)
    suffix = random.randint(1, 999) if random.random() > 0.5 else ""
    domain = random.choice(EMAIL_DOMAINS)
    return f"{first_name.lower()}{sep}{last_name.lower()}{suffix}@{domain}"


def generate_timestamp_spread(n: int, days_back: int = 7) -> list[str]:
    """Generate n ISO timestamps spread over the last `days_back` days."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days_back)
    timestamps = []
    for _ in range(n):
        random_offset = random.uniform(0, days_back * 86400)
        ts = start + timedelta(seconds=random_offset)
        timestamps.append(ts.isoformat())
    timestamps.sort()
    return timestamps


def build_failure_codes(n: int) -> list[str]:
    """
    Build a list of exactly n failure codes following the target distribution.
    Uses round-then-adjust to hit exactly n items.
    """
    codes = []
    items = list(FAILURE_DISTRIBUTION.items())

    # Compute counts, rounding down
    counts = {code: int(pct * n) for code, pct in items}
    remainder = n - sum(counts.values())

    # Distribute remainder by largest fractional part
    fractions = {code: (pct * n) - counts[code] for code, pct in items}
    for code in sorted(fractions, key=fractions.get, reverse=True)[:remainder]:
        counts[code] += 1

    for code, count in counts.items():
        codes.extend([code] * count)

    random.shuffle(codes)
    return codes


# ---------------------------------------------------------------------------
# Main Generator
# ---------------------------------------------------------------------------

def generate_transactions(n: int = TOTAL_TRANSACTIONS) -> list[dict]:
    """Generate n synthetic failed transactions."""
    failure_codes = build_failure_codes(n)
    timestamps = generate_timestamp_spread(n)

    transactions = []
    for i in range(n):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        failure_code = failure_codes[i]

        txn = {
            "transaction_id": generate_transaction_id(),
            "amount": random.randint(10000, 500000),  # paise: ₹100–₹5000
            "currency": "INR",
            "failure_code": failure_code,
            "failure_reason": FAILURE_REASONS[failure_code],
            "payment_method": random.choices(PAYMENT_METHODS, weights=PAYMENT_WEIGHTS, k=1)[0],
            "merchant_id": "merchant_razorpay_demo",
            "customer_email": generate_email(first, last),
            "customer_phone": generate_phone(),
            "created_at": timestamps[i],
            "attempt_count": random.choice([1, 1, 1, 2]),  # mostly first attempt
            "customer_name": f"{first} {last}",
        }
        transactions.append(txn)

    return transactions


if __name__ == "__main__":
    import os

    txns = generate_transactions()
    output_path = os.path.join(os.path.dirname(__file__), "synthetic_transactions.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(txns, f, indent=2, ensure_ascii=False)

    # Print distribution summary
    from collections import Counter
    dist = Counter(t["failure_code"] for t in txns)
    print(f"Generated {len(txns)} transactions -> {output_path}")
    for code, count in sorted(dist.items(), key=lambda x: -x[1]):
        print(f"  {code}: {count} ({count/len(txns)*100:.1f}%)")
