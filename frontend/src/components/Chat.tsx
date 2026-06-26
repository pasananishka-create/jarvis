import { useState, useRef, useEffect, useCallback } from "react";
import { useJarvis } from "../hooks/useJarvis";
import type { Message, BackendInfo } from "../types";
import Header from "./Header";
import HolographicRing from "./HolographicRing";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2 sm:mb-3">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-jarvis/40"
            style={{
              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Chat() {
  const { status, backend, sendMessage, sendCommand, onToken, onDone } = useJarvis();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "Good morning, sir. I am J.A.R.V.I.S. — your personal AI assistant. How may I be of service?",
      timestamp: Date.now(),
    },
  ]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamTextRef = useRef("");

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    fetch("/api/backends")
      .then((r) => r.json())
      .then((data) => setBackendInfo(data))
      .catch(() => {});
  }, [backend]);

  useEffect(() => {
    onToken((token) => {
      streamTextRef.current += token;
      setStreamingText(streamTextRef.current);
    });

    onDone((bck) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: streamTextRef.current,
          timestamp: Date.now(),
        },
      ]);
      setStreamingId(null);
      setStreamingText("");
      streamTextRef.current = "";
      setThinking(false);
      setBackendInfo((prev) => (prev ? { ...prev, active: bck } : prev));
    });
  }, [onToken, onDone]);

  const handleSend = useCallback(
    (text: string) => {
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      streamTextRef.current = "";
      setStreamingText("");
      const sid = `s-${Date.now()}`;
      setStreamingId(sid);
      setThinking(true);
      sendMessage(text);
      scrollToBottom();
    },
    [sendMessage, scrollToBottom]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    sendCommand("clear");
  }, [sendCommand]);

  const handleSwitchBackend = useCallback(
    (name: string) => {
      sendCommand(`backend:${name}`);
      setBackendInfo((prev) => (prev ? { ...prev, active: name } : prev));
    },
    [sendCommand]
  );

  return (
    <div className="flex flex-col h-full safe-bottom">
      <Header
        status={status}
        backendInfo={backendInfo}
        onClear={handleClear}
        onSwitchBackend={handleSwitchBackend}
      />

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 scroll-smooth overscroll-contain">
        <div className="max-w-4xl mx-auto">
          <HolographicRing
            active={status === "connected"}
            listening={thinking}
          />

          <div className="pb-2 sm:pb-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {thinking && streamingId && (
              streamingText ? (
                <div className="flex justify-start mb-2 sm:mb-3">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words max-w-[92%] sm:max-w-[85%] md:max-w-[75%]">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 bg-jarvis/60 ml-0.5 animate-pulse" />
                  </div>
                </div>
              ) : (
                <TypingIndicator />
              )
            )}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      <InputBar onSend={handleSend} disabled={thinking} />
    </div>
  );
}
