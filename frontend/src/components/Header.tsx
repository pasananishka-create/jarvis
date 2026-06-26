import { useState, useEffect, useRef, useCallback } from "react";
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
    <motion.div
      className="rounded-full shrink-0"
      style={{
        width: 6,
        height: 6,
        backgroundColor: on ? "rgba(0, 212, 255, 0.5)" : "rgba(232, 79, 79, 0.4)",
      }}
      animate={on ? { opacity: [0.5, 1, 0.5] } : {}}
      transition={{ duration: 3, repeat: Infinity }}
    />
  );
}

function useSessionTimer() {
  const [elapsed, setElapsed] = useState("00:00");
  const startRef = useRef(Date.now());
  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return elapsed;
}

export default function Header({ status, backendInfo, models, onClear, onSwitchModel }: HeaderProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, themes } = useTheme();
  const elapsed = useSessionTimer();

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

  const handleModelClick = useCallback((bk: string, mid: string) => {
    setModelLoading(true);
    onSwitchModel(bk, mid);
    setModelOpen(false);
    setTimeout(() => setModelLoading(false), 1500);
  }, [onSwitchModel]);

  const modelCount = Object.values(models).reduce((sum, m) => sum + m.length, 0);

  return (
    <header className="border-b border-white/[0.04] bg-black/80 safe-top">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 flex items-center justify-between h-11">
        {/* Left */}
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusDot status={status} />
          <span className={`text-[9px] font-mono tracking-[0.2em] ${
            status === "connected" ? "text-[#00D4FF]/50" : "text-red-400/30"
          }`}>
            {status === "connected" ? "J.A.R.V.I.S." : status === "connecting" ? "SYNC" : "OFF"}
          </span>
          <span className="text-white/[0.04]">|</span>
          <span className="text-[8px] font-mono text-white/12 truncate max-w-[80px] sm:max-w-[160px]">
            {currentModel || currentBackend || "no backend"}
          </span>
        </div>

        {/* Right */}
        <div className="relative flex items-center gap-1" ref={panelRef}>
          <span className="text-[8px] font-mono text-white/12 tabular-nums mr-1">{elapsed}</span>

          <button
            onClick={() => { setModelOpen((o) => !o); setThemeOpen(false); }}
            className="text-white/25 hover:text-white/45 px-2 py-2 rounded-lg border border-white/[0.04] hover:border-[#00D4FF]/15 transition-all min-h-[44px] flex items-center justify-center"
            title={`Models (${modelCount})`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={() => { setThemeOpen((o) => !o); setModelOpen(false); }}
            className="text-white/25 hover:text-white/45 p-2 rounded-lg transition-colors min-h-[44px] flex items-center justify-center"
            title="Theme"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
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

          {/* Model overlay — full screen on mobile, dropdown on desktop */}
          <AnimatePresence>
            {modelOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  className="fixed inset-0 z-40 bg-black/60 sm:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setModelOpen(false)}
                />
                <motion.div
                  className="fixed sm:absolute z-50 sm:z-50 left-0 sm:left-auto right-0 sm:right-0 bottom-0 sm:top-full sm:mt-1 sm:mb-0 sm:min-w-[280px] bg-[#080C10] sm:border sm:border-white/[0.06] rounded-t-xl sm:rounded-lg shadow-xl sm:max-h-[60vh] overflow-y-auto"
                  initial={{ y: 200, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 200, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{ maxHeight: "70vh", paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
                >
                  {/* Header */}
                  <div className="sticky top-0 bg-[#080C10] z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <span className="text-[9px] font-mono tracking-[0.15em] text-white/30">
                      Models{modelCount ? ` (${modelCount})` : ""}
                    </span>
                    <button onClick={() => setModelOpen(false)} className="text-white/30 p-1.5 hover:text-white/50 transition-colors min-h-[40px] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Model list */}
                  {available.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-[10px] font-mono text-white/15">No backends available</p>
                      <p className="text-[8px] font-mono text-white/10 mt-2">Check API keys in .env</p>
                    </div>
                  ) : (
                    available.map((bk) => {
                      const backendModels = models[bk] || [];
                      const isActive = bk === currentBackend;
                      return (
                        <div key={bk}>
                          <div className="px-4 py-2 text-[7px] font-mono tracking-[0.15em] uppercase text-white/20 flex items-center gap-2 border-b border-white/[0.03]">
                            {isActive && <div className="w-1 h-1 rounded-full bg-[#00D4FF]/50" />}
                            <span className={isActive ? "text-[#00D4FF]/40" : ""}>{bk}</span>
                            <span className="ml-auto text-white/[0.06]">{backendModels.length}</span>
                          </div>
                          {backendModels.length === 0 ? (
                            <div className="px-4 py-2 text-[8px] font-mono text-white/12 italic">No models loaded</div>
                          ) : (
                            backendModels.slice(0, 50).map((m) => {
                              const isSelected = isActive && m.id === currentModel;
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => handleModelClick(bk, m.id)}
                                  disabled={modelLoading}
                                  className={`w-full text-left px-4 py-3 sm:py-2.5 text-[13px] sm:text-[10px] font-mono tracking-wider transition-colors flex items-center gap-2.5 border-b border-white/[0.02] last:border-0 disabled:opacity-40 min-h-[48px] ${
                                    isSelected
                                      ? "text-[#00D4FF] bg-[#00D4FF]/6"
                                      : "text-white/35 hover:text-white/55 hover:bg-white/[0.02]"
                                  }`}
                                >
                                  {isSelected && <div className="w-1 h-3 rounded-full bg-[#00D4FF]/50 shrink-0" />}
                                  {!isSelected && <div className="w-1 shrink-0" />}
                                  <span className="truncate">{m.name || m.id}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      );
                    })
                  )}
                  <div className="sm:hidden h-4" />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Theme dropdown */}
          <AnimatePresence>
            {themeOpen && (
              <>
                <motion.div
                  className="fixed inset-0 z-40 sm:hidden bg-black/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setThemeOpen(false)}
                />
                <motion.div
                  className="fixed sm:absolute z-50 bottom-0 sm:top-full sm:mt-1 sm:bottom-auto left-0 right-0 sm:right-0 sm:left-auto sm:min-w-[140px] bg-[#080C10] sm:border sm:border-white/[0.06] rounded-t-xl sm:rounded-lg shadow-xl overflow-y-auto"
                  initial={{ y: 200, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 200, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] sm:hidden">
                    <span className="text-[9px] font-mono tracking-[0.15em] text-white/30">Theme</span>
                    <button onClick={() => setThemeOpen(false)} className="text-white/30 p-1.5 min-h-[40px] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {(Object.keys(themes) as ThemeName[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTheme(t); setThemeOpen(false); }}
                      className={`w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-[13px] sm:text-[10px] font-mono tracking-wider transition-colors min-h-[48px] sm:min-h-[auto] flex items-center gap-2 ${
                        theme === t
                          ? "text-[#00D4FF] bg-[#00D4FF]/6"
                          : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                      }`}
                    >
                      {theme === t ? <div className="w-1 h-3 rounded-full bg-[#00D4FF]/50 shrink-0" /> : <div className="w-1 shrink-0" />}
                      <span className="truncate">{themes[t].label}</span>
                    </button>
                  ))}
                  <div className="sm:hidden h-4" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
