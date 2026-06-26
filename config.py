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

    # NVIDIA NIM
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")
    NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

    # Fallback chain: models to try for each backend (most capable first)
    NVIDIA_FALLBACK_MODELS = [
        os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct"),
        "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        "meta/llama-3.3-70b-instruct",
        "meta/llama-3.1-8b-instruct",
    ]

    # Backend priority: fall through if one fails
    BACKEND_PRIORITY = ["nvidia", "anthropic", "openai", "ollama"]

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
        for name in cls.BACKEND_PRIORITY:
            if name == "openai" and cls.OPENAI_API_KEY:
                backends.append(name)
            elif name == "anthropic" and cls.ANTHROPIC_API_KEY:
                backends.append(name)
            elif name == "nvidia" and cls.NVIDIA_API_KEY:
                backends.append(name)
            elif name == "ollama":
                backends.append(name)
        return backends
