import logging
from abc import ABC, abstractmethod
from typing import Optional

from config import Config

logger = logging.getLogger("jarvis.brain")


class AIBackend(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...


class OpenAIBackend(AIBackend):
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)

    @property
    def name(self):
        return f"openai ({Config.OPENAI_MODEL})"

    def chat(self, messages, tools=None):
        kwargs = dict(model=Config.OPENAI_MODEL, messages=messages)
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
    def __init__(self):
        import anthropic
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    @property
    def name(self):
        return f"anthropic ({Config.ANTHROPIC_MODEL})"

    def chat(self, messages, tools=None):
        system = None
        api_messages = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                api_messages.append({"role": m["role"], "content": m["content"]})

        kwargs = dict(
            model=Config.ANTHROPIC_MODEL,
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
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(
            base_url=Config.NVIDIA_BASE_URL,
            api_key=Config.NVIDIA_API_KEY,
        )

    @property
    def name(self):
        return f"nvidia ({Config.NVIDIA_MODEL})"

    def chat(self, messages, tools=None):
        kwargs = dict(model=Config.NVIDIA_MODEL, messages=messages)
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


class OllamaBackend(AIBackend):
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(
            base_url=f"{Config.OLLAMA_HOST}/v1",
            api_key="ollama",
        )

    @property
    def name(self):
        return f"ollama ({Config.OLLAMA_MODEL})"

    def chat(self, messages, tools=None):
        kwargs = dict(model=Config.OLLAMA_MODEL, messages=messages)
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
        if Config.OPENAI_API_KEY:
            self.backends["openai"] = OpenAIBackend()
        if Config.ANTHROPIC_API_KEY:
            self.backends["anthropic"] = AnthropicBackend()
        if Config.NVIDIA_API_KEY:
            self.backends["nvidia"] = NvidiaBackend()
        self.backends["ollama"] = OllamaBackend()

        if "openai" in self.backends:
            self._active = "openai"
        elif "nvidia" in self.backends:
            self._active = "nvidia"
        elif "anthropic" in self.backends:
            self._active = "anthropic"
        else:
            self._active = "ollama"

    @property
    def active(self) -> AIBackend:
        return self.backends[self._active]

    @property
    def active_name(self) -> str:
        return self.active.name

    def switch_to(self, name: str) -> bool:
        if name in self.backends:
            self._active = name
            logger.info("Switched to %s backend: %s", name, self.active.name)
            return True
        logger.warning("Backend '%s' not available", name)
        return False

    def list_backends(self) -> list[str]:
        return list(self.backends.keys())

    def chat(self, messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
        return self.active.chat(messages, tools)
