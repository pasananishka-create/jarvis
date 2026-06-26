import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type RingState = "idle" | "listening" | "processing" | "responding" | "error";

interface CentralRingProps {
  state: RingState;
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

function WaveformBars({ state, reduced }: { state: RingState; reduced: boolean }) {
  const barCount = 7;
  const amplitudes = useRef(Array(barCount).fill(0.3));
  const [heights, setHeights] = useState(Array(barCount).fill(0.3));

  useEffect(() => {
    if (reduced) {
      setHeights(Array(barCount).fill(0.35));
      return;
    }

    let frameId: number;
    const step = () => {
      if (state === "listening") {
        amplitudes.current = amplitudes.current.map(
          (_, i) => 0.3 + Math.random() * 0.6
        );
      } else if (state === "idle" || state === "responding") {
        const t = Date.now() / 3000;
        amplitudes.current = amplitudes.current.map(
          (_, i) => 0.2 + 0.15 * Math.sin(t * Math.PI * 2 + i * 0.7)
        );
      } else if (state === "processing") {
        const t = Date.now() / 1500;
        amplitudes.current = amplitudes.current.map(
          (_, i) => 0.25 + 0.1 * Math.sin(t * Math.PI * 2 + i * 0.9)
        );
      } else if (state === "error") {
        const t = Date.now() / 4000;
        amplitudes.current = amplitudes.current.map(
          (_, i) => 0.08 + 0.04 * Math.sin(t * Math.PI * 2 + i * 1.2 + 3)
        );
      }
      setHeights([...amplitudes.current]);
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [state, reduced]);

  const barColor = state === "error"
    ? "rgba(232, 79, 79, 0.5)"
    : "rgba(0, 212, 255, 0.6)";

  return (
    <div className="flex items-center justify-center gap-[3px] sm:gap-[4px] h-full" aria-hidden="true">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[2px] sm:w-[3px] rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(4, h * 100)}%`,
            backgroundColor: barColor,
            opacity: state === "idle" ? 0.5 : state === "error" ? 0.4 : 0.8,
            boxShadow: state !== "idle" && state !== "error"
              ? "0 0 6px rgba(0, 212, 255, 0.3)"
              : "none",
          }}
        />
      ))}
    </div>
  );
}

function ArcRing({ progress, color = "rgba(0, 212, 255, 0.4)", size = "100%" }: { progress: number; color?: string; size?: string }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="absolute inset-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke={color.replace("0.4", "0.08")} strokeWidth="0.8" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="1.2"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${circ * (1 - progress)}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
    </svg>
  );
}

function OrbitalDots({ count = 3, reduced }: { count?: number; reduced: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            backgroundColor: "rgba(0, 212, 255, 0.5)",
            boxShadow: "0 0 8px rgba(0, 212, 255, 0.3)",
          }}
          animate={reduced ? {} : { rotate: 360 }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "linear", delay: i * 0.7 }}
        />
      ))}
    </div>
  );
}

export default function CentralRing({ state }: CentralRingProps) {
  const reduced = useReducedMotion();
  const [ringProgress, setRingProgress] = useState(1);

  useEffect(() => {
    if (reduced) {
      setRingProgress(state === "processing" ? 0.6 : 1);
      return;
    }

    let frameId: number;
    const step = () => {
      if (state === "processing") {
        const t = Date.now() / 2000;
        setRingProgress(0.3 + 0.3 * Math.sin(t * Math.PI * 2));
      } else if (state === "idle" || state === "responding") {
        const t = Date.now() / 3500;
        setRingProgress(0.85 + 0.15 * Math.sin(t * Math.PI * 2));
      } else if (state === "listening") {
        setRingProgress(1);
      } else if (state === "error") {
        const t = Date.now() / 3000;
        setRingProgress(0.5 + 0.1 * Math.sin(t * Math.PI * 2));
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [state, reduced]);

  const pulseAnim = reduced
    ? {}
    : {
        scale: state === "listening" ? [1, 1.04, 1] as number[] : [1, 1.02, 1] as number[],
        opacity: state === "error" ? [0.5, 0.3, 0.5] as number[] : [0.8, 1, 0.8] as number[],
      };

  const errorColor = "rgba(232, 79, 79, 0.5)";
  const accentColor = state === "error" ? errorColor : "rgba(0, 212, 255, 0.5)";

  return (
    <div className="relative flex items-center justify-center" role="status" aria-label={`AI state: ${state}`}>
      <motion.div
        className="relative w-28 h-28 sm:w-36 sm:h-36"
        animate={pulseAnim}
        transition={{
          duration: state === "listening" ? 0.8 : state === "error" ? 3.5 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Outer ring */}
        <ArcRing progress={ringProgress} color={accentColor} size="100%" />

        {/* Second ring for processing */}
        {state === "processing" && !reduced && (
          <ArcRing progress={0.7} color="rgba(0, 212, 255, 0.2)" size="100%" />
        )}

        {/* Orbital dots during processing */}
        {state === "processing" && <OrbitalDots reduced={reduced} />}

        {/* Waveform bars in center */}
        <div className="absolute inset-[25%]">
          <WaveformBars state={state} reduced={reduced} />
        </div>

        {/* Center dot */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: state === "listening" ? 6 : 4,
            height: state === "listening" ? 6 : 4,
            backgroundColor: state === "error" ? "rgba(232, 79, 79, 0.6)" : "rgba(0, 212, 255, 0.8)",
            boxShadow: state === "error"
              ? "0 0 8px rgba(232, 79, 79, 0.3)"
              : "0 0 12px rgba(0, 212, 255, 0.3)",
          }}
          animate={reduced ? {} : { scale: state === "listening" ? [1, 1.3, 1] as number[] : [1, 1.15, 1] as number[] }}
          transition={{ duration: state === "listening" ? 0.6 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* State label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
        <span className={`text-[8px] sm:text-[9px] font-mono tracking-[0.2em] uppercase ${
          state === "error" ? "text-red-400/50" : "text-[#00D4FF]/40"
        }`}>
          {state}
        </span>
      </div>
    </div>
  );
}
