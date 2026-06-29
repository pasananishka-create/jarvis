import { useState, useRef, useEffect, useCallback } from "react";

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data?: string;
  fileId?: string;
}

interface InputBarProps {
  onSend: (text: string, files?: FileAttachment[]) => void;
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

let fileIdCounter = 0;

export default function InputBar({ onSend, disabled, onFocusChange, modelLabel }: InputBarProps) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles: FileAttachment[] = [];
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      let data: string | undefined;
      if (f.type.startsWith("text/") || f.name.endsWith(".md") || f.name.endsWith(".json") || f.name.endsWith(".csv") || f.name.endsWith(".txt") || f.name.endsWith(".py") || f.name.endsWith(".ts") || f.name.endsWith(".tsx") || f.name.endsWith(".js") || f.name.endsWith(".jsx") || f.name.endsWith(".html") || f.name.endsWith(".css") || f.name.endsWith(".xml") || f.name.endsWith(".yaml") || f.name.endsWith(".yml")) {
        data = await f.text();
      }
      newFiles.push({
        id: `file_${++fileIdCounter}`,
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        data,
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setText("");
    setFiles([]);
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
          stopListening();
          setTimeout(() => {
            if (t) onSend(t);
            setText("");
            inputRef.current?.focus();
          }, 100);
          return;
        }
      }
    };
    r.onerror = () => stopListening();
    r.onend = () => { if (listeningRef.current) stopListening(); };
    try { r.start(); } catch { stopListening(); }
  }, [listening, stopListening, onSend]);

  useEffect(() => () => stopListening(), [stopListening]);

  const canSubmit = (text.trim().length > 0 || files.length > 0) && !disabled;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/[0.08] bg-[#1A1A1A] safe-bottom"
    >
      {modelLabel && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-1.5">
          <span className="text-[7px] font-mono tracking-[0.2em] text-white/20 truncate block">
            {modelLabel}
          </span>
        </div>
      )}

      {files.length > 0 && (
        <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-[11px] font-mono text-white/70"
            >
              <svg className="w-3 h-3 shrink-0 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="truncate max-w-[120px]">{f.name}</span>
              <span className="text-white/30 ml-0.5">({formatSize(f.size)})</span>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="text-white/30 hover:text-white/70 ml-0.5 p-0.5"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 flex gap-2 items-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0 rounded-lg border border-white/[0.12] bg-[#222222] text-white/40 hover:text-white/70 hover:border-white/25 transition-all flex items-center justify-center min-h-[48px] min-w-[48px] disabled:opacity-25"
          title="Attach file"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.txt,.md,.json,.csv,.yaml,.yml,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.rs,.go,.rb,.sh,.bat,.log,.toml,.env,.svg,.png,.jpg,.jpeg,.gif"
        />

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={files.length > 0 ? "What should I do with this file?" : "Message..."}
            disabled={disabled}
            enterKeyHint="send"
            className="w-full bg-[#222222] border border-white/[0.12] rounded-lg px-4 py-3 text-[16px] sm:text-sm text-white/85 placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-30 font-sans min-h-[48px]"
          />
        </div>

        <button
          type="button"
          onClick={toggleMic}
          disabled={disabled}
          className={`shrink-0 rounded-lg border transition-all flex items-center justify-center min-h-[48px] min-w-[48px] ${
            listening
              ? "bg-white/15 border-white/40 text-white"
              : "bg-[#222222] border-white/[0.12] text-white/40 hover:text-white/70 hover:border-white/25"
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
              ? "bg-white text-black border-white"
              : "bg-[#222222] border-white/[0.12] text-white/20"
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
