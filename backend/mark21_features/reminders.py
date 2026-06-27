import os, json, time, threading
from datetime import datetime, timedelta
import dateparser
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "DATA"
DATA_DIR.mkdir(exist_ok=True)
REMINDERS_FILE = DATA_DIR / "reminders.json"

def load_reminders():
    if not REMINDERS_FILE.exists():
        return []
    try:
        with open(REMINDERS_FILE) as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_reminders(reminders):
    with open(REMINDERS_FILE, "w") as f:
        json.dump(reminders, f, indent=4)

def add_reminder(text, delay_minutes):
    reminders = load_reminders()
    remind_time = (datetime.now() + timedelta(minutes=delay_minutes)).strftime("%Y-%m-%d %H:%M:%S")
    reminders.append({"text": text, "time": remind_time, "task": text})
    save_reminders(reminders)

def add_natural_reminder(text):
    parsed_time = dateparser.parse(text, settings={"PREFER_DATES_FROM": "future"})
    if parsed_time:
        task = text.split("to", 1)[-1].strip() if "to" in text else text
        reminders = load_reminders()
        reminders.append({"task": task, "time": parsed_time.strftime("%Y-%m-%d %H:%M:%S")})
        save_reminders(reminders)
        return True, f"Reminder saved: {task} at {parsed_time.strftime('%Y-%m-%d %I:%M %p')}"
    return False, "Sorry, I couldn't understand the time."

due_callbacks = []

def on_reminder_due(cb):
    due_callbacks.append(cb)

def start_reminder_checker():
    def loop():
        while True:
            reminders = load_reminders()
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            new_reminders = []
            for reminder in reminders:
                if reminder["time"] <= now:
                    task_text = reminder.get("task") or reminder.get("text") or "Unknown"
                    for cb in due_callbacks:
                        cb(task_text)
                else:
                    new_reminders.append(reminder)
            save_reminders(new_reminders)
            time.sleep(20)
    threading.Thread(target=loop, daemon=True).start()
