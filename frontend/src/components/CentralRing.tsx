import { useEffect, useRef, useState } from "react";

type RingState = "idle" | "listening" | "processing" | "responding" | "error";

interface CentralRingProps {
  state: RingState;
  mini?: boolean;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function StateGlyph({ state, reduced }: { state: RingState; reduced: boolean }) {
  const idle = state === "idle";
  const processing = state === "processing" || state === "responding";
  const listening = state === "listening";
  const error = state === "error";

  const opacity = error ? "opacity-40" : idle ? "opacity-50" : "opacity-80";

  if (processing) {
    return (
      <svg className={`w-full h-full ${opacity}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1}>
        {[0, 1, 2, 3].map((i) => (
          <motion.rect
            key={i}
            x={8 + i * 6}
            y="8"
            width="2"
            height="16"
            rx="1"
            animate={reduced ? {} : { height: [16, 6, 16], y: [8, 13, 8] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </svg>
    );
  }

  if (listening) {
    return (
      <svg className={`w-full h-full ${opacity}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.2}>
        <circle cx="16" cy="16" r="6" />
        <path d="M16 2v3M16 27v3M2 16h3M27 16h3" strokeWidth={1} />
        <circle cx="16" cy="16" r="2" fill="currentColor" />
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx="16" cy="16" r={8 + i * 4}
            strokeWidth={0.5}
            initial={false}
            animate={reduced ? {} : { r: [8 + i * 4, 12 + i * 4, 8 + i * 4] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </svg>
    );
  }

  if (error) {
    return (
      <svg className="w-full h-full opacity-40" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.2}>
        <circle cx="16" cy="16" r="12" opacity={0.3} />
        <path d="M11 11l10 10M21 11l-10 10" />
      </svg>
    );
  }

  return (
    <svg className={`w-full h-full ${opacity}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={0.8}>
      <motion.circle cx="16" cy="16" r="12"
        animate={reduced ? {} : { rotate: 360 }}
        style={{ originX: "16px", originY: "16px" }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.circle cx="16" cy="16" r="8"
        animate={reduced ? {} : { rotate: -360 }}
        style={{ originX: "16px", originY: "16px" }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <circle cx="16" cy="16" r="2" fill="currentColor" opacity={0.5} />
    </svg>
  );
}

// Import motion from framer-motion at the top of the file
import { motion } from "framer-motion";

export default function CentralRing({ state, mini }: CentralRingProps) {
  const reduced = useReducedMotion();

  const size = mini ? "100%" : "clamp(80px, 25vh, 140px)";

  return (
    <div role="status" aria-label={`AI state: ${state}`} style={{ width: size, height: size }}>
      <StateGlyph state={state} reduced={reduced} />
    </div>
  );
}
