import asyncio
import logging
import sys
from core.assistant import Assistant

logger = logging.getLogger("jarvis.cli")

BANNER = r"""
   ╔══════════════════════════════════╗
   ║        J.A.R.V.I.S.              ║
   ║  Just A Rather Very Intelligent  ║
   ║         System                   ║
   ╚══════════════════════════════════╝
"""

HELP_TEXT = """
Commands:
  /help        - Show this help
  /abilities   - List available abilities
  /backend     - Show current AI backend
  /backend:<n> - Switch backend (e.g., /backend:openai)
  /clear       - Clear conversation history
  /exit        - Exit Jarvis

Or just type your question/message to chat.
"""


class CLI:
    def __init__(self):
        self.assistant = Assistant()

    def print_banner(self):
        print(BANNER)
        print(f"  Backend: {self.assistant.brain.active_name}")
        print(f"  Abilities: {len(self.assistant.abilities)} loaded")
        print(HELP_TEXT)

    async def handle_command(self, text: str) -> bool:
        cmd = text.strip().lower()

        if cmd in ("/exit", "/quit"):
            print("Goodbye.")
            return False

        if cmd == "/help":
            print(HELP_TEXT)
            return True

        if cmd == "/abilities":
            print(self.assistant.list_abilities())
            return True

        if cmd == "/backend":
            print(f"Active: {self.assistant.brain.active_name}")
            print(f"Available: {', '.join(self.assistant.brain.list_backends())}")
            return True

        if cmd.startswith("/backend:"):
            name = cmd.split(":", 1)[1].strip()
            print(self.assistant.switch_backend(name))
            return True

        if cmd == "/clear":
            self.assistant.memory.clear()
            print("Conversation cleared.")
            return True

        return None

    async def run(self):
        self.print_banner()

        while True:
            try:
                user_input = input("\nYou: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nGoodbye.")
                break

            if not user_input:
                continue

            handled = await self.handle_command(user_input)
            if handled is False:
                break
            if handled is True:
                continue

            print("\nJarvis: ", end="", flush=True)
            try:
                response = await self.assistant.process_message(user_input)
                print(response)
            except Exception as e:
                print(f"Error: {e}")
                logger.exception("Error processing message")


def start():
    asyncio.run(CLI().run())
