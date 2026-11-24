import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
ROOT_DIR = Path(__file__).resolve().parent.parent
env_path = ROOT_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Required keys check
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
if not TAVILY_API_KEY:
    raise EnvironmentError("Missing required environment variable: TAVILY_API_KEY")

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "").lower()
if not LLM_PROVIDER:
    if MISTRAL_API_KEY:
        LLM_PROVIDER = "mistral"
    elif GROQ_API_KEY:
        LLM_PROVIDER = "groq"
    else:
        LLM_PROVIDER = "mistral"

if LLM_PROVIDER == "mistral":
    if not MISTRAL_API_KEY:
        raise EnvironmentError("Missing required environment variable: MISTRAL_API_KEY (for LLM_PROVIDER=mistral)")
elif LLM_PROVIDER == "groq":
    if not GROQ_API_KEY:
        raise EnvironmentError("Missing required environment variable: GROQ_API_KEY (for LLM_PROVIDER=groq)")
else:
    raise ValueError(f"Unsupported LLM_PROVIDER '{LLM_PROVIDER}'. Must be 'mistral' or 'groq'.")

# Model configuration
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "open-mistral-7b")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
CRITIC_MODEL = os.getenv("CRITIC_MODEL", None)

# Pipeline configuration
MAX_REVISIONS = int(os.getenv("MAX_REVISIONS", "2"))
TRUST_THRESHOLD = int(os.getenv("TRUST_THRESHOLD", "90"))

# Database & CORS
DATABASE_URL = os.getenv("DATABASE_URL", None)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
