# Razorpay Payment Failure Triage Agent + PayLoop

**AI-powered batch payment failure recovery and settlement intelligence system for D2C merchants.**

Built for the Razorpay Buildathon — Track 03: AI Revenue Recovery.

---

## What it does

This project implements three distinct intelligence layers to solve critical D2C payment workflows that Razorpay doesn't handle out of the box:

### 1. Payment Failure Triage
A merchant has 200 failed Razorpay transactions. This agent:
- **Classifies** each failure using a rule-based + ML pipeline.
- **Decides** the right recovery action (retry, remind, escalate).
- **Executes** the action against Razorpay APIs.
- **Shows** the merchant exactly what happened in real-time.

### 2. Webhook Guardian (PayLoop)
A customer completes payment, but the webhook to create the order fails silently. 
- **Cross-checks** every captured payment against the order database.
- **Auto-creates** orders where money arrived but the webhook failed.
- **Flags** unrecoverable payments where contact info is missing.

### 3. Settlement Reconciler (PayLoop)
Maps Razorpay settlement batches back to orders and flags accounting gaps.
- **Detects** phantom refunds, fee calculation errors, and missing settlements using deterministic accounting rules.
- **Explains** every single gap in plain English using Gemini 1.5 Flash.
- **Generates** a 3-sentence weekly digest summary.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Tailwind)                   │
│  [ Triage Agent ] │ [ Webhook Guardian ] │ [ Settlement Recon ]  │
│                               ↕ WebSocket                        │
├──────────────────────────────────────────────────────────────────┤
│                    FastAPI Backend (:8000)                       │
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────────┐  │
│  │   Triage Loop   │ │ Webhook Guardian│ │ Settlement Recon.  │  │
│  │ (Rules + SKLearn) │ (Order Store)   │ │ (Accounting Logic) │  │
│  └─────────────────┘ └─────────────────┘ └────────────────────┘  │
│           │                   │                    │             │
│           └──────────┬────────┴─────────┬──────────┘             │
│                      ▼                  ▼                        │
│                ┌───────────┐      ┌────────────┐                 │
│                │ Razorpay  │      │ Summarizer │                 │
│                │ API Mock  │      │ (Gemini AI)│                 │
│                └───────────┘      └────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Engineering Decisions

### Why NOT an LLM for classification or reconciliation?
The core classification and reconciliation logic is **deterministic**, deliberately avoiding LLMs:
- **Determinism:** Arithmetic rules and dictionary lookups never hallucinate.
- **Latency:** <1ms per transaction vs 2000ms for an LLM.
- **Cost:** Free vs $0.01+ per transaction.

### Where AI IS used
AI is used where it **genuinely adds value**:
- **Natural language explanations**: Gemini 1.5 Flash generates plain English summaries for complex accounting gaps, making it understandable for non-technical D2C merchants.
- **Batch Summarization**: Generates a 3-sentence executive summary.
*(Note: If the Gemini API fails, robust hardcoded fallbacks are used. AI never blocks the core pipeline).*

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm

### Setup

```bash
# Clone and enter the project
cd razorpay

# Backend setup
cd backend
pip install -r requirements.txt
python data_generator.py       # generates 200 synthetic transactions
python classifier.py           # trains ML fallback model
cd ..

# Frontend setup
cd frontend
npm install
cd ..
```

### Run

**Terminal 1 — Backend**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser. Use the tabs to navigate between the Triage Agent, Webhook Guardian, and Settlement Reconciler!

### Environment Variables

Copy `.env.example` to `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_MODE` | `true` | Use mock Razorpay APIs (no real API calls) |
| `RAZORPAY_KEY_ID` | — | Razorpay test mode API key |
| `RAZORPAY_KEY_SECRET` | — | Razorpay test mode API secret |
| `GEMINI_API_KEY` | — | Google Gemini API key for NL summaries |

---

## License

Built for the Razorpay Buildathon 2024. Educational use.
