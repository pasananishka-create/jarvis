import asyncio
import logging

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table
from rich import box

from cli.banner import print_banner

logger = logging.getLogger("jarvis.cli.chat")

HELP_TEXT = """
[bold]Commands:[/bold]
  [cyan]/help[/cyan]        - Show this help
  [cyan]/abilities[/cyan]   - List available abilities
  [cyan]/backend[/cyan]     - Show current AI backend
  [cyan]/backend:<n>[/cyan] - Switch backend (e.g., /backend:openai)
  [cyan]/clear[/cyan]       - Clear conversation history
  [cyan]/session[/cyan]     - Show current session info
  [cyan]/exit[/cyan]        - Exit Jarvis

Or just type your message to chat.
"""


def chat_cmd(backend: str | None, no_banner: bool):
    """Start an interactive chat session."""
    console = Console()

    if not no_banner:
        print_banner(console)

    from core.assistant import Assistant
    assistant = Assistant()
    if backend:
        result = assistant.switch_backend(backend)
        console.print(f"[dim]{result}[/dim]")

    status = Table.grid(padding=(0, 1))
    status.add_column()
    status.add_row(
        f"[bold cyan]Backend:[/bold cyan] {assistant.brain.active_name}  "
        f"[bold cyan]Abilities:[/bold cyan] {len(assistant.abilities)} loaded"
    )
    console.print(Panel(status, border_style="dim"))

    while True:
        try:
            user_input = console.input("\n[bold green]You>[/bold green] ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[dim]Goodbye.[/dim]")
            break

        if not user_input:
            continue

        cmd = user_input.strip().lower()

        if cmd in ("/exit", "/quit", "/q"):
            console.print("[dim]Goodbye.[/dim]")
            break

        if cmd == "/help":
            console.print(HELP_TEXT)
            continue

        if cmd == "/abilities":
            if not assistant.abilities:
                console.print("[yellow]No abilities registered.[/yellow]")
            else:
                table = Table(show_header=True, box=box.SIMPLE)
                table.add_column("Ability", style="cyan")
                table.add_column("Description")
                for name, ab in assistant.abilities.items():
                    table.add_row(name, ab.description)
                console.print(table)
            continue

        if cmd == "/backend":
            console.print(
                f"[cyan]Active:[/cyan] {assistant.brain.active_name}\n"
                f"[cyan]Available:[/cyan] {', '.join(assistant.brain.list_backends())}"
            )
            continue

        if cmd.startswith("/backend:"):
            name = cmd.split(":", 1)[1].strip()
            result = assistant.switch_backend(name)
            console.print(f"[dim]{result}[/dim]")
            continue

        if cmd == "/clear":
            assistant.memory.clear()
            console.print("[dim]Conversation cleared.[/dim]")
            continue

        if cmd == "/session":
            console.print(
                f"[cyan]Messages:[/cyan] {len(assistant.memory.conversation)}\n"
                f"[cyan]File:[/cyan] {assistant.memory.memory_file}"
            )
            continue

        console.print()
        try:
            response = asyncio.run(assistant.process_message(user_input))
            console.print(Markdown(response))
        except Exception as e:
            console.print(f"[red]Error:[/red] {e}")
            logger.exception("Chat error")
