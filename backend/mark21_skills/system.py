import platform
import os
import shutil
import subprocess
from pathlib import Path

def get_system_info() -> dict:
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "hostname": platform.node(),
        "python_version": platform.python_version(),
        "cwd": str(Path.cwd()),
        "disk": _get_disk_usage(),
        "memory": _get_memory_info(),
    }

def _get_disk_usage() -> dict:
    try:
        usage = shutil.disk_usage(Path.cwd().anchor)
        return {
            "total_gb": round(usage.total / (1024**3), 1),
            "used_gb": round(usage.used / (1024**3), 1),
            "free_gb": round(usage.free / (1024**3), 1),
            "percent_used": round(usage.used / usage.total * 100, 1),
        }
    except:
        return {}

def _get_memory_info() -> dict:
    try:
        import psutil
        mem = psutil.virtual_memory()
        return {
            "total_gb": round(mem.total / (1024**3), 1),
            "available_gb": round(mem.available / (1024**3), 1),
            "percent_used": mem.percent,
        }
    except ImportError:
        return {"note": "install psutil for memory info"}

def execute_command(command: str, timeout: int = 30) -> dict:
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "exit_code": result.returncode,
            "stdout": result.stdout[:5000],
            "stderr": result.stderr[:2000],
        }
    except subprocess.TimeoutExpired:
        return {"error": f"Command timed out after {timeout}s"}
    except Exception as e:
        return {"error": str(e)}

def git_status() -> dict:
    try:
        r = subprocess.run(["git", "status", "--short"], capture_output=True, text=True, cwd=Path.cwd())
        b = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True, cwd=Path.cwd())
        l = subprocess.run(["git", "log", "--oneline", "-10"], capture_output=True, text=True, cwd=Path.cwd())
        return {
            "branch": b.stdout.strip(),
            "changes": r.stdout.strip() or "clean",
            "recent_commits": l.stdout.strip(),
        }
    except Exception as e:
        return {"error": str(e)}

def web_search(query: str, num: int = 5) -> dict:
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=num))
        return {
            "query": query,
            "results": [
                {"title": r.get("title", ""), "url": r.get("href", ""), "snippet": r.get("body", "")}
                for r in results
            ],
        }
    except ImportError:
        return {"error": "Install duckduckgo-search: pip install duckduckgo-search"}
    except Exception as e:
        return {"error": str(e)}

def web_fetch(url: str) -> dict:
    try:
        import requests
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        return {
            "url": url,
            "status": r.status_code,
            "content": r.text[:10000],
        }
    except Exception as e:
        return {"error": str(e)}
