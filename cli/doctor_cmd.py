import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from rich.console import Console
from rich.table import Table
from rich import box

from cli.banner import print_banner


@dataclass
class Check:
    name: str
    status: str
    message: str
    detail: str = ""


STATUS_ICONS = {
    "ok": "[green]✓[/green]",
    "warn": "[yellow]![/yellow]",
    "fail": "[red]✗[/red]",
}


def _check_python() -> Check:
    v = sys.version_info
    ver = f"{v.major}.{v.minor}.{v.micro}"
    if (v.major, v.minor) >= (3, 10):
        return Check("Python version", "ok", ver)
    return Check("Python version", "fail", f"{ver} (need >= 3.10)")


def _check_dotenv() -> Check:
    env_file = Path(".env")
    if not env_file.exists():
        return Check(".env file", "warn", "Not found", "Run `jarvis init` to create one")
    return Check(".env file", "ok", "Found")


def _check_openai() -> Check:
    from config import Config
    if Config.OPENAI_API_KEY:
        return Check("OpenAI", "ok", f"Key set (model: {Config.OPENAI_MODEL})")
    return Check("OpenAI", "warn", "Not configured")


def _check_anthropic() -> Check:
    from config import Config
    if Config.ANTHROPIC_API_KEY:
        return Check("Anthropic", "ok", f"Key set (model: {Config.ANTHROPIC_MODEL})")
    return Check("Anthropic", "warn", "Not configured")


def _check_nvidia() -> Check:
    from config import Config
    if Config.NVIDIA_API_KEY:
        return Check("NVIDIA NIM", "ok", f"Key set (model: {Config.NVIDIA_MODEL})")
    return Check("NVIDIA NIM", "warn", "Not configured")


def _check_ollama() -> Check:
    import urllib.request
    import urllib.error
    try:
        resp = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3)
        if resp.status == 200:
            data = json.loads(resp.read())
            models = [m["name"] for m in data.get("models", [])]
            if models:
                return Check("Ollama", "ok", f"Running ({len(models)} models: {', '.join(models[:3])})")
            return Check("Ollama", "ok", "Running (no models pulled)")
        return Check("Ollama", "warn", f"Status {resp.status}")
    except Exception as e:
        return Check("Ollama", "warn", f"Not reachable ({e})")


def _check_deps() -> list[Check]:
    checks = []
    required = [("openai", "openai"), ("dotenv", "dotenv")]
    optional = [
        ("anthropic", "anthropic"),
        ("duckduckgo_search", "duckduckgo_search"),
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
    ]
    for import_name, display in required:
        try:
            __import__(import_name)
            checks.append(Check(f"Dep: {display}", "ok", "Installed"))
        except ImportError:
            checks.append(Check(f"Dep: {display}", "fail", "Missing - run pip install"))
    for import_name, display in optional:
        try:
            __import__(import_name)
            checks.append(Check(f"Dep: {display}", "ok", "Installed"))
        except ImportError:
            checks.append(Check(f"Dep: {display}", "warn", "Not installed (optional)"))
    return checks


def _check_abilities() -> Check:
    try:
        from abilities.web_search import WebSearch
        from abilities.system_control import RunCommand
        from abilities.code_helper import RunPython
        return Check("Abilities", "ok", "web_search, run_command, run_python loaded")
    except Exception as e:
        return Check("Abilities", "fail", f"Load error: {e}")


def _check_git() -> Check:
    if shutil.which("git"):
        return Check("Git", "ok", "Available")
    return Check("Git", "warn", "Not found (not required)")


def _check_node() -> Check:
    node = shutil.which("node")
    if not node:
        return Check("Node.js", "warn", "Not found (needed for frontend build)")
    try:
        r = subprocess.run(["node", "--version"], capture_output=True, text=True, timeout=5)
        return Check("Node.js", "ok", r.stdout.strip())
    except Exception:
        return Check("Node.js", "warn", "Error checking")


def _check_frontend() -> Check:
    frontend_dir = Path("frontend")
    if frontend_dir.exists() and (frontend_dir / "package.json").exists():
        return Check("Frontend", "ok", "Found (React + Vite)")
    return Check("Frontend", "warn", "Not found")


def _check_memory_dir() -> Check:
    memory_dir = Path.home() / ".jarvis"
    if memory_dir.exists():
        sessions = list(memory_dir.glob("*.json"))
        return Check("Memory dir", "ok", f"{len(sessions)} session files")
    return Check("Memory dir", "warn", "Not created yet")


def doctor_cmd(verbose: bool):
    """Run diagnostic checks on your Jarvis installation."""
    console = Console(stderr=True)
    print_banner(console)

    checks: list[Check] = []
    checks.append(_check_python())
    checks.append(_check_dotenv())
    checks.append(_check_openai())
    checks.append(_check_anthropic())
    checks.append(_check_nvidia())
    checks.append(_check_ollama())
    checks.extend(_check_deps())
    checks.append(_check_abilities())
    checks.append(_check_git())
    checks.append(_check_node())
    checks.append(_check_frontend())
    checks.append(_check_memory_dir())

    table = Table(show_header=True, box=box.SIMPLE)
    table.add_column("Status", width=4, justify="center")
    table.add_column("Check", style="cyan")
    table.add_column("Result")

    for c in checks:
        icon = STATUS_ICONS.get(c.status, "?")
        msg = c.message
        if verbose and c.detail:
            msg += f"\n  [dim]{c.detail}[/dim]"
        table.add_row(icon, c.name, msg)

    console.print(table)

    ok_count = sum(1 for c in checks if c.status == "ok")
    warn_count = sum(1 for c in checks if c.status == "warn")
    fail_count = sum(1 for c in checks if c.status == "fail")

    console.print()
    if fail_count == 0 and warn_count == 0:
        console.print("[green]All checks passed![/green]")
    elif fail_count == 0:
        console.print(
            f"[yellow]{ok_count} passed, {warn_count} warnings — "
            f"you're good to go![/yellow]"
        )
    else:
        console.print(
            f"[red]{fail_count} failure(s) — "
            f"run [bold]jarvis init[/bold] to fix configuration[/red]"
        )
