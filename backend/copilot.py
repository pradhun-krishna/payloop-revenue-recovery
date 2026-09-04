import os
import json
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

async def ask_copilot(query: str, state_context: dict) -> str:
    """
    Answers a merchant's query using the live agent state and report data.
    """
    if not GEMINI_API_KEY:
        return "I need a valid Gemini API key in the backend `.env` file to answer your questions!"

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-3.6-flash")

        prompt = f"""
You are the PayLoop AI Copilot, a financial and operational assistant for a D2C merchant in India.
The merchant is asking you a question about their business based on the current live data in their dashboard.

Rules:
1. Answer concisely and professionally.
2. If the data is not in the context, tell them you don't have that information.
3. Keep it brief. 1-2 short paragraphs max. No markdown tables.

Current System Context:
{json.dumps(state_context, indent=2)}

Merchant Query: {query}
"""
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[copilot] Chat failed: {e}")
        return "I encountered an error trying to process your request. Please ensure the Gemini API key is correct."


async def draft_recovery_email(transaction: dict) -> str:
    """
    Drafts a personalized recovery email for a specific failed transaction.
    """
    if not GEMINI_API_KEY:
        return "Please add a valid Gemini API key to use the generative email feature."

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-3.6-flash")

        prompt = f"""
You are an expert D2C customer success manager. A customer's payment just failed.
Draft a short, empathetic email to recover this sale. 
It should sound human, not robotic.

Customer Name: {transaction.get('customer_name', 'Customer')}
Failed Product: {transaction.get('product', 'your item')}
Cart Value: ₹{transaction.get('amount', 0) / 100}
Failure Reason: {transaction.get('failure_class', 'payment failure')}
Agent Action Taken: {transaction.get('action_result', 'flagged for review')}

Rules:
1. Subject line included at the top as "Subject: ..."
2. 3-4 sentences max.
3. Empathize with the failure reason (e.g. if it's a network timeout, say "looks like the internet hiccuped").
4. Provide a clear call to action to try again.
5. Do not include placeholders like [Your Name] - just sign off as "The PayLoop Team".
"""
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[copilot] Draft email failed: {e}")
        return "Error generating email. Please check API key."
