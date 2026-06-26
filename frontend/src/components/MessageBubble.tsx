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
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 sm:mb-3`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: "easeInOut",
        delay: Math.min(index * 0.03, 0.2),
      }}
    >
      <div
        className={`rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 max-w-[88%] sm:max-w-[78%] md:max-w-[68%] ${
          isUser
            ? "bg-[#00D4FF]/8 border border-[#00D4FF]/15 text-[#E8F4F8]"
            : "border border-white/[0.06] text-[#E8F4F8]/85"
        }`}
        style={{
          transition: "box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (isUser) {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(0, 212, 255, 0.08)";
          } else {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 8px rgba(0, 212, 255, 0.04)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-mono tracking-[0.15em] text-[#00D4FF]/40 uppercase">
              Jarvis
            </span>
            <span className="text-[7px] font-mono text-white/10">
              {new Date(message.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
        <p className="text-[14px] sm:text-sm leading-[1.6] sm:leading-relaxed font-sans whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
}
