import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "DATA"
DATA_DIR.mkdir(exist_ok=True)
NOTES_FILE = DATA_DIR / "notes.json"

def load_notes():
    if not NOTES_FILE.exists():
        return []
    try:
        with open(NOTES_FILE) as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []

def save_notes(notes):
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=4)

def add_note(note):
    notes = load_notes()
    notes.append(note)
    save_notes(notes)

def delete_note(note):
    notes = load_notes()
    if note in notes:
        notes.remove(note)
        save_notes(notes)
        return True
    return False
