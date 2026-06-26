import { motion } from "framer-motion";
import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  index: number;
}

export default function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 sm:mb-3.5`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.05, 0.3),
      }}
    >
      <motion.div
        className={`rounded-2xl px-3 sm:px-4.5 py-2.5 sm:py-3 hud-corner msg-scan ${
          isUser
            ? "bg-jarvis/8 border border-jarvis/20 text-white/90 max-w-[85%] sm:max-w-[72%] md:max-w-[62%]"
            : "glass-panel text-white/85 max-w-[92%] sm:max-w-[82%] md:max-w-[72%]"
        }`}
        whileHover={{ borderColor: isUser ? "rgba(0, 212, 255, 0.35)" : "rgba(0, 212, 255, 0.15)", boxShadow: isUser ? "0 0 20px rgba(0,212,255,0.06)" : "0 0 12px rgba(0,212,255,0.03)" }}
        transition={{ duration: 0.2 }}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="w-[14px] h-[14px] sm:w-4 sm:h-4 rounded-full bg-jarvis/15 border border-jarvis/25 flex items-center justify-center shrink-0">
              <div className="w-[5px] h-[5px] sm:w-1.5 sm:h-1.5 rounded-full bg-jarvis/60" />
            </div>
            <span className="text-[8px] sm:text-[9px] font-semibold tracking-[0.2em] text-jarvis/50 uppercase">
              Jarvis
            </span>
            <span className="text-[7px] sm:text-[8px] text-white/15 font-mono ml-auto">
              {new Date(message.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
        <p className="text-[14px] sm:text-sm leading-[1.6] sm:leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </motion.div>
    </motion.div>
  );
}
