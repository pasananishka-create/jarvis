import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJarvis } from "../hooks/useJarvis";
import type { Message, BackendInfo, ModelInfo } from "../types";
import Header from "./Header";
import CentralRing from "./CentralRing";
import InputBar from "./InputBar";

type ChatState = "idle" | "listening" | "processing" | "responding" | "error";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function WordByWordText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [visible, setVisible] = useState(0);
  const words = text.split(" ");
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    setVisible(0);
    timerRef.current = setInterval(() => {
      setVisible((v) => {
        if (v >= words.length) {
          clearInterval(timerRef.current);
          return words.length;
        }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [text, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="whitespace-pre-wrap break-words">
      {words.slice(0, visible).join(" ")}
      {visible < words.length && (
        <motion.span
          className="inline-block w-[2px] h-[14px] sm:h-4 bg-[#00D4FF]/60 ml-0.5 align-text-bottom"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        />
      )}
    </span>
  );
}

function MessagesList({
  messages,
  reduced,
  onRespondingDone,
}: {
  messages: Message[];
  reduced: boolean;
  onRespondingDone: () => void;
}) {
  const lastMsg = messages[messages.length - 1];
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (lastMsg && lastMsg.role === "assistant") {
      setRespondingId(lastMsg.id);
      const wordCount = lastMsg.content.split(" ").length;
      const timer = setTimeout(
        () => {
          setRespondingId(null);
          onRespondingDone();
        },
        reduced ? 100 : wordCount * 20 + 200
      );
      return () => clearTimeout(timer);
    }
  }, [lastMsg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2 sm:space-y-3">
      <AnimatePresence mode="popLayout">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            layout
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut", delay: i * 0.02 }}
          >
            <div
              className={`rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 max-w-[88%] sm:max-w-[78%] md:max-w-[68%] ${
                msg.role === "user"
                  ? "bg-[#00D4FF]/8 border border-[#00D4FF]/15 text-[#E8F4F8]"
                  : "border border-white/[0.06] text-[#E8F4F8]/85"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-mono tracking-[0.15em] text-[#00D4FF]/40 uppercase">
                    Jarvis
                  </span>
                  <span className="text-[7px] font-mono text-white/10">
                    {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              <p className="text-[14px] sm:text-sm leading-[1.6] sm:leading-relaxed font-sans">
                {msg.role === "assistant" && respondingId === msg.id && !reduced ? (
                  <WordByWordText text={msg.content} />
                ) : (
                  msg.content
                )}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function Chat({ keyboardHeight = 0 }: { keyboardHeight?: number }) {
  const { status, backend, models, sendMessage, sendCommand, switchModel, onToken, onDone, onError } = useJarvis();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamTextRef = useRef("");
  const reduced = useReducedMotion();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

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
      setStreamingText("");
      streamTextRef.current = "";
      setThinking(false);
      setErrorMsg(null);
    });

    onError((err) => {
      setErrorMsg(err);
      setChatState("error");
      setThinking(false);
      setTimeout(() => setChatState("idle"), 3000);
    });
  }, [onToken, onDone, onError]);

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
      setThinking(true);
      setChatState("processing");
      setErrorMsg(null);
      sendMessage(text);
      scrollToBottom();
    },
    [sendMessage, scrollToBottom]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setChatState("idle");
    sendCommand("clear");
  }, [sendCommand]);

  const handleSwitchBackend = useCallback(
    (name: string) => sendCommand(`backend:${name}`),
    [sendCommand]
  );

  const handleSwitchModel = useCallback(
    (backendName: string, modelId: string) => switchModel(backendName, modelId),
    [switchModel]
  );

  useEffect(() => {
    if (thinking && !streamingText) {
      setChatState("processing");
    } else if (thinking && streamingText) {
      setChatState("responding");
    } else if (!thinking && messages.length > 0) {
      setChatState("idle");
    }
  }, [thinking, streamingText, messages.length]);

  const hasMessages = messages.length > 0;

  const backendInfo: BackendInfo = {
    active: backend,
    available: Object.keys(models),
    models,
  };

  return (
    <div className="flex flex-1 min-w-0">
      <div className="flex flex-col flex-1 min-w-0" style={{ paddingBottom: keyboardHeight }}>
        <Header
          status={status}
          backendInfo={backendInfo}
          models={models}
          onClear={handleClear}
          onSwitchBackend={handleSwitchBackend}
          onSwitchModel={handleSwitchModel}
        />

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 scroll-smooth overscroll-contain">
          <div className="max-w-3xl mx-auto">
            {/* Central element - shown when no messages */}
            {!hasMessages && !thinking && (
              <div className="flex flex-col items-center justify-center pt-16 sm:pt-24 pb-8 sm:pb-12">
                <CentralRing state="idle" />
                <motion.p
                  className="mt-12 text-[10px] font-mono tracking-[0.2em] text-[#00D4FF]/25"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  SYSTEM STANDBY
                </motion.p>
              </div>
            )}

            {/* Central element during thinking (no prior messages) */}
            {!hasMessages && thinking && (
              <div className="flex flex-col items-center justify-center pt-16 sm:pt-24 pb-8 sm:pb-12">
                <CentralRing state={streamingText ? "responding" : "processing"} />
              </div>
            )}

            {/* Messages */}
            {hasMessages && (
              <div className="pt-4 sm:pt-6">
                <MessagesList
                  messages={messages}
                  reduced={reduced}
                  onRespondingDone={() => {}}
                />

                {/* Thinking/processing indicators */}
                <AnimatePresence>
                  {thinking && (
                    <motion.div
                      className="flex justify-start py-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex items-center gap-2 border border-white/[0.06] rounded-lg px-3 py-2">
                        <div className="relative w-6 h-6">
                          <CentralRing state={streamingText ? "responding" : "processing"} />
                        </div>
                        {streamingText ? (
                          <span className="text-[12px] font-sans text-[#E8F4F8]/60">
                            {streamingText}
                            <motion.span
                              className="inline-block w-[2px] h-[14px] bg-[#00D4FF]/50 ml-0.5 align-text-bottom"
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                            />
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono tracking-[0.15em] text-[#00D4FF]/40">
                            PROCESSING
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="inline-block"
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                              >
                                .
                              </motion.span>
                            ))}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error state */}
                <AnimatePresence>
                  {chatState === "error" && errorMsg && (
                    <motion.div
                      className="flex justify-center py-3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <div className="flex items-center gap-2 px-3 py-2 border border-red-400/20 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400/50" />
                        <span className="text-[11px] font-mono text-red-400/50">
                          Connection error — retrying...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <InputBar onSend={handleSend} disabled={thinking} />
      </div>
    </div>
  );
}
