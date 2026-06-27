import os, json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "DATA"
DATA_DIR.mkdir(exist_ok=True)

CHAT_LOG_FILE = DATA_DIR / "chat_log.txt"
MEMORY_FILE = DATA_DIR / "memory.json"

conversation_history = []

def load_conversation_history():
    if CHAT_LOG_FILE.exists():
        with open(CHAT_LOG_FILE, encoding="utf-8") as file:
            lines = file.readlines()
        user, jarvis = "", ""
        for line in lines:
            if line.startswith("You:"):
                user = line.replace("You:", "").strip()
            elif line.startswith("Jarvis:"):
                jarvis = line.replace("Jarvis:", "").strip()
                if user and jarvis:
                    conversation_history.append({"user": user, "jarvis": jarvis})
                    user, jarvis = "", ""

def save_conversation_history():
    with open(CHAT_LOG_FILE, "w", encoding="utf-8") as file:
        for item in conversation_history:
            file.write(f"You: {item['user']}\nJarvis: {item['jarvis']}\n\n")

def load_memory():
    if MEMORY_FILE.exists():
        with open(MEMORY_FILE) as file:
            return json.load(file)
    return {}

def save_memory(memory):
    with open(MEMORY_FILE, "w") as file:
        json.dump(memory, file, indent=4)

def remember(key, value):
    memory = load_memory()
    memory[key.lower()] = value
    save_memory(memory)

def recall(key):
    memory = load_memory()
    return memory.get(key.lower(), "I don't remember that yet.")
