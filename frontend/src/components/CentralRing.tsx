import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
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

function useGsapRing(
  containerRef: React.RefObject<HTMLDivElement | null>,
  progressRingRef: React.RefObject<HTMLDivElement | null>,
  dotRef: React.RefObject<HTMLDivElement | null>,
  state: RingState,
  reduced: boolean,
) {
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (reduced || !containerRef.current) return;
    // Kill previous timeline
    if (tlRef.current) tlRef.current.kill();

    const tl = gsap.timeline({ paused: true });
    tlRef.current = tl;

    const container = containerRef.current;

    // Continuous slow rotation of the progress ring
    if (progressRingRef.current) {
      tl.to(progressRingRef.current, {
        rotation: 360,
        duration: state === "processing" ? 8 : 30,
        repeat: -1,
        ease: "none",
      }, 0);
    }

    // Scale pulse on the whole container
    const scaleTo = state === "listening" ? 1.08 : 1.02;
    const pulseDur = state === "listening" ? 0.8 : 3.5;
    tl.to(container, {
      scale: scaleTo,
      duration: pulseDur / 2,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut",
    }, 0);

    // Opacity pulse
    tl.to(container, {
      opacity: state === "error" ? 0.4 : 0.85,
      duration: 2.5,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut",
    }, 0);

    // Center dot pulse
    if (dotRef.current) {
      const dotScale = state === "listening" ? 1.4 : 1.15;
      const dotDur = state === "listening" ? 0.6 : 2.5;
      tl.to(dotRef.current, {
        scale: dotScale,
        duration: dotDur / 2,
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut",
      }, 0);
    }

    tl.play();
    return () => { tl.kill(); };
  }, [state, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
}

function WaveformBars({ state, reduced }: { state: RingState; reduced: boolean }) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const bars = barsRef.current?.children;
    if (!bars) return;

    let frameId: number;
    const step = () => {
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

  return (
    <div ref={barsRef} className="flex items-center justify-center gap-[3px] sm:gap-[4px] h-full gpu-layer" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="w-[2px] sm:w-[3px] rounded-full origin-bottom gpu-layer"
          style={{
            height: 60,
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
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || !dotsRef.current) return;
    const dots = dotsRef.current.children;
    // Animate each dot in orbit using GSAP
    const anims: gsap.core.Tween[] = [];
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i] as HTMLElement;
      const dur = 4 + i;
      anims.push(
        gsap.to(dot, {
          rotation: 360,
          transformOrigin: "140% 50%",
          duration: dur,
          repeat: -1,
          ease: "none",
          delay: i * 0.7,
        })
      );
    }
    return () => anims.forEach((a) => a.kill());
  }, [reduced]);

  return (
    <div ref={dotsRef} className="absolute inset-0 gpu-layer" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
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
        />
      ))}
    </div>
  );
}

function PulseRing({ id, onComplete }: { id: number; onComplete: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { scale: 1, opacity: 0.6 },
      {
        scale: 1.8,
        opacity: 0,
        duration: 2,
        ease: "power2.out",
        onComplete: () => onComplete(id),
      }
    );
  }, [id, onComplete]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 rounded-full gpu-layer"
      style={{
        border: "1px solid rgba(0, 212, 255, 0.12)",
        willChange: "transform, opacity",
      }}
    />
  );
}

function PulseRingManager({ state, reduced }: { state: RingState; reduced: boolean }) {
  const [ringIds, setRingIds] = useState<number[]>([]);
  const idCounter = useRef(0);

  const removeRing = useRef((id: number) => {
    setRingIds((prev) => prev.filter((rid) => rid !== id));
  });

  useEffect(() => {
    if (reduced || state === "error") { setRingIds([]); return; }

    const spawn = () => {
      const id = ++idCounter.current;
      setRingIds((prev) => [...prev, id]);
    };

    let interval: number;
    if (state === "listening") {
      spawn();
      interval = window.setInterval(spawn, 1200);
    } else if (state === "processing" || state === "responding") {
      spawn();
      interval = window.setInterval(spawn, 2500);
    } else {
      interval = window.setInterval(spawn, 4000);
    }

    return () => clearInterval(interval);
  }, [state, reduced]);

  return (
    <>
      {ringIds.map((id) => (
        <PulseRing key={id} id={id} onComplete={removeRing.current} />
      ))}
    </>
  );
}

function ProgressRing({ state, reduced, gyroX, gyroY, accentColor, accentDim }: {
  state: RingState; reduced: boolean; gyroX: number; gyroY: number;
  accentColor: string; accentDim: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(1);
  const progressRef = useRef(1);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (reduced) { setProgress(state === "processing" ? 0.6 : 1); return; }
    let frameId: number;
    const step = () => {
      const s = stateRef.current;
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
      if (p !== progressRef.current) { progressRef.current = p; setProgress(p); }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [state, reduced]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 rounded-full gpu-layer"
      style={{
        border: "1px solid",
        borderColor: accentColor,
        background: `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, ${accentColor} ${(1 - progress) * 360}deg)`,
        WebkitMask: "radial-gradient(circle at center, transparent calc(50% - 1px), black calc(50% - 0.5px), black calc(50% + 0.5px), transparent calc(50% + 1px))",
        mask: "radial-gradient(circle at center, transparent calc(50% - 1px), black calc(50% - 0.5px), black calc(50% + 0.5px), transparent calc(50% + 1px))",
        transform: `translate(${gyroX * 0.2}px, ${gyroY * 0.2}px)`,
        willChange: "transform",
      }}
    />
  );
}

export default function CentralRing({ state, mini }: CentralRingProps) {
  const reduced = useReducedMotion();
  const gyro = useGyroscope(mini ? 3 : 8);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRingRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useGsapRing(containerRef, progressRingRef, dotRef, state, reduced);

  const isError = state === "error";
  const accentColor = isError ? "rgba(232, 79, 79, 0.5)" : "rgba(0, 212, 255, 0.5)";
  const accentDim = isError ? "rgba(232, 79, 79, 0.1)" : "rgba(0, 212, 255, 0.08)";
  const dotSize = state === "listening" ? 5 : 3;

  const containerClass = mini
    ? "relative w-full h-full flex items-center justify-center"
    : "relative flex items-center justify-center";

  return (
    <div className={containerClass} role="status" aria-label={`AI state: ${state}`}>
      <div
        ref={containerRef}
        className="relative gpu-layer"
        style={{
          width: mini ? "100%" : "clamp(100px, 35vh, 180px)",
          aspectRatio: "1 / 1",
          transform: `translate(${gyro.x}px, ${gyro.y}px)`,
          willChange: "transform, opacity",
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

        {/* Pulse rings (GSAP) */}
        <PulseRingManager state={state} reduced={reduced} />

        {/* Layer 2: Progress ring (middle) — GSAP rotation */}
        <ProgressRing
          state={state}
          reduced={reduced}
          gyroX={gyro.x}
          gyroY={gyro.y}
          accentColor={accentColor}
          accentDim={accentDim}
        />

        {/* Layer 3: Waveform + center dot (closest) */}
        <div
          className="absolute inset-[20%] gpu-layer"
          style={{ transform: `translate(${gyro.x * 1.2}px, ${gyro.y * 1.2}px)` }}
        >
          <WaveformBars state={state} reduced={reduced} />
          {state === "processing" && <OrbitalDots reduced={reduced} />}
        </div>

        {/* Center dot — GSAP pulsing */}
        <div
          ref={dotRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full gpu-layer"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: isError ? "rgba(232, 79, 79, 0.6)" : "rgba(0, 212, 255, 0.8)",
            boxShadow: isError
              ? "0 0 12px rgba(232, 79, 79, 0.3)"
              : "0 0 16px rgba(0, 212, 255, 0.3)",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}
