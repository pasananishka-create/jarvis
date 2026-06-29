import { motion } from "framer-motion";
import type { ConnectionStatus, BackendInfo } from "../types";
import SettingsDialog from "./SettingsDialog";
import { useState } from "react";

interface HeaderProps {
  status: ConnectionStatus;
  backendInfo: BackendInfo;
  onClear: () => void;
  voiceEnabled: boolean;
  voiceSpeaking: boolean;
  onToggleVoice: () => void;
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color = status === "connected" ? "#FFFFFF"
    : status === "direct" ? "#FFFFFF"
    : "#555555";
  return (
    <div
      className="rounded-full shrink-0"
      style={{ width: 4, height: 4, backgroundColor: color }}
    />
  );
}

const statusLabels: Record<ConnectionStatus, string> = {
  connected: "J.A.R.V.I.S.",
  connecting: "SYNC",
  direct: "J.A.R.V.I.S.",
  disconnected: "OFF",
};

export default function Header({ status, backendInfo, onClear, voiceEnabled, voiceSpeaking, onToggleVoice }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const currentBackend = backendInfo.active.split(" ")[0];
  const currentModel = backendInfo.active.includes("(")
    ? backendInfo.active.split("(")[1]?.replace(")", "").trim() || ""
    : "";

  const opacity = status === "disconnected" ? "opacity-40" : "opacity-100";

  return (
    <header className={`border-b border-white/[0.08] bg-[#1A1A1A] safe-top ${opacity}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot status={status} />
          <span className="text-[10px] font-mono tracking-[0.25em] text-white/80">{statusLabels[status]}</span>
          <span className="text-white/[0.08]">/</span>
          <span className="text-[8px] font-mono text-white/40 truncate max-w-[80px] sm:max-w-[160px]">
            {currentModel || currentBackend}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleVoice}
            className={`p-2.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              voiceSpeaking ? "text-white" : voiceEnabled ? "text-white/70 hover:text-white" : "text-white/20 hover:text-white/40"
            }`}
            title={voiceEnabled ? "Voice on" : "Voice off"}
          >
            {voiceSpeaking ? (
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                <path d="M16 7a7 7 0 010 10" strokeWidth={1.2}/>
                <path d="M19 4a11 11 0 010 16" strokeWidth={0.8}/>
              </svg>
            ) : (
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M11 5a7 7 0 00-7 7v4h3l4 4V5z"/>
                <path d="M19 7a9 9 0 010 10" strokeWidth={1.2} opacity={voiceEnabled ? 1 : 0.3}/>
                <path d="M22 4a13 13 0 010 16" strokeWidth={0.8} opacity={voiceEnabled ? 1 : 0.3}/>
              </svg>
            )}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="text-white/40 hover:text-white/70 p-2.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Settings"
          >
            <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>

          <button
            onClick={onClear}
            className="text-white/30 hover:text-white/60 p-2.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Clear"
          >
            <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
