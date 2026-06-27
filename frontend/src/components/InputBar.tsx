import { useState, useRef, useEffect, useCallback } from "react";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
  onFocusChange?: (focused: boolean) => void;
  modelLabel?: string;
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

export default function InputBar({ onSend, disabled, onFocusChange, modelLabel }: InputBarProps) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
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
    r.interimResults = true;
    r.lang = "en-US";
    recognitionRef.current = r;
    listeningRef.current = true;
    setListening(true);

    r.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0].transcript;
          setText((prev) => prev ? prev + " " + t : t);
          setTimeout(() => inputRef.current?.focus(), 0);
          stopListening();
          return;
        }
      }
    };
    r.onerror = () => stopListening();
    r.onend = () => { if (listeningRef.current) stopListening(); };
    try { r.start(); } catch { stopListening(); }
  }, [listening, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  const canSubmit = text.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/[0.04] bg-black/90 safe-bottom gpu-layer"
    >
      {modelLabel && (
        <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-1.5">
          <span className="text-[7px] font-mono tracking-[0.15em] text-white/10 truncate block">
            {modelLabel}
          </span>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-2 sm:px-6 py-2 flex gap-2 items-center" style={{ minHeight: 56 }}>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder="Message Jarvis..."
            disabled={disabled}
            enterKeyHint="send"
            className="w-full bg-[#080C10] border border-white/[0.06] rounded-lg px-3.5 py-3 sm:py-3 text-[16px] sm:text-sm text-[#E8F4F8]/85 placeholder-white/10 focus:outline-none focus:border-[#00D4FF]/25 transition-colors disabled:opacity-30 font-sans min-h-[48px]"
          />
        </div>

        <button
          type="button"
          onClick={toggleMic}
          disabled={disabled}
          className={`shrink-0 rounded-lg border transition-all flex items-center justify-center min-h-[48px] min-w-[48px] ${
            listening
              ? "bg-red-500/10 border-red-400/30 text-red-400"
              : "bg-[#080C10] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-[#00D4FF]/15"
          } disabled:opacity-25`}
          title={listening ? "Stop recording" : "Voice input"}
        >
          {listening
            ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-14 0M12 2a5 5 0 00-5 5v4a5 5 0 0010 0V7a5 5 0 00-5-5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.5 20.5h13" /></svg>
          }
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`shrink-0 rounded-lg border transition-all flex items-center justify-center min-h-[48px] min-w-[48px] ${
            canSubmit
              ? "bg-[#00D4FF]/8 border-[#00D4FF]/25 text-[#00D4FF]"
              : "bg-[#080C10] border-white/[0.06] text-white/12"
          } disabled:opacity-15 disabled:cursor-not-allowed`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
}
