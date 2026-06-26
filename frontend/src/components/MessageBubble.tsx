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
        className={`${
          isUser
            ? "bg-[#00D4FF]/6 border-l-2 border-[#00D4FF]/30 text-[#E8F4F8]"
            : "text-[#E8F4F8]/85"
        } px-3 sm:px-4 py-2 sm:py-2.5 max-w-[88%] sm:max-w-[78%] md:max-w-[72%]`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-mono tracking-[0.1em] text-[#00D4FF]/35">
              J.A.R.V.I.S. &gt;
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
