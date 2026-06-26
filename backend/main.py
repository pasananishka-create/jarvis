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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("jarvis.api")

app = FastAPI(title="J.A.R.V.I.S. API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

assistant = Assistant()


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
    return {
        "success": ok,
        "active": assistant.brain.active_name,
        "available": assistant.brain.list_backends(),
    }


@app.post("/api/model/switch")
async def switch_model(req: ModelSwitch):
    ok = assistant.brain.switch_model(req.backend, req.model)
    return {
        "success": ok,
        "active": assistant.brain.active_name,
    }


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
            chunk = full_response[i : i + chunk_size]
            yield json.dumps({"type": "token", "content": chunk}) + "\n"
            await asyncio.sleep(0.02)

        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


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
                        chunk = response[i : i + chunk_size]
                        await websocket.send_json({"type": "token", "content": chunk})
                        await asyncio.sleep(0.015)

                    await websocket.send_json({"type": "done", "backend": assistant.brain.active_name})
                except Exception as e:
                    logger.error("Message processing error: %s", e)
                    await websocket.send_json({"type": "error", "content": f"Processing error: {e}"})

            elif msg.get("type") == "command":
                cmd = msg.get("content", "")
                if cmd == "clear":
                    assistant.memory.clear()
                    await websocket.send_json({"type": "status", "content": "memory_cleared"})
                elif cmd.startswith("backend:"):
                    name = cmd.split(":", 1)[1].strip()
                    ok = assistant.brain.switch_to(name)
                    await websocket.send_json({
                        "type": "backend_changed",
                        "success": ok,
                        "active": assistant.brain.active_name,
                    })
                elif cmd.startswith("model:"):
                    parts = cmd.split(":")
                    if len(parts) >= 3:
                        bk = parts[1].strip()
                        mdl = ":".join(parts[2:]).strip()
                        ok = assistant.brain.switch_model(bk, mdl)
                        await websocket.send_json({
                            "type": "model_changed",
                            "success": ok,
                            "active": assistant.brain.active_name,
                        })

            elif msg.get("type") == "get_models":
                try:
                    models = assistant.brain.list_all_models()
                    await websocket.send_json({
                        "type": "models_list",
                        "models": models,
                    })
                except Exception as e:
                    logger.error("Failed to list models: %s", e)
                    await websocket.send_json({
                        "type": "models_list",
                        "models": {},
                    })

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
