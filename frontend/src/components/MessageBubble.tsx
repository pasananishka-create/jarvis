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
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2.5 sm:mb-3.5`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.05, 0.3),
      }}
    >
      <motion.div
        className={`rounded-2xl px-3.5 sm:px-4.5 py-2.5 sm:py-3 ${
          isUser
            ? "bg-jarvis/8 border border-jarvis/20 text-white/90 max-w-[82%] sm:max-w-[72%] md:max-w-[62%]"
            : "glass-panel text-white/85 max-w-[90%] sm:max-w-[82%] md:max-w-[72%]"
        }`}
        whileHover={{ borderColor: isUser ? "rgba(0, 212, 255, 0.3)" : "rgba(0, 212, 255, 0.12)" }}
        transition={{ duration: 0.2 }}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-jarvis/15 border border-jarvis/25 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-jarvis/60" />
            </div>
            <span className="text-[9px] font-semibold tracking-[0.2em] text-jarvis/50 uppercase">
              Jarvis
            </span>
            <span className="text-[8px] text-white/15 font-mono">
              {new Date(message.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
        <p className="text-[13px] sm:text-sm leading-[1.65] sm:leading-relaxed whitespace-pre-wrap break-words text-balance">
          {message.content}
        </p>
      </motion.div>
    </motion.div>
  );
}
