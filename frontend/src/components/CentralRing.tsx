import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGyroscope } from "../hooks/useGyroscope";

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

function WaveformBars({ state, reduced }: { state: RingState; reduced: boolean }) {
  const barsRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    if (reduced) return;
    const bars = barsRef.current?.children;
    if (!bars) return;

    let frameId: number;
    const step = () => {
      if (reducedRef.current) return;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i] as HTMLElement;
        let h: number;
        if (state === "listening") {
          h = 0.3 + Math.random() * 0.6;
        } else if (state === "idle" || state === "responding") {
          const t = Date.now() / 3000;
          h = 0.2 + 0.15 * Math.sin(t * Math.PI * 2 + i * 0.7);
        } else if (state === "processing") {
          const t = Date.now() / 1500;
          h = 0.25 + 0.1 * Math.sin(t * Math.PI * 2 + i * 0.9);
        } else {
          const t = Date.now() / 4000;
          h = 0.08 + 0.04 * Math.sin(t * Math.PI * 2 + i * 1.2 + 3);
        }
        bar.style.transform = `scaleY(${Math.max(0.08, h)})`;
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [state, reduced]);

  const isError = state === "error";
  const baseHeight = reduced ? 60 : 60;

  return (
    <div ref={barsRef} className="flex items-center justify-center gap-[3px] sm:gap-[4px] h-full gpu-layer" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="w-[2px] sm:w-[3px] rounded-full origin-bottom gpu-layer"
          style={{
            height: baseHeight,
            backgroundColor: isError ? "rgba(232, 79, 79, 0.4)" : "rgba(0, 212, 255, 0.5)",
            opacity: state === "idle" ? 0.4 : isError ? 0.35 : 0.7,
            transform: `scaleY(${reduced ? 0.35 : 0.3})`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

function OrbitalDots({ count = 3, reduced }: { count?: number; reduced: boolean }) {
  return (
    <div className="absolute inset-0 gpu-layer" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 left-1/2 gpu-layer"
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            marginLeft: -1.5,
            marginTop: -1.5,
            backgroundColor: "rgba(0, 212, 255, 0.45)",
          }}
          animate={reduced ? {} : { rotate: 360 }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "linear", delay: i * 0.7 }}
        />
      ))}
    </div>
  );
}

export default function CentralRing({ state, mini }: CentralRingProps) {
  const reduced = useReducedMotion();
  const gyro = useGyroscope(mini ? 3 : 8);
  const [ringProgress, setRingProgress] = useState(1);
  const progressRef = useRef(1);
  const stateRef = useRef(state);
  stateRef.current = state;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    if (reduced) {
      setRingProgress(state === "processing" ? 0.6 : 1);
      return;
    }
    let frameId: number;
    const step = () => {
      const s = stateRef.current;
      const r = reducedRef.current;
      if (r) return cancelAnimationFrame(frameId);
      let p: number;
      if (s === "processing") {
        const t = Date.now() / 2000;
        p = 0.3 + 0.3 * Math.sin(t * Math.PI * 2);
      } else if (s === "idle" || s === "responding") {
        const t = Date.now() / 3500;
        p = 0.85 + 0.15 * Math.sin(t * Math.PI * 2);
      } else if (s === "listening") {
        p = 1;
      } else {
        const t = Date.now() / 3000;
        p = 0.5 + 0.1 * Math.sin(t * Math.PI * 2);
      }
      if (p !== progressRef.current) {
        progressRef.current = p;
        setRingProgress(p);
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [state, reduced]);

  const isError = state === "error";
  const accentColor = isError ? "rgba(232, 79, 79, 0.5)" : "rgba(0, 212, 255, 0.5)";
  const accentDim = isError ? "rgba(232, 79, 79, 0.1)" : "rgba(0, 212, 255, 0.08)";

  const containerClass = mini
    ? "relative w-full h-full flex items-center justify-center"
    : "relative flex items-center justify-center";

  const pulseAnim = reduced
    ? {}
    : {
        scale: state === "listening" ? ([1, 1.08, 1] as number[]) : ([1, 1.02, 1] as number[]),
        opacity: isError ? ([0.5, 0.3, 0.5] as number[]) : ([0.7, 1, 0.7] as number[]),
      };

  const dotSize = state === "listening" ? 5 : 3;

  return (
    <div className={containerClass} role="status" aria-label={`AI state: ${state}`}>
      <motion.div
        className="relative gpu-layer"
        style={{
          width: mini ? "100%" : "clamp(100px, 35vh, 180px)",
          aspectRatio: "1 / 1",
          transform: `translate(${gyro.x}px, ${gyro.y}px)`,
        }}
        animate={pulseAnim}
        transition={{
          duration: state === "listening" ? 0.8 : isError ? 3.5 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Layer 1: Outer ring (farthest) */}
        <div
          className="absolute inset-0 rounded-full gpu-layer"
          style={{
            border: "1px solid",
            borderColor: accentDim,
            transform: `translate(${-gyro.x * 0.3}px, ${-gyro.y * 0.3}px)`,
          }}
        />

        {/* Layer 2: Progress ring (middle) */}
        <motion.div
          className="absolute inset-0 rounded-full gpu-layer"
          style={{
            border: "1px solid",
            borderColor: accentColor,
            background: `conic-gradient(from 0deg, transparent ${(1 - ringProgress) * 360}deg, ${accentColor} ${(1 - ringProgress) * 360}deg)`,
            WebkitMask: "radial-gradient(circle at center, transparent calc(50% - 1px), black calc(50% - 0.5px), black calc(50% + 0.5px), transparent calc(50% + 1px))",
            mask: "radial-gradient(circle at center, transparent calc(50% - 1px), black calc(50% - 0.5px), black calc(50% + 0.5px), transparent calc(50% + 1px))",
            transform: `translate(${gyro.x * 0.2}px, ${gyro.y * 0.2}px)`,
            willChange: "transform",
          }}
          animate={reduced ? {} : { rotate: state === "processing" ? 360 : state === "idle" ? [0, 360] : 0 }}
          transition={
            state === "processing"
              ? { duration: 8, repeat: Infinity, ease: "linear" }
              : state === "idle"
              ? { duration: 30, repeat: Infinity, ease: "linear" }
              : { duration: 0 }
          }
        />

        {/* Layer 3: Waveform + center dot (closest) */}
        <div
          className="absolute inset-[20%] gpu-layer"
          style={{ transform: `translate(${gyro.x * 1.2}px, ${gyro.y * 1.2}px)` }}
        >
          <WaveformBars state={state} reduced={reduced} />
          {state === "processing" && <OrbitalDots reduced={reduced} />}
        </div>

        {/* Center dot */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full gpu-layer"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: isError ? "rgba(232, 79, 79, 0.6)" : "rgba(0, 212, 255, 0.8)",
            willChange: "transform, opacity",
          }}
          animate={reduced ? {} : { scale: state === "listening" ? ([1, 1.4, 1] as number[]) : ([1, 1.15, 1] as number[]) }}
          transition={{ duration: state === "listening" ? 0.6 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
