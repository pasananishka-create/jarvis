import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && !focused) textareaRef.current?.focus();
  }, [disabled, focused]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
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
      handleSubmit();
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="relative z-10 input-glass safe-bottom"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-5 py-2 sm:py-3.5 flex gap-1.5 sm:gap-3 items-end">
        <div className="flex-1 relative">
          {focused && (
            <>
              <div className="absolute -inset-[2px] rounded-xl opacity-40 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.2), transparent 30%, transparent 70%, rgba(0,212,255,0.1))", animation: "energyBorder 2s ease-in-out infinite" }} />
              <div className="absolute -inset-[1px] rounded-xl opacity-20 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(0,100,255,0.15), transparent 50%)", filter: "blur(8px)" }} />
            </>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="╰▸ Message Jarvis..."
            disabled={disabled}
            rows={1}
            inputMode="text"
            enterKeyHint="send"
            className={`w-full bg-white/[0.04] border rounded-xl px-3 sm:px-4 py-3 sm:py-3 pr-10 text-[15px] sm:text-sm text-white/85 placeholder-white/15 focus:outline-none transition-all duration-300 disabled:opacity-30 resize-none overflow-y-auto max-h-[120px] sm:max-h-[140px] leading-relaxed font-sans ${
              focused
                ? "border-jarvis/40 bg-white/[0.07] shadow-[0_0_30px_rgba(0,212,255,0.1)]"
                : "border-white/[0.06] hover:border-white/[0.1]"
            }`}
          />
          <AnimatePresence>
            {text.length > 0 && (
              <motion.div
                className="absolute right-3 bottom-3 text-[9px] font-mono text-white/15 pointer-events-none select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {text.length}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          disabled={disabled || !text.trim()}
          className={`shrink-0 rounded-xl border text-jarvis text-sm font-medium disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center min-h-[44px] sm:min-h-[48px] min-w-[44px] sm:min-w-[48px] ${
            text.trim() && !disabled
              ? "bg-jarvis/15 border-jarvis/40 pulse-border"
              : "bg-jarvis/10 border-jarvis/25"
          }`}
          whileHover={text.trim() && !disabled ? { backgroundColor: "rgba(0, 212, 255, 0.2)", scale: 1.02 } : {}}
          whileTap={text.trim() && !disabled ? { scale: 0.95 } : {}}
        >
          <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </motion.form>
  );
}
