import { motion } from "framer-motion";
import type { ConnectionStatus, BackendInfo } from "../types";
import SettingsDialog from "./SettingsDialog";
import { useState } from "react";

interface HeaderProps {
  status: ConnectionStatus;
  backendInfo: BackendInfo;
  onClear: () => void;
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color = status === "connected" ? "rgba(0, 212, 255, 0.5)"
    : status === "direct" ? "rgba(0, 255, 156, 0.5)"
    : "rgba(232, 79, 79, 0.4)";
  const pulse = status === "connected" || status === "direct";
  return (
    <motion.div
      className="rounded-full shrink-0"
      style={{ width: 6, height: 6, backgroundColor: color }}
      animate={pulse ? { opacity: [0.5, 1, 0.5] } : {}}
      transition={{ duration: 3, repeat: Infinity }}
    />
  );
}

export default function Header({ status, backendInfo, onClear }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const currentBackend = backendInfo.active.split(" ")[0];
  const currentModel = backendInfo.active.includes("(")
    ? backendInfo.active.split("(")[1]?.replace(")", "").trim() || ""
    : "";

  const statusLabel = status === "connected" ? "J.A.R.V.I.S."
    : status === "connecting" ? "SYNC"
    : status === "direct" ? "DIRECT"
    : "OFF";

  const statusColor = status === "connected" ? "text-[#00D4FF]/50"
    : status === "direct" ? "text-[#00FF9C]/40"
    : "text-red-400/30";

  return (
    <header className="border-b border-white/[0.04] bg-black/80 safe-top">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 flex items-center justify-between h-11">
        {/* Left */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <StatusDot status={status} />
            <span className={`text-[9px] font-mono tracking-[0.2em] ${statusColor}`}>{statusLabel}</span>
          </div>
          <span className="text-white/[0.04]">|</span>
          <span className="text-[8px] font-mono text-white/12 truncate max-w-[80px] sm:max-w-[160px]">
            {currentModel || currentBackend || "no backend"}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-mono text-white/12 tabular-nums">00:00</span>

          <button
            onClick={() => setSettingsOpen(true)}
            className="text-white/20 hover:text-white/40 p-2 rounded-lg transition-colors min-h-[44px] flex items-center justify-center"
            title="Settings"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={onClear}
            className="text-white/25 hover:text-white/45 p-2 rounded-lg transition-colors min-h-[44px] flex items-center justify-center"
            title="Clear"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
