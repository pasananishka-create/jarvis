import asyncio
import logging

from rich.console import Console
from rich.markdown import Markdown

logger = logging.getLogger("jarvis.cli.ask")


def ask_cmd(question: str | None, backend: str | None, verbose: bool):
    """Ask a single question and get an answer."""
    if not question:
        from cli.banner import print_banner
        print_banner()
        print("Usage: jarvis ask \"your question here\"")
        return

    console = Console()
    from core.assistant import Assistant
    assistant = Assistant()
    if backend:
        result = assistant.switch_backend(backend)
        if verbose:
            console.print(f"[dim]{result}[/dim]")

    if verbose:
        console.print(f"[dim]Backend: {assistant.brain.active_name}[/dim]")

    try:
        response = asyncio.run(assistant.process_message(question))
        console.print(Markdown(response))
    except Exception as e:
        logger.exception("Error processing question")
        console.print(f"[red]Error:[/red] {e}")
