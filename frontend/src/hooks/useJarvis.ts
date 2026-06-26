import { useEffect, useRef, useCallback, useState } from "react";
import type { ConnectionStatus } from "../types";

export function useJarvis() {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [backend, setBackend] = useState("unknown");
  const onTokenRef = useRef<((token: string) => void) | null>(null);
  const onDoneRef = useRef<((backend: string) => void) | null>(null);
  const onErrorRef = useRef<((error: string) => void) | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setStatus("connected");
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
          case "status":
            if (data.content === "memory_cleared") {
              // Memory cleared — UI can react
            }
            break;
          case "backend_changed":
            if (data.active) setBackend(data.active);
            if (data.reason) {
              console.info(`Backend changed: ${data.reason}`);
            }
            break;
          case "error":
            onErrorRef.current?.(data.content);
            break;
        }
      } catch {
        // ignore
      }
    };
  }, []);

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

  const onToken = useCallback((fn: (token: string) => void) => {
    onTokenRef.current = fn;
  }, []);

  const onDone = useCallback((fn: (backend: string) => void) => {
    onDoneRef.current = fn;
  }, []);

  const onError = useCallback((fn: (error: string) => void) => {
    onErrorRef.current = fn;
  }, []);

  return { status, backend, sendMessage, sendCommand, onToken, onDone, onError };
}
