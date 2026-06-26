import asyncio
import json
import logging
from typing import Optional

from core.brain import Brain
from core.memory import Memory
from abilities.base import Ability

logger = logging.getLogger("jarvis.assistant")


class Assistant:
    SYSTEM_PROMPT = """You are J.A.R.V.I.S. — a mission-capable AI intelligence system. Formal, precise, and direct. You do not speculate. You do not embellish. You state facts and execute tasks.

You have access to the following systems:
- web_search: Real-time information retrieval
- run_command: System command execution / application launch
- run_python: Python code execution in a sandboxed environment
- record_audio: Microphone capture with speech-to-text transcription
- speak_text: Text-to-speech output through system speakers
- screen_capture: Screen image capture

Protocols:
- Utilise tools when external data or system interaction is required
- Responses must be concise and factual. No unnecessary pleasantries
- On tool failure, attempt an alternative approach before reporting
- Multiple tool calls may be chained sequentially when warranted
- State your intended action before executing a tool call
- Current date is available when temporal context is needed
- Your primary function is to serve. Anticipate needs. Deliver results."""

    def __init__(self):
        self.brain = Brain()
        self.memory = Memory()
        self.memory.set_system_prompt(self.SYSTEM_PROMPT)
        self.abilities: dict[str, Ability] = {}
        self._register_builtins()

    def _register_builtins(self):
        from abilities.web_search import WebSearch
        from abilities.system_control import RunCommand
        from abilities.code_helper import RunPython
        from abilities.voice import RecordAudio, SpeakText
        from abilities.screen_capture import ScreenCapture
        for ability in [WebSearch(), RunCommand(), RunPython(), RecordAudio(), SpeakText(), ScreenCapture()]:
            self.abilities[ability.name] = ability

    def register_ability(self, ability: Ability):
        self.abilities[ability.name] = ability
        logger.info("Registered ability: %s", ability.name)

    def _get_tool_defs(self) -> list[dict]:
        return [a.to_tool_definition() for a in self.abilities.values()]

    async def _execute_tool(self, name: str, args: str) -> str:
        ability = self.abilities.get(name)
        if not ability:
            return f"Error: No ability named '{name}'"
        try:
            kwargs = json.loads(args) if isinstance(args, str) else args
            result = await ability.execute(**kwargs)
            return str(result)
        except Exception as e:
            return f"Error executing {name}: {e}"

    async def process_message(self, user_input: str) -> str:
        self.memory.add_user(user_input)
        self.memory.save()

        messages = self.memory.get_messages()

        response_text_parts = []
        max_turns = 5

        for turn in range(max_turns):
            try:
                result = await asyncio.to_thread(
                    self.brain.chat,
                    messages,
                    self._get_tool_defs(),
                )
            except Exception as e:
                logger.error("Brain error: %s", e)
                return f"Sorry, I encountered an error: {e}"

            content = result.get("content", "") or ""
            tool_calls = result.get("tool_calls")

            if content:
                response_text_parts.append(content)

            if not tool_calls:
                break

            self.memory.add_assistant(content, tool_calls)

            for tc in tool_calls:
                fn_name = tc["function"]["name"]
                fn_args = tc["function"]["arguments"]
                logger.info("Tool call: %s(%s)", fn_name, fn_args)
                tool_result = await self._execute_tool(fn_name, fn_args)
                self.memory.add_tool_result(
                    tool_call_id=tc.get("id", ""),
                    name=fn_name,
                    result=tool_result,
                )
                messages = self.memory.get_messages()

        final_text = " ".join(part for part in response_text_parts if part).strip()

        if not final_text:
            final_text = "I've completed the task."

        self.memory.add_assistant(final_text)
        self.memory.save()
        return final_text

    def switch_backend(self, name: str) -> str:
        if self.brain.switch_to(name):
            return f"Switched to {self.brain.active_name}"
        available = ", ".join(self.brain.list_backends())
        return f"Backend '{name}' not available. Options: {available}"

    def list_abilities(self) -> str:
        if not self.abilities:
            return "No abilities registered."
        lines = ["Available abilities:"]
        for name, ab in self.abilities.items():
            lines.append(f"  {name}: {ab.description}")
        return "\n".join(lines)
