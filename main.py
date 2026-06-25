#!/usr/bin/env python3
"""
J.A.R.V.I.S. — Just A Rather Very Intelligent System
Personal AI assistant with online and offline capabilities.
"""

import argparse
import logging
import sys

from config import Config


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    logging.basicConfig(level=level, format=fmt, datefmt="%H:%M:%S")


def main():
    parser = argparse.ArgumentParser(
        description="J.A.R.V.I.S. — Personal AI Assistant",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--voice",
        action="store_true",
        help="Enable voice interface (requires extra deps)",
    )
    parser.add_argument(
        "--backend",
        type=str,
        default=None,
        help="Set AI backend: openai, anthropic, ollama",
    )
    parser.add_argument(
        "--list-backends",
        action="store_true",
        help="List available AI backends and exit",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    if args.list_backends:
        from core.brain import Brain
        brain = Brain()
        print("Available backends:")
        for name in brain.list_backends():
            marker = " <-- active" if name == brain._active else ""
            print(f"  {name}{marker}")
        sys.exit(0)

    if args.backend:
        from core.assistant import Assistant
        assistant = Assistant()
        result = assistant.switch_backend(args.backend)
        print(result)

    if args.voice:
        if not Config.VOICE_ENABLED:
            print("Warning: VOICE_ENABLED=false in .env. Set to true or use --voice to override.")
        from interface.voice import VoiceInterface
        from core.assistant import Assistant
        assistant = Assistant()
        if args.backend:
            assistant.switch_backend(args.backend)
        import asyncio
        asyncio.run(VoiceInterface(assistant).run())
    else:
        from interface.cli import start
        start()


if __name__ == "__main__":
    main()
