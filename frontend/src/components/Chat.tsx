import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { useJarvis } from "../hooks/useJarvis";
import { useSpeech } from "../hooks/useSpeech";
import type { Message, BackendInfo } from "../types";
import Header from "./Header";
import CentralRing from "./CentralRing";
import InputBar from "./InputBar";
import SkillsPanel from "./SkillsPanel";

type ChatState = "idle" | "listening" | "processing" | "responding" | "error";

const QUICK_ACTIONS = [
  "What can you do?",
  "Tell me a joke",
  "What's the time?",
  "Run a command",
];

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
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border border-white/[0.15] bg-[#222] text-[9px] font-mono tracking-[0.15em]"
      style={{ color: type === "error" ? "rgba(255,68,68,0.8)" : "rgba(255,255,255,0.7)" }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      {message}
    </motion.div>
  );
}

function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] h-[3px] rounded-full bg-white/40 inline-block"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function WordByWordText({ text, speed = 20, reduced }: { text: string; speed?: number; reduced: boolean }) {
  const [visible, setVisible] = useState(0);
  const textRef = useRef(text);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const words = useMemo(() => text.split(" "), [text]);

  if (text !== textRef.current) {
    textRef.current = text;
    if (visible !== 0) setVisible(0);
  }

  useEffect(() => {
    if (reduced) { setVisible(words.length); return; }
    timerRef.current = setInterval(() => {
      setVisible((p) => {
        if (p >= words.length) { clearInterval(timerRef.current); return p; }
        return p + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
    // Only re-run effect when text actually changes value, not reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, speed, text]);

  return <>{words.slice(0, visible).join(" ")}{visible < words.length && <span className="opacity-40">▎</span>}</>;
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3);
          const lang = code.split("\n")[0].trim();
          const body = code.includes("\n") ? code.slice(code.indexOf("\n") + 1) : code;
          return (
            <pre key={i} className="text-[11px] font-mono leading-relaxed text-white/70 my-2 overflow-x-auto border-l border-white/20 pl-3">
              <code>{body || lang}</code>
            </pre>
          );
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      })}
    </>
  );
}

function MessageTime({ ts }: { ts?: number }) {
  if (!ts) return null;
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return (
    <span className="text-[7px] font-mono tracking-[0.1em] text-white/30 whitespace-nowrap">{h}:{m}</span>
  );
}

function MessagesList({
  messages,
  reduced,
  speaking,
  onRespondingDone,
}: {
  messages: Message[];
  reduced: boolean;
  speaking: boolean;
  onRespondingDone: () => void;
}) {
  const lastMsg = messages[messages.length - 1];
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const animatedRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    if (lastMsg && lastMsg.role === "assistant") {
      setRespondingId(lastMsg.id);
      const wordCount = lastMsg.content.split(" ").length;
      const timer = setTimeout(() => {
        setRespondingId(null);
        onRespondingDone();
      }, reduced ? 100 : wordCount * 20 + 200);
      return () => clearTimeout(timer);
    }
  }, [lastMsg?.id]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

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
      y: 12,
      duration: 0.3,
      stagger: 0.03,
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
          className="mb-4 sm:mb-5"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className={`w-[18px] h-[18px] shrink-0 mt-0.5 flex items-center justify-center border ${
                msg.role === "assistant" ? "border-white/25" : "border-white/12"
              }`}>
                {msg.role === "assistant" ? (
                  <motion.svg className="w-[10px] h-[10px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                    animate={speaking ? { opacity: [1, 0.4, 1] } : {}}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  </motion.svg>
                ) : (
                  <svg className="w-[10px] h-[10px] text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-mono tracking-[0.2em] ${
                    msg.role === "assistant" ? "text-white/60" : "text-white/40"
                  }`}>
                    {msg.role === "assistant" ? "J.A.R.V.I.S." : "YOU"}
                  </span>
                  <MessageTime ts={msg.timestamp} />
                </div>
                <p className="text-[14px] sm:text-sm leading-[1.7] sm:leading-relaxed font-sans text-white/90 whitespace-pre-wrap">
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

export default function Chat({ keyboardHeight = 0 }: { keyboardHeight?: number }) {
  const { status, backend, models, toast, sendMessage, sendCommand, onToken, onDone, onError, dismissToast } = useJarvis();
  const { voiceEnabled, toggleVoice, speaking, speak } = useSpeech();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const streamTextRef = useRef("");
  const speakRef = useRef(speak);
  const voiceRef = useRef(voiceEnabled);
  speakRef.current = speak;
  voiceRef.current = voiceEnabled;
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
      const content = streamTextRef.current;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: Date.now(),
        },
      ]);
      setStreamingText("");
      streamTextRef.current = "";
      setThinking(false);
      setErrorMsg(null);
      if (voiceRef.current && content) speakRef.current(content);
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
  const currentModel = backend.includes("(")
    ? backend.split("(")[1]?.replace(")", "").trim() || ""
    : backend;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#1A1A1A]" style={{ paddingBottom: keyboardHeight }}>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
      </AnimatePresence>

      <Header
        status={status}
        backendInfo={backendInfo}
        onClear={handleClear}
        voiceEnabled={voiceEnabled}
        voiceSpeaking={speaking}
        onToggleVoice={toggleVoice}
        onSkillsOpen={() => setSkillsOpen(true)}
      />
      <SkillsPanel open={skillsOpen} onClose={() => setSkillsOpen(false)} status={status} />

      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence>
          {showCentral && (
            <motion.div
              className="flex items-center justify-center overflow-hidden"
              style={{ pointerEvents: "none" }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                minHeight: keyboardOpen ? "20vh" : "35vh",
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <CentralRing state={chatState} />
            </motion.div>
          )}
        </AnimatePresence>

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
                className="text-[10px] font-mono tracking-[0.2em] text-white/30 mb-5 text-center leading-relaxed max-w-xs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                How may I assist you today?
              </motion.p>

              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {QUICK_ACTIONS.map((action, i) => (
                  <motion.button
                    key={action}
                    onClick={() => handleSend(action)}
                    className="text-[9px] font-mono tracking-[0.1em] text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 px-3.5 py-2 transition-all min-h-[36px]"
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

        <div
          data-thread
          className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 scroll-smooth overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="max-w-3xl mx-auto">
            {hasMessages && (
              <div className="pt-4 sm:pt-6 pb-2">
                <MessagesList
                  messages={messages}
                  reduced={reduced}
                  speaking={speaking}
                  onRespondingDone={() => {}}
                />

                <AnimatePresence>
                  {thinking && (
                    <motion.div
                      className="mb-4 sm:mb-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <div className="w-[18px] h-[18px] shrink-0 mt-0.5 flex items-center justify-center border border-white/25">
                            <motion.svg className="w-[10px] h-[10px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                              animate={speaking ? { opacity: [1, 0.4, 1] } : {}}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            >
                              <circle cx="12" cy="12" r="10"/>
                              <circle cx="12" cy="12" r="4"/>
                              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                            </motion.svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[8px] font-mono tracking-[0.2em] text-white/60">J.A.R.V.I.S.</span>
                            </div>
                            <p className="text-[14px] sm:text-sm leading-relaxed font-sans text-white/90 whitespace-pre-wrap">
                              {streamingText ? (
                                <>{streamingText}<motion.span
                                  className="inline-block w-[1.5px] h-[13px] bg-white/50 ml-0.5 align-text-bottom"
                                  animate={{ opacity: [1, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                /></>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-mono tracking-[0.1em] text-white/50">
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

                <AnimatePresence>
                  {chatState === "error" && errorMsg && (
                    <motion.div
                      className="flex justify-center py-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <div className="flex items-center gap-2 px-3 py-2 border border-white/15">
                        <span className="text-[8px] font-mono text-white/50">{errorMsg}</span>
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
