import logging
from abc import ABC, abstractmethod
from typing import Optional

from config import Config

logger = logging.getLogger("jarvis.brain")


class AIBackend(ABC):
    fallback_models: list[str] = []

    @abstractmethod
    def chat(self, messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def current_model(self) -> str:
        ...

    @abstractmethod
    def available_models(self) -> list[dict]:
        """Return list of {id, name, provider} for this backend."""
        ...

    def switch_model(self, model_id: str) -> bool:
        available = [m["id"] for m in self.available_models()]
        if model_id in available:
            self._current_model = model_id
            logger.info("%s switched to model: %s", self.__class__.__name__, model_id)
            return True
        # Allow switching even if not in API list (custom/local models)
        logger.warning("Model '%s' not in API list, trying anyway", model_id)
        self._current_model = model_id
        return True

    def chat_with_fallback(self, messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
        models_to_try = self.fallback_models or [self._current_model]
        last_error = None

        if tools and models_to_try:
            model = models_to_try[0]
            try:
                self._current_model = model
                logger.info("Trying %s with model %s (with tools)", self.__class__.__name__, model)
                return self.chat(messages, tools)
            except Exception as e:
                logger.warning("Model %s with tools failed: %s", model, e)
                last_error = e

        text_messages = []
        for m in messages:
            if m["role"] in ("tool",):
                continue
            if m["role"] == "system":
                text_messages.append({
                    "role": "system",
                    "content": "You are Jarvis, a helpful AI assistant. Answer concisely in plain text. Do NOT use any functions, tools, or special formatting.",
                })
            else:
                entry = dict(m)
                entry.pop("tool_calls", None)
                text_messages.append(entry)
        for model in models_to_try:
            try:
                self._current_model = model
                logger.info("Trying %s with model %s (text-only)", self.__class__.__name__, model)
                return self.chat(text_messages, tools=None)
            except Exception as e:
                logger.warning("Model %s (text-only) failed: %s", model, e)
                last_error = e
        raise last_error or RuntimeError(f"{self.__class__.__name__}: all models exhausted")


class OpenAIBackend(AIBackend):
    fallback_models = [Config.OPENAI_MODEL]

    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self._current_model = Config.OPENAI_MODEL
        self._models_cache: Optional[list[dict]] = None

    @property
    def name(self):
        return f"openai ({self._current_model})"

    @property
    def current_model(self):
        return self._current_model

    def available_models(self) -> list[dict]:
        if self._models_cache is None:
            try:
                resp = self.client.models.list()
                self._models_cache = [
                    {"id": m.id, "name": m.id, "provider": "openai"}
                    for m in resp
                    if not m.id.startswith("ft:")
                ]
            except Exception:
                self._models_cache = [{"id": Config.OPENAI_MODEL, "name": Config.OPENAI_MODEL, "provider": "openai"}]
        return self._models_cache

    def chat(self, messages, tools=None):
        kwargs = dict(model=self._current_model, messages=messages)
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        resp = self.client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        result = {"role": "assistant", "content": msg.content or ""}
        if msg.tool_calls:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ]
        return result


class AnthropicBackend(AIBackend):
    fallback_models = [Config.ANTHROPIC_MODEL]

    def __init__(self):
        import anthropic
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
        self._current_model = Config.ANTHROPIC_MODEL

    @property
    def name(self):
        return f"anthropic ({self._current_model})"

    @property
    def current_model(self):
        return self._current_model

    def available_models(self) -> list[dict]:
        return [
            {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "provider": "anthropic"},
            {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
            {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "provider": "anthropic"},
            {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "provider": "anthropic"},
            {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "provider": "anthropic"},
        ]

    def chat(self, messages, tools=None):
        system = None
        api_messages = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                api_messages.append({"role": m["role"], "content": m["content"]})

        kwargs = dict(
            model=self._current_model,
            max_tokens=4096,
            messages=api_messages,
        )
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = [
                {
                    "name": t["function"]["name"],
                    "description": t["function"].get("description", ""),
                    "input_schema": t["function"]["parameters"],
                }
                for t in tools
            ]

        resp = self.client.messages.create(**kwargs)
        content = []
        tool_calls = []
        for block in resp.content:
            if block.type == "text":
                content.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "function": {"name": block.name, "arguments": str(block.input)},
                })

        result = {"role": "assistant", "content": "".join(content)}
        if tool_calls:
            result["tool_calls"] = tool_calls
        return result


class NvidiaBackend(AIBackend):
    fallback_models = Config.NVIDIA_FALLBACK_MODELS

    def chat_with_fallback(self, messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
        text_messages = []
        for m in messages:
            if m["role"] in ("tool",):
                continue
            if m["role"] == "system":
                text_messages.append({
                    "role": "system",
                    "content": "You are Jarvis, a helpful AI assistant. Answer concisely in plain text. Do NOT use any functions, tools, or special formatting.",
                })
            else:
                entry = dict(m)
                entry.pop("tool_calls", None)
                text_messages.append(entry)
        models_to_try = self.fallback_models or [self._current_model]
        last_error = None
        for model in models_to_try:
            try:
                self._current_model = model
                logger.info("NVIDIA text-only with model %s", model)
                return self.chat(text_messages, tools=None)
            except Exception as e:
                logger.warning("NVIDIA %s failed: %s", model, e)
                last_error = e
                continue
        raise last_error or RuntimeError(f"{self.__class__.__name__}: all models exhausted")

    def __init__(self):
        import httpx
        self._client = httpx.Client(
            base_url=Config.NVIDIA_BASE_URL,
            headers={
                "Authorization": f"Bearer {Config.NVIDIA_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=120,
        )
        self._current_model = Config.NVIDIA_MODEL
        self._models_cache: Optional[list[dict]] = None

    @property
    def name(self):
        return f"nvidia ({self._current_model})"

    @property
    def current_model(self):
        return self._current_model

    def available_models(self) -> list[dict]:
        if self._models_cache is None:
            try:
                resp = self._client.get("/models")
                if resp.status_code == 200:
                    data = resp.json()
                    self._models_cache = [
                        {"id": m["id"], "name": m.get("display_name", m["id"]), "provider": "nvidia"}
                        for m in data.get("data", [])
                    ]
                else:
                    raise RuntimeError(f"HTTP {resp.status_code}")
            except Exception:
                self._models_cache = [
                    {"id": m, "name": m.replace("meta/", "").replace("mistralai/", "").replace("nvidia/", "").replace("-instruct", "").replace("-ultra", "").replace("-70b", "").replace("-8b", ""), "provider": "nvidia"}
                    for m in Config.NVIDIA_FALLBACK_MODELS + [Config.NVIDIA_MODEL]
                ]
                seen = set()
                self._models_cache = [m for m in self._models_cache if not (m["id"] in seen or seen.add(m["id"]))]
        return self._models_cache

    def chat(self, messages, tools=None):
        body: dict = {"model": self._current_model, "messages": messages}
        if tools:
            simplified = []
            for t in tools:
                fn = t["function"]
                simplified.append({
                    "type": "function",
                    "function": {
                        "name": fn["name"],
                        "description": fn.get("description", ""),
                        "parameters": fn["parameters"],
                    },
                })
            body["tools"] = simplified
            body["tool_choice"] = "auto"

        resp = self._client.post("/chat/completions", json=body)
        if resp.status_code != 200:
            raise RuntimeError(
                f"NVIDIA API error: {resp.status_code} - {resp.text[:500]}"
            )

        data = resp.json()
        choice = data["choices"][0]
        msg = choice["message"]

        result = {"role": "assistant", "content": msg.get("content") or ""}
        raw_calls = msg.get("tool_calls")
        if raw_calls:
            result["tool_calls"] = [
                {
                    "id": tc["id"],
                    "function": {"name": tc["function"]["name"], "arguments": tc["function"]["arguments"]},
                }
                for tc in raw_calls
            ]
        return result


class OllamaBackend(AIBackend):
    fallback_models = [Config.OLLAMA_MODEL]

    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(
            base_url=f"{Config.OLLAMA_HOST}/v1",
            api_key="ollama",
        )
        self._current_model = Config.OLLAMA_MODEL
        self._models_cache: Optional[list[dict]] = None

    @property
    def name(self):
        return f"ollama ({self._current_model})"

    @property
    def current_model(self):
        return self._current_model

    def available_models(self) -> list[dict]:
        if self._models_cache is None:
            try:
                resp = self.client.models.list()
                self._models_cache = [
                    {"id": m.id, "name": m.id, "provider": "ollama"}
                    for m in resp
                ]
            except Exception:
                self._models_cache = [{"id": Config.OLLAMA_MODEL, "name": Config.OLLAMA_MODEL, "provider": "ollama"}]
        return self._models_cache

    def chat(self, messages, tools=None):
        kwargs = dict(model=self._current_model, messages=messages)
        if tools:
            simplified = []
            for t in tools:
                fn = t["function"]
                simplified.append({
                    "type": "function",
                    "function": {
                        "name": fn["name"],
                        "description": fn.get("description", ""),
                        "parameters": fn["parameters"],
                    },
                })
            kwargs["tools"] = simplified
            kwargs["tool_choice"] = "auto"

        resp = self.client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        result = {"role": "assistant", "content": msg.content or ""}
        if msg.tool_calls:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ]
        return result


class Brain:
    def __init__(self):
        self.backends: dict[str, AIBackend] = {}
        self._active: Optional[str] = None
        self._init_backends()

    def _init_backends(self):
        for name in Config.BACKEND_PRIORITY:
            if name == "openai" and Config.OPENAI_API_KEY:
                self.backends["openai"] = OpenAIBackend()
            elif name == "anthropic" and Config.ANTHROPIC_API_KEY:
                self.backends["anthropic"] = AnthropicBackend()
            elif name == "nvidia" and Config.NVIDIA_API_KEY:
                self.backends["nvidia"] = NvidiaBackend()
            elif name == "ollama":
                self.backends["ollama"] = OllamaBackend()

        for name in Config.BACKEND_PRIORITY:
            if name in self.backends:
                self._active = name
                break
        if not self._active and self.backends:
            self._active = list(self.backends.keys())[0]

    @property
    def active(self) -> AIBackend:
        return self.backends[self._active]

    @property
    def active_name(self) -> str:
        b = self.active
        return f"{self._active} ({getattr(b, 'current_model', 'unknown')})"

    def switch_to(self, name: str) -> bool:
        if name in self.backends:
            self._active = name
            logger.info("Switched to backend: %s", self.active_name)
            return True
        logger.warning("Backend '%s' not available", name)
        return False

    def switch_model(self, backend_name: str, model_id: str) -> bool:
        backend = self.backends.get(backend_name)
        if not backend:
            logger.warning("Backend '%s' not found", backend_name)
            return False
        return backend.switch_model(model_id)

    def list_backends(self) -> list[str]:
        return list(self.backends.keys())

    def list_all_models(self) -> dict[str, list[dict]]:
        return {name: be.available_models() for name, be in self.backends.items()}

    def chat(self, messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
        backends_to_try = [self._active] + [
            n for n in Config.BACKEND_PRIORITY if n in self.backends and n != self._active
        ]
        last_error = None
        for name in backends_to_try:
            backend = self.backends[name]
            try:
                result = backend.chat_with_fallback(messages, tools)
                if name != self._active:
                    logger.info("Auto-fellback from %s to %s", self._active, name)
                    self._active = name
                return result
            except Exception as e:
                last_error = e
                logger.error("Backend %s completely failed: %s", name, e)
                continue
        raise last_error or RuntimeError("All backends exhausted")
