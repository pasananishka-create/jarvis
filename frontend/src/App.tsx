import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualViewport } from "./hooks/useVisualViewport";
import MountSequence from "./components/MountSequence";
import Background from "./components/Background";
import HomeScreen from "./components/HomeScreen";
import Chat from "./components/Chat";
import VoiceMode from "./components/VoiceMode";
import SettingsDialog from "./components/SettingsDialog";
import PermissionScreen from "./components/PermissionScreen";
import { useJarvis } from "./hooks/useJarvis";
import { useSound } from "./hooks/useSound";

type View = "home" | "chat" | "voice";

function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<View>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { keyboardHeight } = useVisualViewport();
  const { status, backend } = useJarvis();
  const sound = useSound();

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [showPermission, setShowPermission] = useState(false);

  // Load preferences
  const animQuality = loadPref<string>("jarvis_anim_quality", "high");
  const particleCount = loadPref<number>("jarvis_particle_count", 60);

  // Check mic permission on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((s) => {
        setMicPermission(s.state as "granted" | "denied" | "prompt");
        s.addEventListener("change", () => setMicPermission(s.state as "granted" | "denied" | "prompt"));
      }).catch(() => {});
    }
  }, []);

  // Play startup sound when splash finishes
  const onSplashComplete = useCallback(() => {
    setShowSplash(false);
    sound.play("startup");
  }, [sound]);

  const backendInfo = {
    active: backend,
    available: [],
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: "#04060B" }}>
      <Background quality={animQuality as "low" | "medium" | "high"} particleCount={particleCount} />

      {showSplash && (
        <MountSequence onComplete={onSplashComplete} />
      )}

      {!showSplash && (
        <div className="relative z-10 flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {view === "home" && (
              <motion.div
                key="home"
                className="flex-1 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <HomeScreen
                  status={status}
                  backendInfo={backendInfo}
                  onOpenChat={() => setView("chat")}
                  onOpenVoice={() => { sound.play("listening"); setView("voice"); }}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              </motion.div>
            )}

            {view === "chat" && (
              <motion.div
                key="chat"
                className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Chat
                  keyboardHeight={keyboardHeight}
                  onBackToHome={() => setView("home")}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Mode overlay */}
          <VoiceMode
            isOpen={view === "voice"}
            onClose={() => { sound.play("shutdown"); setView("home"); }}
            listening={voiceListening}
            transcript={voiceTranscript}
          />
        </div>
      )}

      {!showSplash && view !== "voice" && (
        <div className="relative z-20 flex justify-center items-center gap-8 px-6 pb-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)" }}>
          {(["home", "chat"] as View[]).map((v) => (
            <motion.button
              key={v}
              onClick={() => setView(v)}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
              whileTap={{ scale: 0.9 }}
            >
              {v === "home" ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                  style={{ color: view === v ? "#00E5FF" : "rgba(255,255,255,0.25)" }}
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                  style={{ color: view === v ? "#00E5FF" : "rgba(255,255,255,0.25)" }}
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              )}
              <span className="text-[6px] font-mono tracking-[0.2em]" style={{ color: view === v ? "#00E5FF" : "rgba(255,255,255,0.2)" }}>
                {v === "home" ? "HOME" : "CHAT"}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Permission screen */}
      <AnimatePresence>
        {showPermission && micPermission === "denied" && (
          <PermissionScreen
            type="microphone"
            onRetry={() => setShowPermission(false)}
            onDismiss={() => setShowPermission(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
