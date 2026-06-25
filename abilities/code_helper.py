import ast
import sys
import subprocess
from abilities.base import Ability


class RunPython(Ability):
    @property
    def name(self):
        return "run_python"

    @property
    def description(self):
        return "Execute Python code and return the result. Use for calculations, data processing, or testing code snippets."

    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The Python code to execute",
                },
            },
            "required": ["code"],
        }

    async def run(self, code: str) -> str:
        try:
            ast.parse(code)
        except SyntaxError as e:
            return f"Syntax error: {e}"

        try:
            result = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=15,
            )
            out = result.stdout.strip()
            err = result.stderr.strip()
            output = f"Exit code: {result.returncode}"
            if out:
                output += f"\n{out}"
            if err:
                output += f"\nError:\n{err[:1000]}"
            return output
        except subprocess.TimeoutExpired:
            return "Code execution timed out (15s)"
        except Exception as e:
            return f"Execution error: {e}"
