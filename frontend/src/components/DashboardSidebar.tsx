import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectionStatus, BackendInfo } from "../types";

interface DashboardSidebarProps {
  status: ConnectionStatus;
  backendInfo: BackendInfo | null;
  thinking: boolean;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center">
      <div className="stat-value text-lg tracking-wider tabular-nums">
        {time.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="stat-label text-[8px]">
        {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

function Uptime() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <div className="text-center">
      <div className="stat-value text-xs tabular-nums tracking-wider">
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </div>
      <div className="stat-label">Uptime</div>
    </div>
  );
}

function StatusBar({ status, backendInfo, thinking }: DashboardSidebarProps) {
  const statusColors = {
    connected: { dot: "#4ade80", text: "Online" },
    connecting: { dot: "#facc15", text: "Connecting..." },
    disconnected: { dot: "#f87171", text: "Offline" },
  };
  const sc = statusColors[status];

  return (
    <div className="space-y-1.5">
      <div className="stat-card flex items-center gap-2.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: sc.dot, boxShadow: `0 0 8px ${sc.dot}` }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div>
          <div className="stat-value text-xs">{sc.text}</div>
          <div className="stat-label">Status</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-xs truncate max-w-full">
          {backendInfo?.active ?? "initializing..."}
        </div>
        <div className="stat-label">Active Model</div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-xs">
          {backendInfo?.available?.length ?? 0} backends
        </div>
        <div className="stat-label">Available</div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-xs flex items-center gap-1.5">
          <motion.div
            className="w-1 h-1 rounded-full bg-jarvis/60"
            animate={thinking ? { scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          {thinking ? "Processing..." : "Standby"}
        </div>
        <div className="stat-label">State</div>
      </div>
    </div>
  );
}

export default function DashboardSidebar(props: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      className="dashboard-sidebar hidden md:flex flex-col"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.04]">
        <span className="text-[9px] font-mono tracking-[0.2em] text-jarvis/40 uppercase">Dashboard</span>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-white/20 hover:text-white/40 transition-colors p-0.5"
        >
          <svg className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            className="flex-1 flex flex-col p-3 gap-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-2 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <LiveClock />
            </div>

            <div className="px-2 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <Uptime />
            </div>

            <StatusBar {...props} />

            <div className="mt-auto pt-3 border-t border-white/[0.04]">
              <div className="text-[7px] font-mono text-white/15 text-center tracking-[0.2em]">
                J.A.R.V.I.S. CORE v1.0
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
