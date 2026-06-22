import os
from config import Config


def get_llm(temperature: int = 0, max_retries: int = 2):
    if Config.USE_LOCAL_LLM:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            base_url=Config.LOCAL_LLM_URL,
            api_key="not-needed",
            model=Config.LOCAL_LLM_MODEL,
            temperature=temperature,
            max_retries=max_retries,
        )
    else:
        from langchain_groq import ChatGroq
        os.environ["GROQ_API_KEY"] = Config.GROQ_AI_KEY
        return ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=temperature,
            max_tokens=None,
            timeout=None,
            max_retries=max_retries,
        )
