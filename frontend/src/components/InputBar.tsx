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
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3.5 flex gap-2 sm:gap-3 items-end">
        <div className="flex-1 relative">
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{
              boxShadow: focused
                ? "0 0 20px rgba(0, 212, 255, 0.08), inset 0 0 20px rgba(0, 212, 255, 0.03)"
                : "0 0 0px rgba(0, 212, 255, 0)",
            }}
            transition={{ duration: 0.3 }}
          />
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
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className={`w-full bg-white/[0.04] border rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm text-white/85 placeholder-white/15 focus:outline-none transition-all duration-300 disabled:opacity-30 resize-none overflow-y-auto max-h-[140px] leading-relaxed font-sans ${
              focused
                ? "border-jarvis/30 bg-white/[0.06]"
                : "border-white/[0.06] hover:border-white/[0.1]"
            }`}
          />
          <AnimatePresence>
            {text.length > 0 && (
              <motion.div
                className="absolute right-3 bottom-3 text-[9px] font-mono text-white/15 pointer-events-none"
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
          className="shrink-0 rounded-xl bg-jarvis/10 border border-jarvis/25 text-jarvis text-sm font-medium disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center min-h-[42px] sm:min-h-[48px] min-w-[42px] sm:min-w-[48px]"
          whileHover={text.trim() && !disabled ? { backgroundColor: "rgba(0, 212, 255, 0.18)", borderColor: "rgba(0, 212, 255, 0.4)", scale: 1.02 } : {}}
          whileTap={text.trim() && !disabled ? { scale: 0.95 } : {}}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </motion.form>
  );
}
