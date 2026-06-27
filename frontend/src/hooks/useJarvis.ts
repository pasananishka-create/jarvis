import { useEffect, useRef, useCallback, useState } from "react";
import type { ConnectionStatus, ModelInfo } from "../types";

export function useJarvis() {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [backend, setBackend] = useState("unknown");
  const [models, setModels] = useState<Record<string, ModelInfo[]>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const onTokenRef = useRef<((token: string) => void) | null>(null);
  const onDoneRef = useRef<((backend: string) => void) | null>(null);
  const onErrorRef = useRef<((error: string) => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const stored = typeof window !== "undefined" ? localStorage.getItem("jarvis_ws_url") : null;
    const url = import.meta.env.VITE_WS_URL || stored || `${protocol}//${host}/ws`;

    console.log("[JARVIS] Connecting to:", url);
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      socket.send(JSON.stringify({ type: "get_models" }));
    };

    socket.onclose = () => {
      setStatus("disconnected");
      setTimeout(() => connect(), 3000);
    };

    socket.onerror = () => {
      setStatus("disconnected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "token":
            onTokenRef.current?.(data.content);
            break;
          case "done":
            if (data.backend) setBackend(data.backend);
            onDoneRef.current?.(data.backend);
            break;
          case "backend_changed":
            if (data.active) setBackend(data.active);
            break;
          case "model_changed":
            if (data.active) {
              setBackend(data.active);
              if (data.success) {
                showToast(`Model switched`, "success");
              } else {
                showToast(`Failed to switch model`, "error");
              }
            }
            break;
          case "models_list":
            if (data.models) {
              const m = { ...data.models };
              // Ensure every backend from the server has at least an entry
              if (data.backends) {
                for (const bk of data.backends) {
                  if (!m[bk]) m[bk] = [];
                }
              }
              setModels(m);
            }
            break;
          case "error":
            onErrorRef.current?.(data.content);
            showToast(data.content || "Connection error", "error");
            break;
        }
      } catch {
        // ignore
      }
    };
  }, [showToast]);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "message", content: text }));
    }
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "command", content: cmd }));
    }
  }, []);

  const switchModel = useCallback((backendName: string, modelId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({ type: "command", content: `model:${backendName}:${modelId}` })
      );
    }
  }, []);

  const onToken = useCallback((fn: (token: string) => void) => {
    onTokenRef.current = fn;
  }, []);

  const onDone = useCallback((fn: (backend: string) => void) => {
    onDoneRef.current = fn;
  }, []);

  const onError = useCallback((fn: (error: string) => void) => {
    onErrorRef.current = fn;
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const setBackendUrl = useCallback((url: string) => {
    try {
      localStorage.setItem("jarvis_ws_url", url);
      ws.current?.close();
    } catch { /* */ }
  }, []);

  return { status, backend, models, toast, sendMessage, sendCommand, switchModel, onToken, onDone, onError, dismissToast, setBackendUrl };
}
