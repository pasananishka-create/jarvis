import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.assistant import Assistant
from mark21_api.weather import get_weather
from mark21_api.news import get_newsapi_articles, get_hackernews_articles
from mark21_api.stock_data import get_market_data
from mark21_features.notes import load_notes, add_note, delete_note
from mark21_features.reminders import load_reminders, add_reminder, add_natural_reminder, start_reminder_checker, on_reminder_due
from mark21_core.memory import conversation_history, load_conversation_history, save_conversation_history, remember, recall, load_memory

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("jarvis.api")

app = FastAPI(title="J.A.R.V.I.S. API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

assistant = Assistant()

load_conversation_history()

reminder_queue: list[str] = []

def _reminder_cb(text):
    reminder_queue.append(text)

on_reminder_due(_reminder_cb)
start_reminder_checker()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    backend: str

class BackendSwitch(BaseModel):
    backend: str

class ModelSwitch(BaseModel):
    backend: str
    model: str

# ── Health ──

@app.get("/api/health")
async def health():
    return {"status": "ok", "backend": assistant.brain.active_name}

@app.get("/api/abilities")
async def list_abilities():
    return {
        "abilities": [
            {"name": name, "description": ab.description}
            for name, ab in assistant.abilities.items()
        ]
    }

@app.get("/api/models")
async def list_models():
    return {
        "active": assistant.brain.active_name,
        "models": assistant.brain.list_all_models(),
    }

@app.get("/api/backends")
async def list_backends():
    return {
        "active": assistant.brain.active_name,
        "available": assistant.brain.list_backends(),
    }

@app.post("/api/backend/switch")
async def switch_backend(req: BackendSwitch):
    ok = assistant.brain.switch_to(req.backend)
    return {"success": ok, "active": assistant.brain.active_name, "available": assistant.brain.list_backends()}

@app.post("/api/model/switch")
async def switch_model(req: ModelSwitch):
    ok = assistant.brain.switch_model(req.backend, req.model)
    return {"success": ok, "active": assistant.brain.active_name}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    response = await assistant.process_message(req.message)
    return ChatResponse(response=response, backend=assistant.brain.active_name)

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    from fastapi.responses import StreamingResponse
    async def generate():
        yield json.dumps({"type": "start", "backend": assistant.brain.active_name}) + "\n"
        full_response = await assistant.process_message(req.message)
        chunk_size = 5
        for i in range(0, len(full_response), chunk_size):
            yield json.dumps({"type": "token", "content": full_response[i:i+chunk_size]}) + "\n"
            await asyncio.sleep(0.02)
        yield json.dumps({"type": "done"}) + "\n"
    return StreamingResponse(generate(), media_type="application/x-ndjson")

# ── Weather ──

@app.get("/api/weather")
async def weather():
    return {"data": get_weather()}

# ── News ──

@app.get("/api/news")
async def news():
    try:
        articles = get_newsapi_articles()
    except:
        articles = get_hackernews_articles()
    return {"articles": articles}

# ── Stock Market ──

@app.get("/api/stocks")
async def stocks():
    return get_market_data()

# ── Notes ──

@app.get("/api/notes")
async def list_notes():
    return {"notes": load_notes()}

class NoteBody(BaseModel):
    text: str

@app.post("/api/notes")
async def create_note(body: NoteBody):
    add_note(body.text)
    return {"success": True, "notes": load_notes()}

@app.delete("/api/notes")
async def remove_note(body: NoteBody):
    ok = delete_note(body.text)
    return {"success": ok, "notes": load_notes()}

# ── Reminders ──

@app.get("/api/reminders")
async def list_reminders():
    return {"reminders": load_reminders()}

class ReminderBody(BaseModel):
    text: str
    delay_minutes: int = 0

@app.post("/api/reminders")
async def create_reminder(body: ReminderBody):
    if body.delay_minutes > 0:
        add_reminder(body.text, body.delay_minutes)
        return {"success": True, "message": f"Reminder set for {body.delay_minutes} minutes"}
    success, msg = add_natural_reminder(body.text)
    return {"success": success, "message": msg}

# ── Memory / Facts ──

@app.get("/api/memory")
async def list_memory():
    return {"memory": load_memory()}

class MemoryBody(BaseModel):
    key: str
    value: str

@app.post("/api/memory")
async def save_memory(body: MemoryBody):
    remember(body.key, body.value)
    return {"success": True}

@app.get("/api/memory/{key}")
async def get_memory(key: str):
    return {"key": key, "value": recall(key)}

# ── Conversation History ──

@app.get("/api/history")
async def get_history():
    return {"history": conversation_history[-50:]}

@app.post("/api/history/clear")
async def clear_history():
    conversation_history.clear()
    save_conversation_history()
    return {"success": True}

# ── Reminder due events (polling) ──

@app.get("/api/reminders/due")
async def get_due_reminders():
    items = list(reminder_queue)
    reminder_queue.clear()
    return {"reminders": items}

# ── WebSocket ──

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "content": "Invalid JSON"})
                continue

            if msg.get("type") == "message":
                user_text = msg.get("content", "")
                try:
                    response = await assistant.process_message(user_text)
                    chunk_size = 5
                    for i in range(0, len(response), chunk_size):
                        await websocket.send_json({"type": "token", "content": response[i:i+chunk_size]})
                        await asyncio.sleep(0.015)
                    await websocket.send_json({"type": "done", "backend": assistant.brain.active_name})
                except Exception as e:
                    logger.error("Message processing error: %s", e)
                    await websocket.send_json({"type": "error", "content": f"Processing error: {e}"})

            elif msg.get("type") == "command":
                cmd = msg.get("content", "")
                if cmd == "clear":
                    assistant.memory.clear()
                    conversation_history.clear()
                    save_conversation_history()
                    await websocket.send_json({"type": "status", "content": "memory_cleared"})
                elif cmd.startswith("backend:"):
                    name = cmd.split(":", 1)[1].strip()
                    ok = assistant.brain.switch_to(name)
                    await websocket.send_json({"type": "backend_changed", "success": ok, "active": assistant.brain.active_name})
                elif cmd.startswith("model:"):
                    parts = cmd.split(":")
                    if len(parts) >= 3:
                        bk = parts[1].strip()
                        mdl = ":".join(parts[2:]).strip()
                        ok = assistant.brain.switch_model(bk, mdl)
                        await websocket.send_json({"type": "model_changed", "success": ok, "active": assistant.brain.active_name})

            elif msg.get("type") == "get_models":
                try:
                    backends = assistant.brain.list_backends()
                    models = assistant.brain.list_all_models()
                    await websocket.send_json({"type": "models_list", "models": models, "backends": backends})
                except Exception as e:
                    logger.error("Failed to list models: %s", e)
                    await websocket.send_json({"type": "models_list", "models": {}, "backends": []})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error("WebSocket error: %s", e)
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
