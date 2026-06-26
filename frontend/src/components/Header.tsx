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
      className="rounded-full shrink-0 gpu-layer"
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
      const m = String(Math.floor(s / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      setElapsed(`${m}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return elapsed;
}

export default function Header({ status, backendInfo, models, onClear, onSwitchBackend, onSwitchModel }: HeaderProps) {
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

  return (
    <header className="border-b border-white/[0.04] bg-black/80 safe-top gpu-layer" style={{ minHeight: 44 }}>
      <div className="max-w-3xl mx-auto px-3 sm:px-6 flex items-center justify-between" style={{ height: 44 }}>
        {/* Left: status dot + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusDot status={status} />
          <span className={`text-[9px] font-mono tracking-[0.2em] ${
            status === "connected" ? "text-[#00D4FF]/50" : "text-red-400/30"
          }`}>
            {status === "connected" ? "J.A.R.V.I.S." : status === "connecting" ? "SYNC" : "OFF"}
          </span>
          <span className="text-white/[0.04]">|</span>
          <span className="text-[8px] font-mono text-white/12 truncate max-w-[80px] sm:max-w-[160px]">
            {currentModel || currentBackend}
          </span>
        </div>

        {/* Right: session timer + actions */}
        <div className="flex items-center gap-1" ref={panelRef}>
          <span className="text-[8px] font-mono text-white/12 tabular-nums mr-1">
            {elapsed}
          </span>

          <button
            onClick={() => { setModelOpen((o) => !o); setThemeOpen(false); }}
            className="text-white/25 hover:text-white/45 px-2 py-2 rounded-lg text-[8px] font-mono tracking-wider border border-white/[0.04] hover:border-[#00D4FF]/15 transition-all min-h-[44px] flex items-center justify-center"
            title="Models"
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

          {/* Model dropdown */}
          <AnimatePresence>
            {modelOpen && (
              <motion.div
                className="fixed sm:absolute right-0 sm:right-auto left-0 sm:left-auto top-auto sm:top-full bottom-0 sm:bottom-auto mt-0 sm:mt-1 bg-[#080C10] border-t sm:border border-white/[0.06] rounded-t-xl sm:rounded-lg py-2 z-50 shadow-xl max-h-[50vh] sm:max-h-[60vh] overflow-y-auto gpu-layer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                style={{ width: "100%", maxWidth: 340, margin: "0 auto" }}
              >
                <div className="flex items-center justify-between px-4 sm:px-3 py-2.5 border-b border-white/[0.04] sm:hidden">
                  <span className="text-[9px] font-mono tracking-[0.15em] text-white/30">Select Model</span>
                  <button onClick={() => setModelOpen(false)} className="text-white/30 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {available.map((bk) => {
                  const backendModels = models[bk] || [];
                  const isActive = bk === currentBackend;
                  return (
                    <div key={bk}>
                      <div className="px-4 sm:px-3 py-2 text-[7px] font-mono tracking-[0.15em] uppercase text-white/20 flex items-center gap-2 border-b border-white/[0.03]">
                        {isActive && <div className="w-1 h-1 rounded-full bg-[#00D4FF]/50" />}
                        <span className={isActive ? "text-[#00D4FF]/40" : ""}>{bk}</span>
                      </div>
                      {backendModels.slice(0, 50).map((m) => {
                        const isSelected = isActive && m.id === currentModel;
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleModelClick(bk, m.id)}
                            disabled={modelLoading}
                            className={`w-full text-left px-4 sm:px-3 py-3 sm:py-2.5 text-[13px] sm:text-[9px] font-mono tracking-wider transition-colors flex items-center gap-2.5 border-b border-white/[0.02] last:border-0 disabled:opacity-40 min-h-[48px] sm:min-h-[auto] ${
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
                      })}
                    </div>
                  );
                })}
                <div className="sm:hidden h-12" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Theme dropdown */}
          <AnimatePresence>
            {themeOpen && (
              <motion.div
                className="absolute right-0 top-full mt-1 bg-[#080C10] border border-white/[0.06] rounded-lg py-1 min-w-[120px] z-50 shadow-lg gpu-layer"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {(Object.keys(themes) as ThemeName[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); setThemeOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 sm:py-2 text-[11px] sm:text-[9px] font-mono tracking-wider transition-colors min-h-[44px] sm:min-h-[auto] ${
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
