#!/usr/bin/env python3
"""
J.A.R.V.I.S. — Just A Rather Very Intelligent System
Personal AI assistant with online and offline capabilities.
"""

import logging
import sys

import click

from cli.banner import print_banner


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    logging.basicConfig(level=level, format=fmt, datefmt="%H:%M:%S")


@click.group(invoke_without_command=True)
@click.option("-v", "--verbose", is_flag=True, help="Enable debug logging")
@click.option("--version", is_flag=True, help="Show version and exit")
@click.pass_context
def cli(ctx: click.Context, verbose: bool, version: bool):
    """J.A.R.V.I.S. — Your Personal AI Assistant"""
    setup_logging(verbose)
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose

    if version:
        print_banner()
        sys.exit(0)

    if ctx.invoked_subcommand is None:
        from cli.chat import chat_cmd
        chat_cmd(backend=None, no_banner=False)


@cli.command()
@click.option("--force", is_flag=True, help="Overwrite existing .env")
@click.option("--minimal", is_flag=True, help="Only ask for one API key")
def init(force: bool, minimal: bool):
    """Set up Jarvis with an interactive wizard."""
    from cli.init_cmd import init_cmd
    init_cmd(force=force, minimal=minimal)


@cli.command()
@click.argument("question", required=False)
@click.option("-b", "--backend", help="AI backend to use")
@click.option("-v", "--verbose", is_flag=True, help="Show backend info")
def ask(question: str | None, backend: str | None, verbose: bool):
    """Ask a single question and get an answer."""
    from cli.ask import ask_cmd
    ask_cmd(question=question, backend=backend, verbose=verbose)


@cli.command()
@click.option("-b", "--backend", help="AI backend to use")
@click.option("--no-banner", is_flag=True, help="Skip startup banner")
def chat(backend: str | None, no_banner: bool):
    """Start an interactive chat session."""
    from cli.chat import chat_cmd
    chat_cmd(backend=backend, no_banner=no_banner)


@cli.command()
@click.option("--verbose", "-v", is_flag=True, help="Show all details")
def doctor(verbose: bool):
    """Run diagnostic checks on your installation."""
    from cli.doctor_cmd import doctor_cmd
    doctor_cmd(verbose=verbose)


@cli.command()
@click.option("--host", default="0.0.0.0", help="Host to bind to")
@click.option("--port", default=8000, type=int, help="Port to listen on")
@click.option("--reload", is_flag=True, help="Auto-reload on file changes")
@click.option("-b", "--backend", help="AI backend to use")
def serve(host: str, port: int, reload: bool, backend: str | None):
    """Start the Jarvis API server."""
    from cli.serve import serve_cmd
    serve_cmd(host=host, port=port, reload=reload, backend=backend)


@cli.command(name="list-backends")
def list_backends():
    """List available AI backends."""
    from core.brain import Brain
    brain = Brain()
    print_banner()
    click.echo("Available backends:")
    for name in brain.list_backends():
        marker = " <-- active" if name == brain._active else ""
        click.echo(f"  {name}{marker}")


if __name__ == "__main__":
    cli()
