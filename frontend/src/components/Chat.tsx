import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJarvis } from "../hooks/useJarvis";
import type { Message, BackendInfo } from "../types";
import Header from "./Header";
import HolographicRing from "./HolographicRing";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";

function TypingIndicator() {
  return (
    <motion.div
      className="flex justify-start mb-2.5 sm:mb-3.5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="glass-panel rounded-2xl px-4 py-3.5 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-jarvis/50"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function StreamingText({ text }: { text: string }) {
  return (
    <div className="flex justify-start mb-2.5 sm:mb-3.5">
      <div className="glass-panel rounded-2xl px-3.5 sm:px-4.5 py-2.5 sm:py-3 text-white/85 max-w-[90%] sm:max-w-[82%] md:max-w-[72%]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full bg-jarvis/15 border border-jarvis/25 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-jarvis/60" />
          </div>
          <span className="text-[9px] font-semibold tracking-[0.2em] text-jarvis/50 uppercase">Jarvis</span>
        </div>
        <p className="text-[13px] sm:text-sm leading-[1.65] sm:leading-relaxed whitespace-pre-wrap break-words">
          {text}
          <motion.span
            className="inline-block w-[2px] h-[14px] sm:h-4 bg-jarvis/70 ml-0.5 align-text-bottom"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
          />
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  const suggestions = [
    "What can you help me with?",
    "Search the web for latest AI news",
    "Run a Python script",
    "Check my system status",
  ];

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8 sm:py-12 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <motion.p
        className="text-[11px] sm:text-xs font-mono tracking-[0.3em] text-white/20 uppercase mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        How may I assist you?
      </motion.p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md stagger">
        {suggestions.map((s, i) => (
          <motion.button
            key={s}
            className="text-left glass-panel rounded-xl px-3.5 py-2.5 text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all cursor-pointer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ x: 4, borderColor: "rgba(0, 212, 255, 0.2)" }}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const { status, backend, sendMessage, sendCommand, onToken, onDone } = useJarvis();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamTextRef = useRef("");
  const chatRef = useRef<HTMLDivElement>(null);

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

  const hasMessages = messages.length > 0 || thinking;

  return (
    <motion.div
      className="flex flex-col h-full safe-bottom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Header
        status={status}
        backendInfo={backendInfo}
        onClear={handleClear}
        onSwitchBackend={handleSwitchBackend}
      />

      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-3 sm:px-5 md:px-6 scroll-smooth overscroll-contain"
      >
        <div className="max-w-4xl mx-auto">
          <HolographicRing
            active={status === "connected"}
            listening={thinking}
          />

          {!hasMessages ? (
            <EmptyState />
          ) : (
            <motion.div className="pb-4 sm:pb-6" layout>
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => (
                  <MessageBubble key={msg.id} message={msg} index={i} />
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {thinking && streamingId && (
                  streamingText ? (
                    <StreamingText key="streaming" text={streamingText} />
                  ) : (
                    <TypingIndicator key="typing" />
                  )
                )}
              </AnimatePresence>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <InputBar onSend={handleSend} disabled={thinking} />
    </motion.div>
  );
}
