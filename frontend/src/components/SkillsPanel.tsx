import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { ConnectionStatus } from "../types";

interface SkillDef {
  name: string;
  description: string;
  icon: string;
  mode: "both" | "backend" | "direct";
}

const SKILLS: SkillDef[] = [
  { name: "files.list", description: "List directory contents", icon: "📁", mode: "backend" },
  { name: "files.read", description: "Read any file in the workspace", icon: "📄", mode: "backend" },
  { name: "files.write", description: "Write or create files", icon: "✏️", mode: "backend" },
  { name: "files.grep", description: "Search file contents for text", icon: "🔍", mode: "backend" },
  { name: "web.search", description: "Search the web via DuckDuckGo", icon: "🌐", mode: "backend" },
  { name: "web.fetch", description: "Fetch and read a web page", icon: "📡", mode: "backend" },
  { name: "system.command", description: "Run shell commands on your device", icon: "⚡", mode: "backend" },
  { name: "system.info", description: "Get system/hardware info", icon: "💻", mode: "backend" },
  { name: "git.status", description: "Git status, log, branch info", icon: "🔀", mode: "backend" },
  { name: "weather", description: "Current weather for your location", icon: "🌤️", mode: "backend" },
  { name: "news", description: "Latest tech news headlines", icon: "📰", mode: "backend" },
  { name: "stocks", description: "Stock market data", icon: "📈", mode: "backend" },
  { name: "notes", description: "Save and manage notes", icon: "📝", mode: "backend" },
  { name: "reminders", description: "Set time-based reminders", icon: "⏰", mode: "backend" },
  { name: "memory", description: "Remember facts and recall them later", icon: "🧠", mode: "both" },
  { name: "code", description: "Write, review, debug, explain any code", icon: "💡", mode: "direct" },
  { name: "voice.input", description: "Speak to JARVIS via microphone", icon: "🎤", mode: "direct" },
  { name: "voice.output", description: "JARVIS speaks back to you (TTS)", icon: "🔊", mode: "direct" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  status: ConnectionStatus;
}

export default function SkillsPanel({ open, onClose, status }: Props) {
  const isBackend = status === "connected";
  const filtered = SKILLS.filter((s) => s.mode === "both" || s.mode === (isBackend ? "backend" : "direct"));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[9998] bg-[#1A1A1A] border-t border-white/10 rounded-t-xl max-h-[80vh] overflow-y-auto"
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
          >
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/10">
              <span className="text-[13px] font-mono tracking-[0.2em] text-white/60">
                SKILLS {isBackend ? "⚡" : "💡"}
              </span>
              <span className="text-[9px] font-mono text-white/20">
                {isBackend ? "BACKEND MODE" : "DIRECT MODE"}
              </span>
              <button onClick={onClose} className="text-white/40 hover:text-white/70 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 pt-4 pb-4">
              <p className="text-[11px] font-mono text-white/30 mb-4">
                {isBackend
                  ? "Backend connected — JARVIS can execute real commands on your device."
                  : "Direct mode — JARVIS guides you with commands to run. Start the backend for full automation."
                }
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-start gap-3 px-3 py-2.5 border border-white/10"
                  >
                    <span className="text-[14px] mt-0.5">{s.icon}</span>
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono tracking-[0.05em] text-white/50 block">{s.name}</span>
                      <span className="text-[10px] font-sans text-white/35 block mt-0.5">{s.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
