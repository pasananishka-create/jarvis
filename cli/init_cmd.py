import os
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich import box

from cli.banner import print_banner

ENV_FILE = Path(".env")


def _env_exists() -> bool:
    return ENV_FILE.exists()


def _read_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if _env_exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def _write_env(env: dict[str, str]):
    keys = [
        ("openai", "OPENAI_API_KEY", "OpenAI API Key (sk-...)"),
        ("openai", "OPENAI_MODEL", "OpenAI Model"),
        ("anthropic", "ANTHROPIC_API_KEY", "Anthropic API Key (sk-ant-...)"),
        ("anthropic", "ANTHROPIC_MODEL", "Anthropic Model"),
        ("nvidia", "NVIDIA_API_KEY", "NVIDIA NIM API Key (nvapi-...)"),
        ("nvidia", "NVIDIA_MODEL", "NVIDIA Model"),
        ("nvidia", "NVIDIA_BASE_URL", "NVIDIA Base URL"),
        ("general", "OLLAMA_HOST", "Ollama Host"),
        ("general", "OLLAMA_MODEL", "Ollama Model"),
        ("general", "WEB_SEARCH_PROVIDER", "Web Search Provider"),
        ("general", "VOICE_ENABLED", "Voice Enabled"),
        ("general", "WAKE_WORD", "Wake Word"),
    ]

    lines: list[str] = []
    last_section = ""
    for section, key, comment in keys:
        value = env.get(key, "")
        if section != last_section:
            if lines:
                lines.append("")
            lines.append(f"# {section.capitalize()}")
            last_section = section
        if value:
            lines.append(f"{key}={value}")
        else:
            lines.append(f"#{key}={comment}")

    ENV_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _check_ollama() -> bool:
    import urllib.request
    import urllib.error
    try:
        resp = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3)
        return resp.status == 200
    except Exception:
        return False


def init_cmd(force: bool, minimal: bool):
    """Set up Jarvis with an interactive wizard."""
    console = Console(stderr=True)
    print_banner(console)

    if _env_exists() and not force:
        console.print(
            "[yellow].env already exists. Use --force to overwrite.[/yellow]"
        )
        env = _read_env()
        if env:
            console.print("[dim]Current keys found:[/dim]")
            for k in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "NVIDIA_API_KEY"]:
                if env.get(k):
                    console.print(f"  [green]✓[/green] {k} configured")
            if env.get("OLLAMA_HOST"):
                console.print(f"  [green]✓[/green] Ollama configured")
        return

    console.print(
        Panel(
            "[bold]Welcome to Jarvis Setup![/bold]\n\n"
            "I'll help you configure your AI backends.\n"
            "You need at least one API key or a local Ollama instance.\n"
            "Press [bold]Enter[/bold] to skip any option.",
            border_style="cyan",
            box=box.ROUNDED,
        )
    )

    env: dict[str, str] = {}
    env["OLLAMA_HOST"] = "http://localhost:11434"
    env["OLLAMA_MODEL"] = "llama3.1"

    if not minimal:
        if _check_ollama():
            console.print("[green]✓ Ollama detected on localhost:11434[/green]")
            use_ollama = Confirm.ask("Use Ollama as fallback?", default=True)
            if use_ollama:
                model = Prompt.ask("Ollama model", default="llama3.1")
                env["OLLAMA_MODEL"] = model

        openai_key = Prompt.ask(
            "OpenAI API Key (Enter to skip)",
            default="",
            password=True,
        )
        if openai_key:
            env["OPENAI_API_KEY"] = openai_key
            model = Prompt.ask("OpenAI model", default="gpt-4o")
            env["OPENAI_MODEL"] = model

        anth_key = Prompt.ask(
            "Anthropic API Key (Enter to skip)",
            default="",
            password=True,
        )
        if anth_key:
            env["ANTHROPIC_API_KEY"] = anth_key
            model = Prompt.ask("Anthropic model", default="claude-sonnet-4-20250514")
            env["ANTHROPIC_MODEL"] = model

        nv_key = Prompt.ask(
            "NVIDIA NIM API Key (Enter to skip)",
            default="",
            password=True,
        )
        if nv_key:
            env["NVIDIA_API_KEY"] = nv_key
            model = Prompt.ask(
                "NVIDIA model",
                default="nvidia/llama-3.1-nemotron-70b-instruct",
            )
            env["NVIDIA_MODEL"] = model
            url = Prompt.ask(
                "NVIDIA Base URL",
                default="https://integrate.api.nvidia.com/v1",
            )
            env["NVIDIA_BASE_URL"] = url

        console.print("\n[bold]Web Search:[/bold]")
        env["WEB_SEARCH_PROVIDER"] = "duckduckgo"
        use_google = Confirm.ask("Use Google Custom Search instead of DuckDuckGo?", default=False)
        if use_google:
            gkey = Prompt.ask("Google API Key")
            if gkey:
                env["GOOGLE_API_KEY"] = gkey
            cse = Prompt.ask("Google CSE ID")
            if cse:
                env["GOOGLE_CSE_ID"] = cse
            env["WEB_SEARCH_PROVIDER"] = "google"

        console.print("\n[bold]Voice:[/bold]")
        if Confirm.ask("Enable voice interface?", default=False):
            env["VOICE_ENABLED"] = "true"
            wake = Prompt.ask("Wake word", default="jarvis")
            env["WAKE_WORD"] = wake
    else:
        choice = Prompt.ask(
            "Which backend to configure?",
            choices=["openai", "anthropic", "nvidia", "ollama"],
            default="openai",
        )
        if choice == "ollama":
            model = Prompt.ask("Ollama model", default="llama3.1")
            env["OLLAMA_MODEL"] = model
        elif choice == "openai":
            key = Prompt.ask("OpenAI API Key", password=True)
            if key:
                env["OPENAI_API_KEY"] = key
                env["OPENAI_MODEL"] = Prompt.ask("Model", default="gpt-4o")
        elif choice == "anthropic":
            key = Prompt.ask("Anthropic API Key", password=True)
            if key:
                env["ANTHROPIC_API_KEY"] = key
                env["ANTHROPIC_MODEL"] = Prompt.ask("Model", default="claude-sonnet-4-20250514")
        elif choice == "nvidia":
            key = Prompt.ask("NVIDIA NIM API Key", password=True)
            if key:
                env["NVIDIA_API_KEY"] = key
                env["NVIDIA_MODEL"] = Prompt.ask("Model", default="nvidia/llama-3.1-nemotron-70b-instruct")
                env["NVIDIA_BASE_URL"] = Prompt.ask("Base URL", default="https://integrate.api.nvidia.com/v1")

    _write_env(env)
    console.print("\n[green]✓ .env created![/green]")
    console.print("\n[bold]Next steps:[/bold]")
    console.print("  [cyan]jarvis chat[/cyan]     - Start interactive chat")
    console.print("  [cyan]jarvis ask[/cyan]      - Ask a single question")
    console.print("  [cyan]jarvis doctor[/cyan]   - Run diagnostic checks")
    console.print("  [cyan]jarvis serve[/cyan]    - Start the API server")
