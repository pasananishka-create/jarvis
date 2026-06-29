import { AnimatePresence, motion } from "framer-motion";
import type { ConnectionStatus } from "../types";

interface SkillDef {
  name: string;
  description: string;
  category: string;
  mode: "both" | "backend" | "direct";
}

const SKILLS: SkillDef[] = [
  { name: "files.list", description: "List directory contents", category: "File System", mode: "backend" },
  { name: "files.read", description: "Read any file in the workspace", category: "File System", mode: "backend" },
  { name: "files.write", description: "Write or create files", category: "File System", mode: "backend" },
  { name: "files.upload", description: "Upload files from your device", category: "File System", mode: "both" },
  { name: "files.pdf.extract", description: "Extract text from PDF files", category: "File System", mode: "backend" },
  { name: "files.pdf.edit", description: "Edit PDFs — add/replace text, add/delete pages", category: "File System", mode: "backend" },
  { name: "files.pdf.merge", description: "Merge multiple PDFs into one", category: "File System", mode: "backend" },
  { name: "files.pdf.split", description: "Split PDFs into individual pages", category: "File System", mode: "backend" },
  { name: "web.search", description: "Search the web via DuckDuckGo", category: "Web", mode: "backend" },
  { name: "web.fetch", description: "Fetch and read a web page", category: "Web", mode: "backend" },
  { name: "system.command", description: "Run shell commands on your device", category: "System", mode: "backend" },
  { name: "system.info", description: "Get system/hardware info", category: "System", mode: "backend" },
  { name: "git.status", description: "Git status, log, branch info", category: "System", mode: "backend" },
  { name: "weather", description: "Current weather for your location", category: "Data", mode: "backend" },
  { name: "news", description: "Latest tech news headlines", category: "Data", mode: "backend" },
  { name: "stocks", description: "Stock market data", category: "Data", mode: "backend" },
  { name: "notes", description: "Save and manage notes", category: "Data", mode: "backend" },
  { name: "reminders", description: "Set time-based reminders", category: "Data", mode: "backend" },
  { name: "memory", description: "Remember facts and recall them later", category: "Data", mode: "both" },
  { name: "code", description: "Write, review, debug, explain any code", category: "Intelligence", mode: "direct" },
  { name: "voice.input", description: "Speak to JARVIS via microphone", category: "Voice", mode: "direct" },
  { name: "voice.output", description: "JARVIS speaks back to you (TTS)", category: "Voice", mode: "direct" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  status: ConnectionStatus;
}

export default function SkillsPanel({ open, onClose, status }: Props) {
  const isBackend = status === "connected";
  const filtered = SKILLS.filter((s) => s.mode === "both" || s.mode === (isBackend ? "backend" : "direct"));
  const categories = [...new Set(filtered.map((s) => s.category))];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[9998]"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[9999] rounded-t-2xl max-h-[80vh] overflow-y-auto"
            style={{
              background: "rgba(10,16,32,0.95)",
              borderTop: "1px solid rgba(0,229,255,0.1)",
              backdropFilter: "blur(24px)",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
              <span className="text-[13px] font-mono tracking-[0.2em] text-[#00E5FF]/60">SKILLS</span>
              <span className="text-[9px] font-mono tracking-[0.1em] text-white/30" style={{ color: isBackend ? "rgba(0,255,200,0.5)" : "rgba(59,130,246,0.5)" }}>
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

              {categories.map((cat) => (
                <div key={cat} className="mb-5">
                  <span className="text-[8px] font-mono tracking-[0.2em] text-[#00E5FF]/40 block mb-2">{cat}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filtered.filter((s) => s.category === cat).map((s) => (
                      <div
                        key={s.name}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
                        style={{
                          background: "rgba(0,229,255,0.03)",
                          border: "1px solid rgba(0,229,255,0.06)",
                        }}
                      >
                        <div className="min-w-0">
                          <span className="text-[8px] font-mono tracking-[0.05em] text-white/40 block">{s.name}</span>
                          <span className="text-[9px] font-sans text-white/30 block mt-0.5">{s.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
