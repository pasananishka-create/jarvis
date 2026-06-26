import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function MountSequence({ onComplete }: MountSequenceProps) {
  const [phase, setPhase] = useState<"ring" | "text" | "ready" | "done">("ring");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setPhase("done");
      onComplete();
      return;
    }

    const t1 = setTimeout(() => setPhase("text"), 800);
    const t2 = setTimeout(() => setPhase("ready"), 1800);
    const t3 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete, reduced]);

  const circ = 2 * Math.PI * 46;

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080C10]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative w-28 h-28 sm:w-36 sm:h-36">
            {/* Ring draws in */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
              <motion.circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="rgba(0, 212, 255, 0.5)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray={`${circ}`}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: phase === "ring" ? 0 : 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                transform="rotate(-90 50 50)"
              />
              <motion.circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="rgba(0, 212, 255, 0.12)"
                strokeWidth="0.8"
                strokeDasharray={`${circ}`}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: phase === "ring" ? circ * 0.3 : 0 }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                transform="rotate(90 50 50)"
              />
            </svg>

            {/* Center dot appears */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D4FF]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ width: 4, height: 4, boxShadow: "0 0 12px rgba(0, 212, 255, 0.3)" }}
            />
          </div>

          {/* Text assembles */}
          <div className="mt-10 text-center">
            <motion.div
              className="overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{ duration: 0.5, delay: 0.9, ease: "easeInOut" }}
            >
              <h1 className="text-[11px] sm:text-sm font-mono tracking-[0.35em] text-[#00D4FF]/80 whitespace-nowrap">
                J.A.R.V.I.S.
              </h1>
            </motion.div>
            <motion.p
              className="text-[8px] sm:text-[9px] font-mono tracking-[0.25em] text-[#00D4FF]/25 mt-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              Neural interface initializing
            </motion.p>
            <motion.div
              className="h-[1px] bg-[#00D4FF]/20 mt-5 mx-auto"
              initial={{ width: 0 }}
              animate={{ width: "40%" }}
              transition={{ duration: 0.8, delay: 1.6, ease: "easeInOut" }}
              style={{ maxWidth: 120 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
