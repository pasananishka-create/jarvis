import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface MountSequenceProps {
  onComplete: () => void;
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

function playStartupSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export default function MountSequence({ onComplete }: MountSequenceProps) {
  const [phase, setPhase] = useState<"ring" | "text" | "ready" | "done">("ring");
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const circle1Ref = useRef<SVGCircleElement>(null);
  const circle2Ref = useRef<SVGCircleElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) {
      setPhase("done");
      onComplete();
      return;
    }

    playStartupSound();

    const circ = 2 * Math.PI * 46;
    const tl = gsap.timeline({
      onComplete: () => { setPhase("done"); onComplete(); },
    });

    tl.set(containerRef.current, { opacity: 1, display: "flex" });
    tl.to(circle1Ref.current, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, 0);
    tl.to(circle2Ref.current, { strokeDashoffset: circ * 0.3, duration: 1.2, ease: "power1.out" }, 0.3);
    tl.to(dotRef.current, { scale: 1, opacity: 0.8, duration: 0.6, ease: "back.out(2)" }, 0.4);
    tl.call(() => setPhase("text"), undefined, 0.8);
    tl.to(titleRef.current, { width: "auto", duration: 0.6, ease: "power2.inOut" }, 1.2);
    tl.fromTo(subtitleRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 1.6);
    tl.call(() => setPhase("ready"), undefined, 1.8);
    tl.to(lineRef.current, { width: "40%", duration: 0.8, ease: "power2.inOut" }, 1.8);
    tl.to(containerRef.current, { opacity: 0, duration: 0.4 }, 2.8);

    return () => { tl.kill(); };
  }, [onComplete, reduced]);

  const circ = 2 * Math.PI * 46;

  if (reduced) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex-col items-center justify-center bg-black"
      style={{ display: phase === "done" ? "none" : "flex", opacity: 0 }}
    >
      <div className="relative w-28 h-28 sm:w-36 sm:h-36">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
          <circle
            ref={circle1Ref}
            cx="50" cy="50" r="46"
            fill="none"
            stroke="rgba(0, 212, 255, 0.5)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            strokeDashoffset={circ}
            transform="rotate(-90 50 50)"
          />
          <circle
            ref={circle2Ref}
            cx="50" cy="50" r="46"
            fill="none"
            stroke="rgba(0, 212, 255, 0.12)"
            strokeWidth="0.8"
            strokeDasharray={`${circ}`}
            strokeDashoffset={circ}
            transform="rotate(90 50 50)"
          />
        </svg>

        <div
          ref={dotRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D4FF]"
          style={{ width: 4, height: 4, boxShadow: "0 0 12px rgba(0, 212, 255, 0.3)", scale: 0, opacity: 0 }}
        />
      </div>

      <div className="mt-10 text-center">
        <div ref={titleRef} className="overflow-hidden" style={{ width: 0 }}>
          <h1 className="text-[11px] sm:text-sm font-mono tracking-[0.35em] text-[#00D4FF]/80 whitespace-nowrap">
            J.A.R.V.I.S.
          </h1>
        </div>
        <p
          ref={subtitleRef}
          className="text-[8px] sm:text-[9px] font-mono tracking-[0.25em] text-[#00D4FF]/25 mt-3"
          style={{ opacity: 0, y: 10 }}
        >
          Neural interface initializing
        </p>
        <div
          ref={lineRef}
          className="h-[1px] bg-[#00D4FF]/20 mt-5 mx-auto"
          style={{ width: 0, maxWidth: 120 }}
        />
      </div>
    </div>
  );
}
