import os
import re
import fnmatch
from pathlib import Path

BASE = Path(os.getcwd())

def safe_path(p: str) -> Path | None:
    resolved = (BASE / p).resolve()
    try:
        resolved.relative_to(BASE)
        return resolved
    except ValueError:
        return None

def list_dir(path: str = ".") -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied: path outside workspace"}
    if not p.exists():
        return {"error": f"Path not found: {path}"}
    if not p.is_dir():
        return {"error": f"Not a directory: {path}"}
    items = []
    for entry in sorted(p.iterdir()):
        items.append({
            "name": entry.name,
            "type": "dir" if entry.is_dir() else "file",
            "size": entry.stat().st_size if entry.is_file() else 0,
            "modified": entry.stat().st_mtime,
        })
    return {"path": str(p), "items": items}

def read_file(path: str) -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied: path outside workspace"}
    if not p.exists() or not p.is_file():
        return {"error": f"File not found: {path}"}
    try:
        content = p.read_text(encoding="utf-8")
        return {"path": str(p), "content": content, "size": len(content)}
    except Exception as e:
        return {"error": f"Failed to read file: {e}"}

def write_file(path: str, content: str) -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied: path outside workspace"}
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return {"path": str(p), "size": len(content), "status": "written"}
    except Exception as e:
        return {"error": f"Failed to write file: {e}"}

def search_files(pattern: str, path: str = ".") -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied"}
    matches = []
    try:
        for root, dirs, files in os.walk(str(p)):
            for f in files:
                fp = Path(root) / f
                try:
                    relative = str(fp.relative_to(BASE))
                except ValueError:
                    continue
                if fnmatch.fnmatch(f, pattern):
                    matches.append(relative)
    except Exception as e:
        return {"error": f"Search failed: {e}"}
    return {"pattern": pattern, "matches": matches}

def grep_files(query: str, path: str = ".") -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied"}
    results = []
    try:
        for root, dirs, files in os.walk(str(p)):
            for f in files:
                if not f.endswith((".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css", ".md", ".txt", ".yml", ".yaml", ".toml", ".env")):
                    continue
                fp = Path(root) / f
                try:
                    relative = str(fp.relative_to(BASE))
                except ValueError:
                    continue
                try:
                    lines = fp.read_text(encoding="utf-8", errors="replace").splitlines()
                except:
                    continue
                for i, line in enumerate(lines, 1):
                    if query in line:
                        results.append({
                            "file": relative,
                            "line": i,
                            "content": line.strip()[:200],
                        })
    except Exception as e:
        return {"error": f"Grep failed: {e}"}
    return {"query": query, "matches": results[:100]}
