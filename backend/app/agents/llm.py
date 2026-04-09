"""
Shared LLM instance — Google Gemini via LangChain.
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    google_api_key=settings.google_api_key,
    temperature=0.4,
    convert_system_message_to_human=True,
)
