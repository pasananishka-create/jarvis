import json
from pathlib import Path
from typing import Optional

MEMORY_FILE = Path.home() / ".jarvis_memory.json"


class Memory:
    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self.conversation: list[dict] = []
        self.system_prompt: Optional[str] = None
        self._load()

    def _load(self):
        if MEMORY_FILE.exists():
            try:
                data = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
                self.conversation = data.get("conversation", [])
                self.system_prompt = data.get("system_prompt")
            except (json.JSONDecodeError, KeyError):
                self.conversation = []

    def save(self):
        data = {
            "conversation": self.conversation[-self.max_history * 2:],
            "system_prompt": self.system_prompt,
        }
        MEMORY_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def set_system_prompt(self, prompt: str):
        self.system_prompt = prompt

    def add_user(self, text: str):
        self.conversation.append({"role": "user", "content": text})
        self._trim()

    def add_assistant(self, text: str, tool_calls=None):
        msg = {"role": "assistant", "content": text}
        if tool_calls:
            msg["tool_calls"] = tool_calls
        self.conversation.append(msg)
        self._trim()

    def add_tool_result(self, tool_call_id: str, name: str, result: str):
        self.conversation.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": name,
            "content": result,
        })
        self._trim()

    def get_messages(self) -> list[dict]:
        msgs = []
        if self.system_prompt:
            msgs.append({"role": "system", "content": self.system_prompt})
        msgs.extend(self.conversation)
        return msgs

    def clear(self):
        self.conversation.clear()
        self.save()

    def _trim(self):
        if len(self.conversation) > self.max_history:
            self.conversation = self.conversation[-self.max_history:]
