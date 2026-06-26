import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

MEMORY_DIR = Path.home() / ".jarvis"
DEFAULT_SESSION = "default"


def _ensure_dir():
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)


def _session_path(name: str) -> Path:
    return MEMORY_DIR / f"{name}.json"


def list_sessions() -> list[dict]:
    _ensure_dir()
    sessions = []
    for f in MEMORY_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            sessions.append({
                "name": f.stem,
                "messages": len(data.get("conversation", [])),
                "updated": data.get("updated", ""),
            })
        except (json.JSONDecodeError, KeyError):
            sessions.append({"name": f.stem, "messages": 0, "updated": ""})
    return sorted(sessions, key=lambda s: s["name"])


def delete_session(name: str) -> bool:
    p = _session_path(name)
    if p.exists():
        p.unlink()
        return True
    return False


class Memory:
    def __init__(self, max_history: int = 50, session: str = DEFAULT_SESSION):
        self.max_history = max_history
        self.session = session
        self.memory_file = _session_path(session)
        self.conversation: list[dict] = []
        self.system_prompt: Optional[str] = None
        self._load()

    def _load(self):
        _ensure_dir()
        if self.memory_file.exists():
            try:
                data = json.loads(self.memory_file.read_text(encoding="utf-8"))
                self.conversation = data.get("conversation", [])
                self.system_prompt = data.get("system_prompt")
            except (json.JSONDecodeError, KeyError):
                self.conversation = []

    def save(self):
        _ensure_dir()
        data = {
            "conversation": self.conversation[-self.max_history * 2:],
            "system_prompt": self.system_prompt,
            "updated": datetime.now(timezone.utc).isoformat(),
        }
        self.memory_file.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    def switch_session(self, name: str):
        self.save()
        self.session = name
        self.memory_file = _session_path(name)
        self.conversation = []
        self.system_prompt = None
        self._load()

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
