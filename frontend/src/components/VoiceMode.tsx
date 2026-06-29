import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  listening: boolean;
  transcript: string;
}

export default function VoiceMode({ isOpen, onClose, listening, transcript }: VoiceModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"idle" | "listening" | "processing">("idle");

  useEffect(() => {
    if (listening) setPhase("listening");
    else if (transcript) setPhase("processing");
    else setPhase("idle");
  }, [listening, transcript]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;
    let time = 0;

    const bars = 64;
    const barWidth = (w / bars) * 0.6;
    const gap = (w / bars) * 0.4;

    const draw = () => {
      time += 0.03;
      ctx.clearRect(0, 0, w, h);

      // Waveform
      for (let i = 0; i < bars; i++) {
        const t = i / bars;
        const amp = phase === "listening"
          ? (0.3 + Math.sin(time * 3 + i * 0.3) * 0.3 + Math.sin(time * 5 + i * 0.7) * 0.2) * h * 0.15
          : 0.1 * h * 0.15;
        const x = i * (barWidth + gap) + gap / 2;
        const y = h / 2;
        const alpha = 0.3 + Math.sin(time + i * 0.5) * 0.2;
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.fillRect(x, y - amp, barWidth, amp * 2);
      }

      // Radar circle
      const cx = w / 2;
      const cy = h / 2;
      const radarR = Math.min(w, h) * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, radarR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Rotating radar sweep
      const sweepAngle = time;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarR, sweepAngle - 0.3, sweepAngle + 0.3);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,229,255,0.03)";
      ctx.fill();

      // Center glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarR * 0.3);
      grad.addColorStop(0, phase === "listening" ? "rgba(0,229,255,0.08)" : "rgba(0,229,255,0.04)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - radarR * 0.3, cy - radarR * 0.3, radarR * 0.6, radarR * 0.6);

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, phase]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ backgroundColor: "#04060B" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <canvas ref={canvasRef} className="absolute inset-0" />

          {/* Close button */}
          <div className="relative z-10 flex justify-between items-center px-5 pt-5">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                border: "1px solid rgba(0,229,255,0.15)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="text-[10px] font-mono tracking-[0.1em] text-white/50">CLOSE</span>
            </button>

            <div className="flex items-center gap-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: listening ? "#00FFC8" : "#3B82F6" }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[9px] font-mono tracking-[0.15em] text-white/40">
                {listening ? "LISTENING" : transcript ? "PROCESSING" : "STANDBY"}
              </span>
            </div>
          </div>

          {/* Center status */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
            <motion.p
              className="text-[11px] font-mono tracking-[0.3em] text-white/30 mb-6"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {listening ? "I'M LISTENING" : transcript ? "PROCESSING..." : "AWAITING INPUT"}
            </motion.p>

            {transcript && (
              <motion.div
                className="text-center max-w-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[15px] sm:text-[18px] font-sans text-white/80 leading-relaxed">
                  {transcript}
                </p>
              </motion.div>
            )}
          </div>

          {/* Bottom prompt */}
          <div className="relative z-10 text-center pb-12">
            <p className="text-[9px] font-mono tracking-[0.15em] text-white/20">
              {listening ? "Tap close to stop" : "Say something..."}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
