import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import ParticleBackground from "./components/ParticleBackground";
import Chat from "./components/Chat";

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFinish, 1800);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-deep">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border border-jarvis/30 flex items-center justify-center animate-pulse">
          <div className="w-12 h-12 rounded-full border border-jarvis/50 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-jarvis/20 animate-ping" />
          </div>
        </div>
        <div
          className="absolute -inset-4 rounded-full border border-jarvis/10"
          style={{ animation: "pulse-ring 2s ease-in-out infinite" }}
        />
      </div>
      <div className="mt-8 text-center stagger">
        <p className="text-jarvis text-sm font-mono tracking-[0.3em] uppercase opacity-0" style={{ animation: "slideUp 0.6s ease 0.3s forwards" }}>
          Initializing Systems
        </p>
        <p className="text-white/20 text-xs font-mono mt-2 opacity-0" style={{ animation: "slideUp 0.6s ease 0.6s forwards" }}>
          {new Array(8).fill(0).map(() => Math.random().toString(16).slice(2, 6)).join(" ")}
        </p>
        <div className="flex gap-1 justify-center mt-4 opacity-0" style={{ animation: "fadeIn 0.5s ease 0.9s forwards" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-jarvis/60" style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-bg-deep">
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />

      <ParticleBackground />

      <div className="scanlines" />

      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && <Chat />}
    </div>
  );
}
