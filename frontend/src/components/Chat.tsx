import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { useJarvis } from "../hooks/useJarvis";
import type { Message, BackendInfo } from "../types";
import Header from "./Header";
import CentralRing from "./CentralRing";
import InputBar from "./InputBar";

type ChatState = "idle" | "listening" | "processing" | "responding" | "error";

const QUICK_ACTIONS = [
  "What can you do?",
  "Tell me a joke",
  "Search the web",
  "What's the time?",
  "Run a command",
  "Summarize this",
];

const SUGGESTIONS: Record<string, string[]> = {
  default: ["Tell me more", "Explain differently", "Give an example"],
};

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

function MessageTime({ ts }: { ts: number }) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return <span className="text-white/12 text-[9px] font-mono tabular-nums">{h}:{m}</span>;
}

function JarvisIcon() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} className="text-[#00D4FF]/30" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={1.5} className="text-[#00D4FF]/40" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth={1.2} className="text-[#00D4FF]/25" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" className="text-[#00D4FF]/50" />
    </svg>
  );
}

function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-[#00D4FF]/40 inline-block"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
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

function MessageContent({ content }: { content: string }) {
  const parts: { type: "code" | "text"; value: string }[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > last) parts.push({ type: "text", value: content.slice(last, match.index) });
    parts.push({ type: "code", value: match[2] });
    last = match.index + match[0].length;
  }
  if (last < content.length) parts.push({ type: "text", value: content.slice(last) });

  if (parts.length === 0) parts.push({ type: "text", value: content });

  return (
    <>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <pre
            key={i}
            className="bg-[#080C10] border border-white/[0.04] rounded-lg p-3 my-2 overflow-x-auto text-[12px] leading-[1.5] font-mono text-[#E8F4F8]/75 whitespace-pre-wrap"
          >
            {part.value}
          </pre>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </>
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
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const animatedRef = useRef<Set<string>>(new Set());

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

  // GSAP stagger for new messages
  useEffect(() => {
    if (reduced) return;
    const els: HTMLDivElement[] = [];
    msgRefs.current.forEach((el, id) => {
      if (!animatedRef.current.has(id)) {
        els.push(el);
        animatedRef.current.add(id);
      }
    });
    if (els.length === 0) return;
    gsap.from(els, {
      opacity: 0,
      y: 16,
      scale: 0.98,
      duration: 0.35,
      stagger: 0.04,
      ease: "power2.out",
    });
  }, [messages, reduced]);

  const setMsgRef = (id: string, el: HTMLDivElement | null) => {
    if (el) msgRefs.current.set(id, el);
    else msgRefs.current.delete(id);
  };

  return (
    <div ref={listRef} className="min-h-0">
      {messages.map((msg) => (
        <div
          key={msg.id}
          ref={(el) => setMsgRef(msg.id, el)}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3 sm:mb-4`}
        >
          <div
            className={`flex gap-2.5 max-w-[90%] sm:max-w-[80%] md:max-w-[75%] ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
              {msg.role === "assistant" ? (
                <div className="w-[22px] h-[22px] rounded-full bg-[#00D4FF]/8 border border-[#00D4FF]/15 flex items-center justify-center">
                  <JarvisIcon />
                </div>
              ) : (
                <div className="w-[22px] h-[22px] rounded-full bg-[#00D4FF]/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#00D4FF]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div
                className={`${
                  msg.role === "user"
                    ? "bg-[#00D4FF]/8 border-l-2 border-[#00D4FF]/25 text-[#E8F4F8] rounded-r-lg"
                    : "text-[#E8F4F8]/90"
                } px-3.5 sm:px-4 py-2.5 sm:py-3`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono tracking-[0.1em] text-[#00D4FF]/40">J.A.R.V.I.S.</span>
                    <MessageTime ts={msg.timestamp} />
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono tracking-[0.1em] text-white/20">YOU</span>
                    <MessageTime ts={msg.timestamp} />
                  </div>
                )}
                <p className="text-[14px] sm:text-sm leading-[1.7] sm:leading-relaxed font-sans">
                  {msg.role === "assistant" && respondingId === msg.id && !reduced ? (
                    <WordByWordText text={msg.content} reduced={reduced} />
                  ) : (
                    <MessageContent content={msg.content} />
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SuggestionChips({ onSelect }: { onSelect: (text: string) => void }) {
  const chips = SUGGESTIONS.default;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-3 sm:-mx-6 px-3 sm:px-6">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="shrink-0 text-[10px] font-mono tracking-[0.05em] text-white/30 hover:text-[#00D4FF]/60 border border-white/[0.06] hover:border-[#00D4FF]/20 rounded-full px-3.5 py-2 transition-all whitespace-nowrap min-h-[36px]"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

export default function Chat({ keyboardHeight = 0 }: { keyboardHeight?: number }) {
  const { status, backend, models, toast, sendMessage, sendCommand, switchModel, onToken, onDone, onError, dismissToast, setBackendUrl } = useJarvis();
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
  const showCentral = !hasMessages;
  const keyboardOpen = keyboardHeight > 0 || inputFocused;

  const backendInfo: BackendInfo = {
    active: backend,
    available: Object.keys(models),
    models,
  };
  const currentModel = backend.includes("(") ? backend.split("(")[1]?.replace(")", "") : backend;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black" style={{ paddingBottom: keyboardHeight }}>
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
        onSetBackendUrl={setBackendUrl}
      />

      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence>
          {showCentral && (
            <motion.div
              className="flex items-center justify-center overflow-hidden gpu-layer"
              style={{ pointerEvents: "none" }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                minHeight: keyboardOpen ? "20vh" : "30vh",
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <CentralRing state={chatState} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome state — shown when no messages */}
        <AnimatePresence>
          {!hasMessages && !thinking && (
            <motion.div
              className="flex flex-col items-center px-4 pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.p
                className="text-[11px] font-mono tracking-[0.08em] text-[#00D4FF]/25 mb-5 text-center leading-relaxed max-w-xs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Mission-capable AI intelligence system. How may I assist you today?
              </motion.p>

              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {QUICK_ACTIONS.map((action, i) => (
                  <motion.button
                    key={action}
                    onClick={() => handleSend(action)}
                    className="text-[10px] font-mono tracking-[0.05em] text-white/25 hover:text-[#00D4FF]/50 border border-white/[0.05] hover:border-[#00D4FF]/15 rounded-full px-3.5 py-2 transition-all min-h-[36px]"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + i * 0.06 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {action}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation thread */}
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
                      className="flex justify-start py-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex gap-2.5 max-w-[90%] sm:max-w-[80%] md:max-w-[75%]">
                        <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                          <div className="w-[22px] h-[22px] rounded-full bg-[#00D4FF]/8 border border-[#00D4FF]/15 flex items-center justify-center">
                            <JarvisIcon />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[#E8F4F8]/90 px-3.5 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-mono tracking-[0.1em] text-[#00D4FF]/40">J.A.R.V.I.S.</span>
                            </div>
                            <p className="text-[14px] sm:text-sm leading-relaxed font-sans">
                              {streamingText ? (
                                <>{streamingText}<motion.span
                                  className="inline-block w-[2px] h-[14px] bg-[#00D4FF]/50 ml-0.5 align-text-bottom gpu-layer"
                                  animate={{ opacity: [1, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                /></>
                              ) : (
                                <span className="inline-flex items-center text-[11px] font-mono tracking-[0.05em] text-[#00D4FF]/30">
                                  Processing<BouncingDots />
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Suggestion chips after response */}
                {!thinking && hasMessages && messages[messages.length - 1]?.role === "assistant" && (
                  <motion.div
                    className="mt-3 mb-1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <SuggestionChips onSelect={handleSend} />
                  </motion.div>
                )}

                {/* Error state */}
                <AnimatePresence>
                  {chatState === "error" && errorMsg && (
                    <motion.div
                      className="flex justify-center py-3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <div className="flex items-center gap-2 px-3 py-2 border border-red-400/15 rounded-lg max-w-[90%]">
                        <div className="w-1 h-1 rounded-full bg-red-400/40 shrink-0" />
                        <span className="text-[10px] font-mono text-red-400/40 leading-relaxed">
                          {errorMsg}
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

      <InputBar onSend={handleSend} modelLabel={currentModel} disabled={thinking} onFocusChange={setInputFocused} />
    </div>
  );
}
