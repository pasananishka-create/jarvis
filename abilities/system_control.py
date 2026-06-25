import asyncio
import platform
import subprocess
from pathlib import Path
from abilities.base import Ability


class RunCommand(Ability):
    @property
    def name(self):
        return "run_command"

    @property
    def description(self):
        return "Run a system command or open a program. Use for file operations, running scripts, opening applications."

    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The command to execute (e.g., 'notepad', 'calc', 'explorer', 'dir')",
                },
                "timeout": {
                    "type": "integer",
                    "description": "Timeout in seconds (default 10)",
                    "default": 10,
                },
            },
            "required": ["command"],
        }

    async def run(self, command: str, timeout: int = 10) -> str:
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=True,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
                out = stdout.decode("utf-8", errors="replace").strip()
                err = stderr.decode("utf-8", errors="replace").strip()
                result = f"Exit code: {proc.returncode}"
                if out:
                    result += f"\nOutput:\n{out[:2000]}"
                if err:
                    result += f"\nError:\n{err[:1000]}"
                return result
            except asyncio.TimeoutError:
                proc.kill()
                return f"Command timed out after {timeout}s"
        except Exception as e:
            return f"Failed to run command: {e}"
