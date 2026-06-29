import { useEffect, useRef, useCallback, useState } from "react";
import type { ConnectionStatus, ModelInfo } from "../types";
import { directChat, getConfig, saveConfig, hasAnyKey, type DirectConfig } from "../lib/directAi";

function autoUrls(): string[] {
  const urls: string[] = [];
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Current host (works in dev with Vite proxy, or when backend is same host)
  urls.push(`${proto}//${window.location.host}/ws`);
  // Localhost dev server
  urls.push("ws://localhost:8000/ws");
  // LAN common IPs (quick scan common subnets)
  urls.push("ws://127.0.0.1:8000/ws");
  return urls;
}

export function useJarvis() {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [backend, setBackend] = useState("unknown");
  const [models, setModels] = useState<Record<string, ModelInfo[]>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const onTokenRef = useRef<((token: string) => void) | null>(null);
  const onDoneRef = useRef<((backend: string) => void) | null>(null);
  const onErrorRef = useRef<((error: string) => void) | null>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  function buildDirectModels(cfg: DirectConfig) {
    const m: Record<string, ModelInfo[]> = {};
    m[cfg.activeProvider] = [{ id: cfg.activeModel, name: cfg.activeModel, provider: cfg.activeProvider }];
    setModels(m);
  }

  function fallbackToDirect() {
    ws.current = null;
    const cfg = getConfig();
    if (hasAnyKey()) {
      setStatus("direct");
      setBackend(`direct (${cfg.activeProvider})`);
      buildDirectModels(cfg);
    } else {
      setStatus("disconnected");
    }
  }

  const connect = useCallback(() => {
    const urls = autoUrls();
    let index = 0;

    function tryNext() {
      if (index >= urls.length) {
        fallbackToDirect();
        return;
      }
      const url = urls[index++];
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        setStatus("connected");
        socket.send(JSON.stringify({ type: "get_models" }));
      };

      socket.onclose = () => {
        // Only try next URL if this wasn't a successful connection
        tryNext();
      };

      socket.onerror = () => {
        socket.close();
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
                showToast(data.success ? "Model switched" : "Failed to switch model", data.success ? "success" : "error");
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
        } catch { /* ignore */ }
      };
    }

    tryNext();
  }, [showToast]);

  useEffect(() => {
    connect();
    return () => { ws.current?.close(); };
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    const cfg = getConfig();
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "message", content: text }));
      return;
    }
    if (!hasAnyKey()) {
      const label = cfg.activeProvider.charAt(0).toUpperCase() + cfg.activeProvider.slice(1);
      const msg = `No API key for ${label}. Open Settings to add one.`;
      onErrorRef.current?.(msg);
      showToast(msg, "error");
      return;
    }
    const tokenCb = onTokenRef.current;
    const doneCb = onDoneRef.current;
    const errorCb = onErrorRef.current;
    if (!tokenCb) return;

    const msgs = [...historyRef.current, { role: "user" as const, content: text }];

    (async () => {
      try {
        let full = "";
        for await (const chunk of directChat(msgs)) {
          full += chunk;
          tokenCb(chunk);
        }
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: text },
          { role: "assistant", content: full },
        ];
        if (historyRef.current.length > 40) {
          historyRef.current = historyRef.current.slice(-40);
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
      return;
    }
    if (cmd === "clear") { historyRef.current = []; return; }
    if (cmd.startsWith("model:") || cmd.startsWith("backend:")) {
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
      return;
    }
    const cur = getConfig();
    saveConfig({ ...cur, activeProvider: backendName as DirectConfig["activeProvider"], activeModel: modelId });
    setBackend(`direct (${backendName})`);
    setModels((prev) => {
      const next = { ...prev };
      next[backendName] = [{ id: modelId, name: modelId, provider: backendName }];
      return next;
    });
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

  return { status, backend, models, toast, sendMessage, sendCommand, switchModel, onToken, onDone, onError, dismissToast };
}
