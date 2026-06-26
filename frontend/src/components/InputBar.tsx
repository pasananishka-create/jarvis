import { useState, useRef, useEffect } from "react";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 border-t border-white/5 backdrop-blur-sm bg-bg-dark/80 safe-bottom"
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex gap-1.5 sm:gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-jarvis/40 focus:bg-white/[0.07] transition-all duration-300 disabled:opacity-40 resize-none overflow-y-auto max-h-[160px] leading-relaxed"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="shrink-0 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-jarvis/10 border border-jarvis/30 text-jarvis text-sm font-medium hover:bg-jarvis/20 hover:border-jarvis/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1.5 sm:gap-2 min-h-[42px] sm:min-h-[48px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </form>
  );
}
