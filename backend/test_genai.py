import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print("Key prefix:", api_key[:5] if api_key else "None")
genai.configure(api_key=api_key)
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(m.name)

model = genai.GenerativeModel("gemini-1.5-flash")
try:
    res = model.generate_content("hello")
    print("1.5-flash Success!")
except Exception as e:
    print("1.5-flash failed:", type(e).__name__, e)
