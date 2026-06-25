import { useState, useRef, useEffect } from "react";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 border-t border-white/5 backdrop-blur-sm bg-bg-dark/80"
    >
      <div className="max-w-4xl mx-auto px-4 py-3 md:py-4 flex gap-2 md:gap-3">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            disabled={disabled}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-jarvis/40 focus:bg-white/[0.07] transition-all duration-300 disabled:opacity-40"
          />
          <div className="absolute inset-0 rounded-xl pointer-events-none border border-jarvis/0 focus-within:border-jarvis/20 transition-all duration-500" />
        </div>
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-jarvis/10 border border-jarvis/30 text-jarvis text-sm font-medium hover:bg-jarvis/20 hover:border-jarvis/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span className="hidden md:inline">Send</span>
        </button>
      </div>
    </form>
  );
}
