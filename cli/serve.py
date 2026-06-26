import logging
import os
import sys
from pathlib import Path

from rich.console import Console

from cli.banner import print_banner

logger = logging.getLogger("jarvis.cli.serve")


def serve_cmd(host: str, port: int, reload: bool, backend: str | None):
    """Start the Jarvis API server."""
    console = Console(stderr=True)
    print_banner(console)

    try:
        from core.assistant import Assistant
        assistant = Assistant()
        if backend:
            result = assistant.switch_backend(backend)
            console.print(f"[dim]{result}[/dim]")
        console.print(f"[dim]Backend: {assistant.brain.active_name}[/dim]")
    except Exception as e:
        console.print(f"[red]Error initializing assistant: {e}[/red]")
        sys.exit(1)

    try:
        import uvicorn
    except ImportError:
        console.print(
            "[red]Server dependencies not installed.[/red]\n"
            "Install: pip install fastapi uvicorn"
        )
        sys.exit(1)

    console.print(f"[green]Starting Jarvis API server[/green]")
    console.print(f"  URL: [cyan]http://{host}:{port}[/cyan]")
    console.print(f"  Docs: [cyan]http://{host}:{port}/docs[/cyan]")

    if backend:
        os.environ["JARVIS_BACKEND"] = backend

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from backend.main import app
    uvicorn.run(app, host=host, port=port, reload=reload)
