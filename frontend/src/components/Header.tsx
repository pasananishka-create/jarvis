import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectionStatus, BackendInfo, ModelInfo } from "../types";
import { useTheme, type ThemeName } from "../hooks/useTheme";

interface HeaderProps {
  status: ConnectionStatus;
  backendInfo: BackendInfo;
  models: Record<string, ModelInfo[]>;
  onClear: () => void;
  onSwitchBackend: (name: string) => void;
  onSwitchModel: (backend: string, model: string) => void;
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const on = status === "connected";
  return (
    <div className="relative shrink-0">
      <motion.div
        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
        style={{
          backgroundColor: on ? "rgba(0, 212, 255, 0.6)" : "rgba(232, 79, 79, 0.5)",
          boxShadow: on ? "0 0 6px rgba(0, 212, 255, 0.3)" : "none",
        }}
        animate={on ? { opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </div>
  );
}

export default function Header({ status, backendInfo, models, onClear, onSwitchBackend, onSwitchModel }: HeaderProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, themes } = useTheme();

  const currentBackend = backendInfo.active.split(" ")[0];
  const currentModel = backendInfo.active.includes("(")
    ? backendInfo.active.split("(")[1]?.replace(")", "").trim() || ""
    : "";
  const available = backendInfo.available;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header className="border-b border-white/[0.06] bg-[#080C10]/90 safe-top">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot status={status} />
          <div>
            <h1 className="text-[9px] sm:text-[11px] font-mono tracking-[0.25em] text-[#00D4FF]/60">
              J.A.R.V.I.S.
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[7px] sm:text-[8px] font-mono tracking-wider ${
                status === "connected" ? "text-[#00D4FF]/30" : "text-red-400/30"
              }`}>
                {status === "connected" ? "ONLINE" : status === "connecting" ? "SYNC" : "OFF"}
              </span>
              <span className="text-white/[0.06]">/</span>
              <span className="text-[7px] sm:text-[8px] font-mono text-white/15 truncate max-w-[80px] sm:max-w-[180px]">
                {currentModel || currentBackend}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1" ref={panelRef}>
          {/* Model selector */}
          <button
            onClick={() => { setModelOpen((o) => !o); setThemeOpen(false); }}
            className="text-white/25 hover:text-white/50 px-1.5 py-1 rounded text-[8px] sm:text-[9px] font-mono tracking-wider border border-white/[0.06] hover:border-[#00D4FF]/20 transition-all"
            style={{ transition: "border-color 0.2s, color 0.2s" }}
          >
            <span className="hidden sm:inline">Model</span>
            <span className="sm:hidden">M</span>
          </button>

          <button
            onClick={onClear}
            className="text-white/20 hover:text-white/45 p-1.5 rounded transition-colors"
            style={{ transition: "color 0.2s" }}
            title="Clear"
          >
            <svg className="w-3 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <button
            onClick={() => { setThemeOpen((o) => !o); setModelOpen(false); }}
            className="text-white/20 hover:text-white/45 p-1.5 rounded transition-colors"
            style={{ transition: "color 0.2s" }}
            title="Theme"
          >
            <svg className="w-3 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>

          {/* Model dropdown */}
          <AnimatePresence>
            {modelOpen && (
              <motion.div
                className="absolute right-0 top-full mt-1 bg-[#0C1018] border border-white/[0.08] rounded-lg py-1 min-w-[200px] sm:min-w-[280px] z-50 shadow-xl max-h-[60vh] overflow-y-auto"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {available.map((bk) => {
                  const backendModels = models[bk] || [];
                  const isActive = bk === currentBackend;
                  return (
                    <div key={bk} className="border-b border-white/[0.04] last:border-0">
                      <div className="px-3 py-1.5 text-[7px] font-mono tracking-[0.15em] uppercase text-white/20 flex items-center gap-1.5">
                        {isActive && <div className="w-1 h-1 rounded-full bg-[#00D4FF]/60" />}
                        {bk}
                        <span className="text-white/[0.06] ml-auto">{backendModels.length}</span>
                      </div>
                      {backendModels.slice(0, 50).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { onSwitchModel(bk, m.id); setModelOpen(false); }}
                          className={`w-full text-left px-3 py-1 text-[8px] sm:text-[9px] font-mono tracking-wider transition-colors flex items-center gap-2 ${
                            isActive && m.id === currentModel
                              ? "text-[#00D4FF] bg-[#00D4FF]/6"
                              : "text-white/30 hover:text-white/55 hover:bg-white/[0.02]"
                          }`}
                        >
                          {isActive && m.id === currentModel ? (
                            <span className="text-[#00D4FF]/60" style={{ fontSize: 8 }}>▸</span>
                          ) : (
                            <span className="text-white/10" style={{ fontSize: 8 }}> </span>
                          )}
                          <span className="truncate">{m.name || m.id}</span>
                        </button>
                      ))}
                      {backendModels.length > 50 && (
                        <div className="px-3 py-1 text-[6px] text-white/10 font-mono">
                          +{backendModels.length - 50} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Theme dropdown */}
          <AnimatePresence>
            {themeOpen && (
              <motion.div
                className="absolute right-0 top-full mt-1 bg-[#0C1018] border border-white/[0.08] rounded-lg py-1 min-w-[110px] z-50 shadow-lg"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {(Object.keys(themes) as ThemeName[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); setThemeOpen(false); }}
                    className={`w-full text-left px-2.5 py-1 text-[8px] sm:text-[9px] font-mono tracking-wider transition-colors ${
                      theme === t
                        ? "text-[#00D4FF] bg-[#00D4FF]/6"
                        : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                    }`}
                  >
                    {theme === t ? "▸ " : "  "}{themes[t].label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
