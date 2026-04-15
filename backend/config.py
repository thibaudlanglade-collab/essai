import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# find_dotenv() searches current dir and all parent dirs automatically
_dotenv_path = find_dotenv(usecwd=False) or (Path(__file__).parent.parent / ".env")
load_dotenv(_dotenv_path)

OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")

if not OPENAI_API_KEY:
    import warnings
    warnings.warn(f"OPENAI_API_KEY is not set (looked in {_dotenv_path}). LLM skills will fail.", stacklevel=1)

_extra_origins = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
] + [o.strip() for o in _extra_origins.split(",") if o.strip()]
