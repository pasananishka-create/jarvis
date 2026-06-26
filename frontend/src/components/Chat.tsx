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

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <motion.div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-[10px] font-mono tracking-wider shadow-lg gpu-layer"
      style={{
        backgroundColor: type === "success" ? "rgba(0, 212, 255, 0.06)" : "rgba(232, 79, 79, 0.06)",
        borderColor: type === "success" ? "rgba(0, 212, 255, 0.15)" : "rgba(232, 79, 79, 0.15)",
        color: type === "success" ? "rgba(0, 212, 255, 0.6)" : "rgba(232, 79, 79, 0.6)",
      }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      {message}
    </motion.div>
  );
}

function WordByWordText({ text, speed = 20, reduced }: { text: string; speed?: number; reduced: boolean }) {
  const [visible, setVisible] = useState(0);
  const words = text.split(" ");
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    setVisible(0);
    if (reduced) { setVisible(words.length); return; }
    timerRef.current = setInterval(() => {
      setVisible((v) => {
        if (v >= words.length) { clearInterval(timerRef.current); return words.length; }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [text, speed, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="whitespace-pre-wrap break-words">
      {words.slice(0, visible).join(" ")}
      {visible < words.length && (
        <motion.span
          className="inline-block w-[2px] h-[14px] sm:h-4 bg-[#00D4FF]/50 ml-0.5 align-text-bottom gpu-layer"
          animate={reduced ? {} : { opacity: [1, 0] }}
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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMsg && lastMsg.role === "assistant") {
      setRespondingId(lastMsg.id);
      const wordCount = lastMsg.content.split(" ").length;
      const timer = setTimeout(() => {
        setRespondingId(null);
        onRespondingDone();
      }, reduced ? 100 : wordCount * 20 + 200);
      return () => clearTimeout(timer);
    }
  }, [lastMsg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={listRef} className="min-h-0">
      <AnimatePresence mode="popLayout">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-2 sm:mb-3`}
            layout
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut", delay: i * 0.02 }}
          >
            <div
              className={`${
                msg.role === "user"
                  ? "bg-[#00D4FF]/6 border-l-2 border-[#00D4FF]/30 text-[#E8F4F8]"
                  : "text-[#E8F4F8]/85"
              } px-3 sm:px-4 py-2 sm:py-2.5 max-w-[88%] sm:max-w-[78%] md:max-w-[72%]`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-mono tracking-[0.1em] text-[#00D4FF]/35">
                    J.A.R.V.I.S. &gt;
                  </span>
                </div>
              )}
              <p className="text-[14px] sm:text-sm leading-[1.6] sm:leading-relaxed font-sans">
                {msg.role === "assistant" && respondingId === msg.id && !reduced ? (
                  <WordByWordText text={msg.content} reduced={reduced} />
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
  const { status, backend, models, toast, sendMessage, sendCommand, switchModel, onToken, onDone, onError, dismissToast } = useJarvis();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const streamTextRef = useRef("");
  const reduced = useReducedMotion();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      const el = document.querySelector("[data-thread]");
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
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
  const showCentral = !hasMessages || (hasMessages && !thinking);
  const keyboardOpen = keyboardHeight > 0 || inputFocused;

  const backendInfo: BackendInfo = {
    active: backend,
    available: Object.keys(models),
    models,
  };

  return (
    <div className="flex flex-col h-full bg-black" style={{ paddingBottom: keyboardHeight }}>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
      </AnimatePresence>

      <Header
        status={status}
        backendInfo={backendInfo}
        models={models}
        onClear={handleClear}
        onSwitchBackend={handleSwitchBackend}
        onSwitchModel={handleSwitchModel}
      />

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Central Ring — visible when idle, compresses on keyboard */}
        <AnimatePresence>
          {showCentral && (
            <motion.div
              className="flex items-center justify-center overflow-hidden gpu-layer"
              style={{ pointerEvents: "none" }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                minHeight: keyboardOpen ? "15vh" : hasMessages ? "20vh" : "35vh",
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <CentralRing state={thinking && streamingText ? "responding" : chatState} />

              {/* Standby label — only when truly idle */}
              {!hasMessages && !thinking && chatState === "idle" && (
                <motion.p
                  className="absolute bottom-4 text-[8px] font-mono tracking-[0.2em] text-[#00D4FF]/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  STANDBY
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation thread — bottom-anchored */}
        <div
          data-thread
          className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 scroll-smooth overscroll-contain gpu-layer"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="max-w-3xl mx-auto">
            {hasMessages && (
              <div className="pt-4 sm:pt-6 pb-2">
                <MessagesList
                  messages={messages}
                  reduced={reduced}
                  onRespondingDone={() => {}}
                />

                {/* Inline streaming indicator */}
                <AnimatePresence>
                  {thinking && (
                    <motion.div
                      className="flex justify-start py-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="text-[#E8F4F8]/85 px-3 sm:px-4 py-2 max-w-[88%] sm:max-w-[78%]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-mono tracking-[0.1em] text-[#00D4FF]/35">
                            J.A.R.V.I.S. &gt;
                          </span>
                        </div>
                        <p className="text-[14px] sm:text-sm leading-relaxed font-sans">
                          {streamingText ? (
                            <>{streamingText}<motion.span
                              className="inline-block w-[2px] h-[14px] bg-[#00D4FF]/50 ml-0.5 align-text-bottom gpu-layer"
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                            /></>
                          ) : (
                            <span className="text-[10px] font-mono tracking-[0.15em] text-[#00D4FF]/30 uppercase">
                              Processing
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="inline-block"
                                  animate={{ opacity: [0, 1, 0] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                                >.</motion.span>
                              ))}
                            </span>
                          )}
                        </p>
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
                      <div className="flex items-center gap-2 px-3 py-2 border border-red-400/15 rounded-lg">
                        <div className="w-1 h-1 rounded-full bg-red-400/40" />
                        <span className="text-[10px] font-mono text-red-400/40">
                          Connection error — retrying...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <InputBar onSend={handleSend} disabled={thinking} onFocusChange={setInputFocused} />
    </div>
  );
}
