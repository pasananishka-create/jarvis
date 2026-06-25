import asyncio
import json
import logging
from typing import Optional

from core.brain import Brain
from core.memory import Memory
from abilities.base import Ability

logger = logging.getLogger("jarvis.assistant")


class Assistant:
    SYSTEM_PROMPT = """You are Jarvis — an intelligent AI personal assistant. You are helpful, capable, and precise.

You have access to tools/abilities that let you interact with the world:
- web_search: Search the web for current information
- run_command: Execute system commands / open applications
- run_python: Run Python code snippets

Guidelines:
- Use tools whenever you need real-time or external information
- Be concise but thorough in your responses
- If a tool returns an error, try an alternative approach
- You can chain multiple tool calls when needed
- Always inform the user what you're doing before/after tool calls
- The current date is available — use it when context requires"""

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
        for ability in [WebSearch(), RunCommand(), RunPython()]:
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
