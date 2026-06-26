import { useState, useRef, useEffect, useCallback } from "react";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* */ }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const toggleMic = useCallback(() => {
    if (listening) { stopListening(); return; }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    recognitionRef.current = r;
    setListening(true);

    r.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0].transcript;
          setText((prev) => prev ? prev + " " + t : t);
          stopListening();
          return;
        }
      }
    };
    r.onerror = () => stopListening();
    r.onend = () => { if (listening) stopListening(); };
    try { r.start(); } catch { stopListening(); }
  }, [listening, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/[0.06] bg-[#080C10]/90 safe-bottom"
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex gap-2 items-center">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message Jarvis..."
            disabled={disabled}
            enterKeyHint="send"
            className="w-full bg-[#0C1018] border border-white/[0.08] rounded-lg px-3 py-2.5 sm:py-3 text-[16px] sm:text-sm text-[#E8F4F8]/85 placeholder-white/12 focus:outline-none focus:border-[#00D4FF]/30 transition-colors disabled:opacity-30 font-sans"
          />
        </div>

        <button
          type="button"
          onClick={toggleMic}
          disabled={disabled}
          className={`shrink-0 rounded-lg border transition-all flex items-center justify-center min-h-[38px] sm:min-h-[42px] min-w-[38px] sm:min-w-[42px] ${
            listening
              ? "bg-red-500/15 border-red-400/40 text-red-400"
              : "bg-[#0C1018] border-white/[0.08] text-white/30 hover:text-white/55 hover:border-[#00D4FF]/20"
          }`}
          title={listening ? "Stop" : "Voice"}
        >
          {listening
            ? <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
            : <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-14 0M12 2a5 5 0 00-5 5v4a5 5 0 0010 0V7a5 5 0 00-5-5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.5 20.5h13" /></svg>
          }
        </button>

        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className={`shrink-0 rounded-lg border transition-all flex items-center justify-center min-h-[38px] sm:min-h-[42px] min-w-[38px] sm:min-w-[42px] ${
            text.trim() && !disabled
              ? "bg-[#00D4FF]/10 border-[#00D4FF]/30 text-[#00D4FF]"
              : "bg-[#0C1018] border-white/[0.08] text-white/15"
          } disabled:opacity-15 disabled:cursor-not-allowed`}
        >
          <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
}
