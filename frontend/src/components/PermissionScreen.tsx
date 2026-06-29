import { motion } from "framer-motion";

interface PermissionScreenProps {
  type: "microphone" | "notifications" | "storage";
  onRetry: () => void;
  onDismiss: () => void;
}

const config = {
  microphone: {
    icon: "M19 11a7 7 0 01-14 0M12 2a5 5 0 00-5 5v4a5 5 0 0010 0V7a5 5 0 00-5-5zM5.5 20.5h13",
    title: "Microphone Access Required",
    desc: "JARVIS needs microphone access to hear your voice commands. Please allow microphone access in your browser settings.",
  },
  notifications: {
    icon: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
    title: "Notifications Required",
    desc: "Enable notifications to receive alerts from JARVIS.",
  },
  storage: {
    icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
    title: "Storage Access Required",
    desc: "JARVIS needs storage access to save and load files.",
  },
};

export default function PermissionScreen({ type, onRetry, onDismiss }: PermissionScreenProps) {
  const c = config[type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(4,6,11,0.95)",
        backdropFilter: "blur(20px)",
        padding: 32,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 320,
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "1px solid rgba(0,229,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            background: "rgba(0,229,255,0.03)",
          }}
        >
          <svg style={{ width: 32, height: 32, color: "rgba(0,229,255,0.6)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d={c.icon} />
          </svg>
        </motion.div>

        <h2 style={{ fontSize: 18, fontWeight: 500, color: "#fff", marginBottom: 12 }}>
          {c.title}
        </h2>

        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 28 }}>
          {c.desc}
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <motion.button
            onClick={onRetry}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1px solid rgba(0,229,255,0.3)",
              background: "rgba(0,229,255,0.1)",
              color: "#00E5FF",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: "0.15em",
              cursor: "pointer",
              minHeight: 48,
            }}
          >
            RETRY
          </motion.button>
          <motion.button
            onClick={onDismiss}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: "0.15em",
              cursor: "pointer",
              minHeight: 48,
            }}
          >
            DISMISS
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
