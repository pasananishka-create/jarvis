import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualViewport } from "./hooks/useVisualViewport";
import ParticleBackground from "./components/ParticleBackground";
import Chat from "./components/Chat";

const BOOT_STAGES = [
  { text: "Initializing neural interface...", delay: 0 },
  { text: "Establishing quantum link...", delay: 0.2 },
  { text: "Loading cognitive matrices...", delay: 0.4 },
  { text: "Synchronizing data streams...", delay: 0.6 },
  { text: "All systems online", delay: 0.8 },
];

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [stage, setStage] = useState(0);
  const hexRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage < BOOT_STAGES.length) {
      const t = setTimeout(() => setStage((s) => s + 1), 600);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onFinish, 800);
      return () => clearTimeout(t);
    }
  }, [stage, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-deep">
      <div className="absolute inset-0 hex-grid opacity-20" />
      <div className="scan-line" style={{ animationDelay: "0.5s" }} />

      <div className="relative power-on">
        <div className="w-24 h-24 rounded-full border border-jarvis/30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-jarvis/50 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-jarvis/20 animate-ping" />
          </div>
        </div>
        <div className="absolute -inset-4 rounded-full border border-jarvis/10" style={{ animation: "pulse-ring 2s ease-in-out infinite" }} />
        <div className="absolute -inset-8 rounded-full border border-jarvis/[0.04]" style={{ animation: "pulse-ring 2.5s ease-in-out infinite 0.3s" }} />
      </div>

      <div className="mt-10 w-64">
        <div className="boot-progress mb-6" />
      </div>

      <div className="text-center">
        {BOOT_STAGES.map((s, i) => (
          <p
            key={s.text}
            className={`text-[10px] sm:text-xs font-mono tracking-[0.2em] transition-all duration-500 ${
              i < stage
                ? "text-jarvis/60 opacity-100"
                : i === stage
                ? "text-jarvis opacity-100"
                : "text-white/10 opacity-0"
            }`}
            style={{
              marginTop: i === 0 ? 0 : "0.5rem",
              textShadow: i === stage ? "0 0 12px rgba(0, 212, 255, 0.4)" : "none",
            }}
          >
            {i < stage ? "✓" : i === stage ? ">" : "○"} {s.text}
            {i === stage && (
              <motion.span
                className="inline-block w-[2px] h-[12px] bg-jarvis/70 ml-1 align-text-bottom"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { keyboardHeight } = useVisualViewport();

  return (
    <div
      className="h-full flex flex-col relative overflow-hidden bg-bg-deep"
      style={{ marginBottom: keyboardHeight }}
    >
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />

      <div className="hex-grid" />
      <div className="data-stream data-stream-1" />
      <div className="data-stream data-stream-2" />
      <div className="data-stream data-stream-3" />
      <div className="data-stream data-stream-4" />

      <ParticleBackground />

      <div className="scanlines" />

      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && (
        <div className="flex flex-1 overflow-hidden">
          <Chat keyboardHeight={keyboardHeight} />
        </div>
      )}
    </div>
  );
}
