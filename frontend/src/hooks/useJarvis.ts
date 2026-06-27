import { useEffect, useRef, useCallback, useState } from "react";
import type { ConnectionStatus, ModelInfo } from "../types";
import { directChat, getConfig, saveConfig, hasAnyKey, type DirectConfig } from "../lib/directAi";

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

    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      socket.send(JSON.stringify({ type: "get_models" }));
    };

    socket.onclose = () => {
      const cfg = getConfig();
      if (hasAnyKey()) {
        setStatus("direct");
        setBackend(`direct (${cfg.activeProvider})`);
        // Build a virtual models list from config
        const m: Record<string, ModelInfo[]> = {};
        m[cfg.activeProvider] = [{ id: cfg.activeModel, name: cfg.activeModel, provider: cfg.activeProvider }];
        setModels(m);
      } else {
        setStatus("disconnected");
        setTimeout(() => connect(), 3000);
      }
    };

    socket.onerror = () => {
      const cfg = getConfig();
      if (hasAnyKey()) {
        setStatus("direct");
        setBackend(`direct (${cfg.activeProvider})`);
        const m: Record<string, ModelInfo[]> = {};
        m[cfg.activeProvider] = [{ id: cfg.activeModel, name: cfg.activeModel, provider: cfg.activeProvider }];
        setModels(m);
      } else {
        setStatus("disconnected");
      }
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
    const cfg = getConfig();
    // If WebSocket is open, use it
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "message", content: text }));
      return;
    }
    // Otherwise use direct mode
    if (!hasAnyKey()) {
      onErrorRef.current?.("No API keys configured. Open settings to add one.");
      showToast("No API key configured", "error");
      return;
    }
    const tokenCb = onTokenRef.current;
    const doneCb = onDoneRef.current;
    const errorCb = onErrorRef.current;
    if (!tokenCb) return;

    (async () => {
      try {
        let full = "";
        for await (const chunk of directChat([{ role: "user", content: text }])) {
          full += chunk;
          tokenCb(chunk);
        }
        doneCb?.("");
        setBackend(`direct (${cfg.activeProvider})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorCb?.(msg);
        showToast(msg, "error");
      }
    })();
  }, [showToast]);

  const sendCommand = useCallback((cmd: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "command", content: cmd }));
    } else if (cmd.startsWith("model:") || cmd.startsWith("backend:")) {
      // In direct mode, update config for model switch
      if (cmd.startsWith("model:")) {
        const parts = cmd.split(":");
        if (parts.length >= 3) {
          const bk = parts[1];
          const mdl = parts.slice(2).join(":");
          const cur = getConfig();
          saveConfig({ ...cur, activeProvider: bk as DirectConfig["activeProvider"], activeModel: mdl });
          setBackend(`direct (${bk})`);
          setModels((prev) => {
            const next = { ...prev };
            next[bk] = [{ id: mdl, name: mdl, provider: bk }];
            return next;
          });
        }
      }
    }
  }, []);

  const switchModel = useCallback((backendName: string, modelId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "command", content: `model:${backendName}:${modelId}` }));
    } else {
      const cur = getConfig();
      saveConfig({ ...cur, activeProvider: backendName as DirectConfig["activeProvider"], activeModel: modelId });
      setBackend(`direct (${backendName})`);
      setModels((prev) => {
        const next = { ...prev };
        const found = Object.keys(next).length > 0;
        if (!found) {
          next[backendName] = [{ id: modelId, name: modelId, provider: backendName }];
        }
        return next;
      });
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
