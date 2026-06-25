import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # AI Backends
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")

    # Abilities
    WEB_SEARCH_PROVIDER = os.getenv("WEB_SEARCH_PROVIDER", "duckduckgo")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID", "")

    # Voice
    VOICE_ENABLED = os.getenv("VOICE_ENABLED", "false").lower() == "true"
    WAKE_WORD = os.getenv("WAKE_WORD", "jarvis")

    @classmethod
    def available_backends(cls):
        backends = []
        if cls.OPENAI_API_KEY:
            backends.append("openai")
        if cls.ANTHROPIC_API_KEY:
            backends.append("anthropic")
        # Ollama is always available as a candidate
        backends.append("ollama")
        return backends
