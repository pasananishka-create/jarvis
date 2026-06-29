import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AICore from "./AICore";
import RippleButton from "./RippleButton";
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
  if (h < 5) return "Late night";
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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <motion.div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: colors[status],
          boxShadow: `0 0 8px ${colors[status]}`,
        }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span
        style={{
          fontSize: 9,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          letterSpacing: "0.2em",
          color: colors[status],
        }}
      >
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

function RecentConversations() {
  const items = [
    { text: "Review PR #42", time: "2h ago" },
    { text: "Refactor auth middleware", time: "5h ago" },
  ];
  return (
    <div
      style={{
        borderRadius: 12,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(0,229,255,0.06)",
      }}
    >
      <span style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)" }}>
        RECENT
      </span>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
            padding: "4px 0",
          }}
        >
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{item.text}</span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{item.time}</span>
        </div>
      ))}
    </div>
  );
}

function QuickStats() {
  const statStyle: React.CSSProperties = {
    borderRadius: 12,
    padding: "8px 12px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(0,229,255,0.06)",
    textAlign: "center" as const,
  };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={statStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>12</div>
        <div style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
          TASKS
        </div>
      </div>
      <div style={statStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>8</div>
        <div style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
          FILES
        </div>
      </div>
      <div style={statStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>98%</div>
        <div style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
          UPTIME
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen({ status, backendInfo, onOpenChat, onOpenVoice, onOpenSettings }: HomeScreenProps) {
  const now = useTime();
  const isBackend = status === "connected";
  const greeting = useMemo(() => Greeting(), []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const seconds = now.getSeconds();
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100%",
        padding: "0 20px",
        paddingTop: "max(env(safe-area-inset-top, 16px), 16px)",
        overflowY: "auto",
      }}
    >
      {/* Top section */}
      <div style={{ width: "100%", textAlign: "center", marginTop: 16 }}>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            fontSize: 11,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            letterSpacing: "0.35em",
            color: "rgba(0,229,255,0.5)",
            marginBottom: 16,
            fontWeight: 400,
          }}
        >
          J.A.R.V.I.S.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          style={{
            fontSize: 42,
            fontWeight: 300,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 2,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {time}
          <span
            style={{
              fontSize: 18,
              color: "rgba(0,229,255,0.3)",
              marginLeft: 4,
              verticalAlign: "super",
              fontFamily: "monospace",
              opacity: seconds % 2 === 0 ? 1 : 0.3,
              transition: "opacity 0.3s",
            }}
          >
            {String(seconds).padStart(2, "0")}
          </span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
          style={{
            fontSize: 10,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.35)",
            marginBottom: 4,
          }}
        >
          {date}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            marginTop: 4,
          }}
        >
          {greeting}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
          style={{ display: "flex", justifyContent: "center", marginTop: 10 }}
        >
          <StatusIndicator status={status} />
        </motion.div>
      </div>

      {/* AI Core */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ flexShrink: 0, margin: "12px 0" }}
      >
        <AICore state={status === "connected" ? "idle" : status === "connecting" ? "thinking" : "idle"} size={180} />
      </motion.div>

      {/* Quick stats */}
      <motion.div
        style={{ width: "100%", maxWidth: 320, marginBottom: 10 }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
      >
        <QuickStats />
      </motion.div>

      {/* Quick actions */}
      <motion.div
        style={{ width: "100%", maxWidth: 320 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
          {actions.map((a, i) => (
            <RippleButton
              key={a.id}
              onClick={
                a.id === "chat" ? onOpenChat :
                a.id === "voice" ? onOpenVoice :
                undefined
              }
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "12px 4px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(0,229,255,0.08)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d={a.icon} />
              </svg>
              <span style={{ fontSize: 8, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)" }}>
                {a.label}
              </span>
            </RippleButton>
          ))}
        </div>

        {/* Recent conversations */}
        <div style={{ marginBottom: 10 }}>
          <RecentConversations />
        </div>

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <div
            style={{
              borderRadius: 12,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,229,255,0.06)",
            }}
          >
            <span style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)", display: "block", marginBottom: 4 }}>
              MODEL
            </span>
            <span style={{ fontSize: 10, fontFamily: "'SF Mono', 'Fira Code', monospace", color: "rgba(255,255,255,0.5)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {backendInfo.active}
            </span>
          </div>
          <div
            style={{
              borderRadius: 12,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,229,255,0.06)",
            }}
          >
            <span style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)", display: "block", marginBottom: 4 }}>
              MODE
            </span>
            <span style={{ fontSize: 10, fontFamily: "'SF Mono', 'Fira Code', monospace", color: "rgba(255,255,255,0.5)" }}>
              {isBackend ? "BACKEND" : "DIRECT"}
            </span>
          </div>
        </div>

        {/* Floating widgets inline in compact mode */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <div
            style={{
              flex: 1,
              borderRadius: 12,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,229,255,0.06)",
            }}
          >
            <div style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.15em", color: "rgba(0,229,255,0.4)", marginBottom: 4 }}>
              BATTERY
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>--%</div>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 12,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,229,255,0.06)",
            }}
          >
            <div style={{ fontSize: 7, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.15em", color: "rgba(0,229,255,0.4)", marginBottom: 4 }}>
              CONNECT
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Wi-Fi</div>
          </div>
        </div>

        {/* Settings button */}
        <RippleButton
          onClick={onOpenSettings}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(0,229,255,0.06)",
            backdropFilter: "blur(8px)",
            marginBottom: 24,
          }}
        >
          <svg style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <span style={{ fontSize: 10, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)" }}>
            SETTINGS
          </span>
        </RippleButton>
      </motion.div>
    </div>
  );
}
