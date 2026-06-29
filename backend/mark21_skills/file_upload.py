import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

BASE = Path(os.getcwd())
UPLOADS = BASE / "uploads"
UPLOADS.mkdir(exist_ok=True)


def save_upload(file_data: bytes, filename: str) -> dict:
    safe_name = Path(filename).name
    ext = Path(safe_name).suffix.lower()
    supported = {".pdf", ".txt", ".md", ".json", ".csv", ".yaml", ".yml", ".xml", ".html", ".css", ".js", ".ts", ".py", ".java", ".cpp", ".h", ".c", ".rs", ".go", ".rb", ".sh", ".bat", ".ps1", ".log", ".ini", ".cfg", ".toml", ".env", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico"}
    if ext not in supported:
        return {"error": f"File type {ext} not supported. Supported: {', '.join(sorted(supported))}"}

    file_id = uuid.uuid4().hex[:12]
    stored_name = f"{file_id}_{safe_name}"
    dest = UPLOADS / stored_name

    with open(str(dest), "wb") as f:
        f.write(file_data)

    return {
        "file_id": file_id,
        "name": safe_name,
        "stored_name": stored_name,
        "path": str(dest),
        "size": len(file_data),
        "size_kb": round(len(file_data) / 1024, 1),
    }


def list_uploads() -> dict:
    files = []
    for f in sorted(UPLOADS.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.is_file():
            files.append({
                "name": f.name,
                "path": str(f),
                "size": f.stat().st_size,
                "modified": f.stat().st_mtime,
            })
    return {"uploads": files, "count": len(files)}


def get_upload(file_id_or_name: str) -> Optional[dict]:
    for f in UPLOADS.iterdir():
        if f.is_file() and (file_id_or_name in f.name):
            data = f.read_bytes()
            return {
                "name": f.name,
                "path": str(f),
                "data": data,
                "size": len(data),
                "is_text": f.suffix.lower() in {".txt", ".md", ".json", ".csv", ".yaml", ".yml", ".xml", ".html", ".css", ".js", ".ts", ".py", ".java", ".cpp", ".h", ".c", ".rs", ".go", ".rb", ".sh", ".bat", ".ps1", ".log", ".ini", ".cfg", ".toml", ".env"},
            }
    return None


def delete_upload(file_id_or_name: str) -> dict:
    for f in UPLOADS.iterdir():
        if f.is_file() and (file_id_or_name in f.name):
            f.unlink()
            return {"status": "deleted", "name": f.name}
    return {"error": "File not found"}


def get_upload_text(file_id_or_name: str) -> dict:
    info = get_upload(file_id_or_name)
    if not info:
        return {"error": "File not found"}
    if not info["is_text"]:
        try:
            text = info["data"].decode("utf-8", errors="replace")
            return {"name": info["name"], "content": text, "size": info["size"]}
        except:
            return {"error": "Binary file — use extract endpoint"}
    text = info["data"].decode("utf-8", errors="replace")
    return {"name": info["name"], "content": text, "size": info["size"]}
