import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`message-enter flex ${isUser ? "justify-end" : "justify-start"} mb-2 sm:mb-3`}>
      <div
        className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${
          isUser
            ? "bg-jarvis/10 border border-jarvis/20 text-white/90 max-w-[85%] sm:max-w-[75%] md:max-w-[65%]"
            : "bg-white/[0.03] border border-white/[0.06] text-white/85 max-w-[92%] sm:max-w-[85%] md:max-w-[75%]"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-jarvis/60 uppercase">Jarvis</span>
            <span className="w-1 h-1 rounded-full bg-jarvis/30" />
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}
