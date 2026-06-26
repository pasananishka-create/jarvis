import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectionStatus, BackendInfo } from "../types";

interface HeaderProps {
  status: ConnectionStatus;
  backendInfo: BackendInfo | null;
  onClear: () => void;
  onSwitchBackend: (name: string) => void;
}

function LiveTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[10px] sm:text-xs text-white/30 tracking-wider tabular-nums">
      {time.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colors = {
    connected: { bg: "#4ade80", shadow: "rgba(74, 222, 128, 0.6)" },
    connecting: { bg: "#facc15", shadow: "rgba(250, 204, 21, 0.6)" },
    disconnected: { bg: "#f87171", shadow: "rgba(248, 113, 113, 0.6)" },
  };
  const c = colors[status];

  return (
    <div className="relative shrink-0">
      <motion.div
        className={`w-2 h-2 rounded-full`}
        style={{ backgroundColor: c.bg, boxShadow: `0 0 8px ${c.shadow}` }}
        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {status === "connecting" && (
        <motion.div
          className="absolute inset-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: c.bg }}
          animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

export default function Header({ status, backendInfo, onClear, onSwitchBackend }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusLabel = status === "connected" ? "Online" : status === "connecting" ? "Connecting..." : "Offline";

  return (
    <motion.header
      className="relative z-10 header-glass"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between min-h-[52px] sm:min-h-[60px]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <StatusDot status={status} />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <motion.h1
                className="text-xs sm:text-sm font-bold tracking-[0.25em] sm:tracking-[0.3em] text-jarvis text-glow uppercase"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                J.A.R.V.I.S.
              </motion.h1>
              <LiveTime />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <motion.span
                className="text-[9px] sm:text-[10px] font-mono tracking-wider"
                style={{ color: status === "connected" ? "rgba(74, 222, 128, 0.5)" : "rgba(248, 113, 113, 0.5)" }}
                layout
              >
                {statusLabel}
              </motion.span>
              <span className="text-white/15 text-[9px]">|</span>
              <motion.span
                className="text-[9px] sm:text-[10px] text-white/35 font-mono truncate max-w-[120px] sm:max-w-[200px]"
                key={backendInfo?.active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {backendInfo?.active ?? "initializing..."}
              </motion.span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {backendInfo && backendInfo.available.length > 1 && (
            <div className="relative">
              <motion.select
                value={backendInfo.active.split(" ")[0]}
                onChange={(e) => { onSwitchBackend(e.target.value); setMenuOpen(false); }}
                onFocus={() => setMenuOpen(true)}
                onBlur={() => setMenuOpen(false)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs text-white/50 focus:outline-none focus:border-jarvis/30 appearance-none cursor-pointer hover:bg-white/[0.06] transition-colors max-w-[85px] sm:max-w-[110px] font-mono tracking-wider"
                whileHover={{ borderColor: "rgba(0, 212, 255, 0.25)" }}
              >
                {backendInfo.available.map((b) => (
                  <option key={b} value={b} className="bg-bg-dark text-white/70">{b}</option>
                ))}
              </motion.select>
              <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-2.5 h-2.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}

          <motion.button
            onClick={onClear}
            className="relative text-white/25 hover:text-white/50 p-1.5 sm:p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            title="Clear conversation"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
