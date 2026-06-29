import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AICore from "./AICore";
import type { ConnectionStatus } from "../types";

interface HomeScreenProps {
  status: ConnectionStatus;
  backendInfo: { active: string; available: string[] };
  onOpenChat: () => void;
  onOpenVoice: () => void;
  onOpenSettings: () => void;
}

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const labels: Record<ConnectionStatus, string> = {
    connected: "System Online",
    connecting: "Establishing Link...",
    direct: "Direct Mode",
    disconnected: "Offline",
  };
  const colors: Record<ConnectionStatus, string> = {
    connected: "#00FFC8",
    connecting: "#FFC857",
    direct: "#3B82F6",
    disconnected: "#FF4B6E",
  };
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: colors[status] }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-[9px] font-mono tracking-[0.2em]" style={{ color: colors[status] }}>
        {labels[status]}
      </span>
    </div>
  );
}

const actions = [
  { icon: "M19 11a7 7 0 01-14 0M12 2a5 5 0 00-5 5v4a5 5 0 0010 0V7a5 5 0 00-5-5zM5.5 20.5h13", label: "Voice", id: "voice" },
  { icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", label: "Chat", id: "chat" },
  { icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", label: "Files", id: "files" },
  { icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", label: "Skills", id: "skills" },
];

export default function HomeScreen({ status, backendInfo, onOpenChat, onOpenVoice, onOpenSettings }: HomeScreenProps) {
  const now = useTime();
  const isBackend = status === "connected";
  const greeting = useMemo(() => Greeting(), []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col items-center justify-between h-full px-5 py-8" style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}>
      {/* Top info */}
      <div className="w-full text-center mt-4">
        <motion.h1
          className="text-[11px] font-mono tracking-[0.35em] text-white/40 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          J.A.R.V.I.S.
        </motion.h1>

        <motion.p
          className="text-[38px] sm:text-[48px] font-light tracking-tight text-white/90 mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
        >
          {time}
        </motion.p>

        <motion.p
          className="text-[11px] font-mono tracking-[0.15em] text-white/40 mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
        >
          {date}
        </motion.p>

        <motion.p
          className="text-[13px] font-sans text-white/50 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          {greeting}
        </motion.p>

        <motion.div
          className="flex justify-center mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
        >
          <StatusIndicator status={status} />
        </motion.div>
      </div>

      {/* AI Core */}
      <motion.div
        className="flex-shrink-0 my-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <AICore state={status === "connected" ? "idle" : status === "connecting" ? "thinking" : "idle"} size={200} />
      </motion.div>

      {/* Quick actions */}
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      >
        <div className="grid grid-cols-4 gap-3 mb-4">
          {actions.map((a, i) => (
            <motion.button
              key={a.id}
              onClick={a.id === "chat" ? onOpenChat : a.id === "voice" ? onOpenVoice : undefined}
              className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(0,229,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
              whileHover={{ scale: 1.05, borderColor: "rgba(0,229,255,0.25)" }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease: "easeOut" }}
            >
              <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d={a.icon} />
              </svg>
              <span className="text-[8px] font-mono tracking-[0.15em] text-white/40">{a.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,229,255,0.06)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[7px] font-mono tracking-[0.2em] text-[#00E5FF]/50 block mb-1">MODEL</span>
            <span className="text-[11px] font-mono text-white/60 truncate block">{backendInfo.active}</span>
          </div>
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,229,255,0.06)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[7px] font-mono tracking-[0.2em] text-[#00E5FF]/50 block mb-1">MODE</span>
            <span className="text-[11px] font-mono text-white/60">{isBackend ? "BACKEND" : "DIRECT"}</span>
          </div>
        </div>

        {/* Settings button */}
        <motion.button
          onClick={onOpenSettings}
          className="w-full mt-3 py-3 rounded-xl flex items-center justify-center gap-2"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(0,229,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
          whileHover={{ borderColor: "rgba(0,229,255,0.2)" }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <span className="text-[10px] font-mono tracking-[0.15em] text-white/40">SETTINGS</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
