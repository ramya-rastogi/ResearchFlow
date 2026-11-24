import os
from .config import (
    LLM_PROVIDER,
    MISTRAL_API_KEY,
    GROQ_API_KEY,
    MISTRAL_MODEL,
    GROQ_MODEL,
    CRITIC_MODEL,
)

def get_llm(role: str = "writer"):
    """
    Factory function to return configured LLM instance.
    Optionally returns CRITIC_MODEL if role is 'critic' and CRITIC_MODEL is set.
    """
    if LLM_PROVIDER == "mistral":
        from langchain_mistralai import ChatMistralAI
        model_name = CRITIC_MODEL if (role == "critic" and CRITIC_MODEL) else MISTRAL_MODEL
        return ChatMistralAI(
            model=model_name,
            temperature=0,
            mistral_api_key=MISTRAL_API_KEY
        )
    elif LLM_PROVIDER == "groq":
        from langchain_groq import ChatGroq
        model_name = CRITIC_MODEL if (role == "critic" and CRITIC_MODEL) else GROQ_MODEL
        return ChatGroq(
            model=model_name,
            temperature=0,
            groq_api_key=GROQ_API_KEY
        )
    else:
        raise ValueError(f"Unknown LLM provider: {LLM_PROVIDER}")
