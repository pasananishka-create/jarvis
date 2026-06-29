import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTts } from "../hooks/useTts";
import { directChat, getConfig, hasAnyKey, JARVIS_SYSTEM } from "../lib/directAi";

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
}

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEvent { results: SpeechRecognitionResultList; resultIndex: number; }
interface SpeechRecognitionResultList { [index: number]: SpeechRecognitionResult; length: number; }
interface SpeechRecognitionResult { isFinal: boolean; [index: number]: SpeechRecognitionAlternative; }
interface SpeechRecognitionAlternative { transcript: string; confidence: number; }
interface SpeechRecognitionErrorEvent { error: string; message: string; }

type VoicePhase = "idle" | "listening" | "processing" | "speaking" | "done";

const TTS_BACKEND_URLS = [
  "http://localhost:8000",
  `${window.location.protocol}//${window.location.hostname}:8000`,
  window.location.origin,
];
const API_BASE = "/api";

async function callAi(text: string): Promise<string> {
  const cfg = getConfig();

  // Try backend first
  for (const base of TTS_BACKEND_URLS) {
    try {
      const resp = await fetch(`${base}${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const data = await resp.json();
        return data.response || "";
      }
    } catch {}
  }

  // Fallback to direct mode
  if (!hasAnyKey()) throw new Error("No API key configured. Open Settings.");
  let full = "";
  for await (const chunk of directChat([
    { role: "system", content: JARVIS_SYSTEM },
    { role: "user", content: text },
  ])) {
    full += chunk;
  }
  return full;
}

export default function VoiceMode({ isOpen, onClose }: VoiceModeProps) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { play, stop: stopTts } = useTts();

  // Stop recognition
  const stopRecognition = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  // Start voice recognition
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setPhase("done"); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    recognitionRef.current = r;
    setTranscript("");
    setAiResponse("");
    setPhase("listening");

    let finalTranscript = "";

    r.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0].transcript;
          finalTranscript = finalTranscript ? finalTranscript + " " + t : t;
          setTranscript(finalTranscript);
        } else {
          const interim = e.results[i][0].transcript;
          setTranscript(finalTranscript ? finalTranscript + " " + interim : interim);
        }
      }
    };

    r.onerror = () => {
      stopRecognition();
      // If we got some text, process it; otherwise go back to idle
      if (finalTranscript) processInput(finalTranscript);
      else setPhase("idle");
    };

    r.onend = () => {
      if (finalTranscript) processInput(finalTranscript);
      else setPhase("idle");
    };

    try { r.start(); } catch {
      setPhase("done");
    }
  }, []);

  // Process voice input → AI → TTS
  const processInput = useCallback(async (input: string) => {
    const text = input.trim();
    if (!text) { setPhase("idle"); return; }

    setPhase("processing");
    try {
      const response = await callAi(text);
      setAiResponse(response);

      if (response) {
        setPhase("speaking");
        await play(response);
      }

      setPhase("done");
      // Auto-close after 2s
      setTimeout(() => onClose(), 2000);
    } catch {
      setPhase("done");
      setTimeout(() => onClose(), 1500);
    }
  }, [play, onClose]);

  // Start listening when the overlay opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(startListening, 300); // small delay for animation
      return () => { clearTimeout(t); stopRecognition(); };
    }
    return () => {};
  }, [isOpen, startListening, stopRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopRecognition(); stopTts(); };
  }, [stopRecognition, stopTts]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;
    let time = 0;

    const draw = () => {
      time += 0.03;
      ctx.clearRect(0, 0, w, h);

      const isActive = phase === "listening" || phase === "speaking";
      const ampMult = phase === "listening" ? 1 : phase === "speaking" ? 0.6 : 0.2;

      // Glow band
      const bandGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.5);
      bandGrad.addColorStop(0, isActive ? "rgba(0,229,255,0.04)" : "rgba(0,229,255,0.02)");
      bandGrad.addColorStop(1, "transparent");
      ctx.fillStyle = bandGrad;
      ctx.fillRect(0, 0, w, h);

      // Pulse rings
      for (let i = 0; i < 4; i++) {
        const pr = Math.min(w, h) * (0.08 + i * 0.08) + Math.sin(time + i * 1.2) * 15;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${isActive ? 0.04 + Math.sin(time + i) * 0.02 : 0.02})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Waveform
      const bars = 64;
      const barWidth = (w / bars) * 0.6;
      const gap = (w / bars) * 0.4;
      for (let i = 0; i < bars; i++) {
        const amp = isActive
          ? (0.2 + Math.sin(time * 3 + i * 0.3) * 0.25 + Math.sin(time * 5 + i * 0.7) * 0.15) * h * 0.15 * ampMult
          : (0.05 + Math.sin(time * 2 + i * 0.5) * 0.04) * h * 0.15;
        const x = i * (barWidth + gap) + gap / 2;
        const y = h / 2;
        const alpha = (0.12 + Math.sin(time + i * 0.5) * 0.08) * (isActive ? 2 : 1);
        ctx.fillStyle = `hsla(180, 100%, 65%, ${alpha})`;
        ctx.fillRect(x, y - amp, barWidth, amp * 2);
      }

      // Radar sweep
      const cx = w / 2, cy = h / 2;
      const radarR = Math.min(w, h) * 0.35;
      const sweepAngle = time;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarR, sweepAngle - 0.25, sweepAngle + 0.25);
      ctx.closePath();
      ctx.fillStyle = isActive ? "rgba(0,229,255,0.04)" : "rgba(0,229,255,0.02)";
      ctx.fill();

      // Radar ticks
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * radarR * 0.9, cy + Math.sin(a) * radarR * 0.9);
        ctx.lineTo(cx + Math.cos(a) * radarR, cy + Math.sin(a) * radarR);
        ctx.strokeStyle = `rgba(0,229,255,${isActive ? 0.03 + Math.sin(time + i) * 0.015 : 0.015})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, phase]);

  const phaseLabel = {
    idle: "AWAITING INPUT",
    listening: "I'M LISTENING",
    processing: "ANALYZING...",
    speaking: "SPEAKING",
    done: "COMPLETE",
  }[phase];

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

          {/* Header */}
          <div className="relative z-10 flex justify-between items-center px-5 pt-5">
            <motion.button
              onClick={() => { stopRecognition(); stopTts(); onClose(); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                border: "1px solid rgba(0,229,255,0.15)",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(12px)",
              }}
            >
              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="text-[10px] font-mono tracking-[0.1em] text-white/50">CLOSE</span>
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: phase === "listening" ? "#00FFC8" : phase === "speaking" ? "#3B82F6" : "#00E5FF",
                  boxShadow: phase === "listening" ? "0 0 8px #00FFC8" : "0 0 8px #3B82F6",
                }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[9px] font-mono tracking-[0.15em] text-white/40">
                {phaseLabel}
              </span>
            </div>
          </div>

          {/* Center content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
            <motion.p
              className="text-[11px] font-mono tracking-[0.3em] mb-6"
              style={{ color: phase === "listening" ? "rgba(0,229,255,0.5)" : phase === "speaking" ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.3)" }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {phaseLabel}
            </motion.p>

            {/* Live transcript / AI response */}
            {transcript && (phase === "listening" || phase === "processing") && (
              <motion.div
                className="text-center max-w-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[15px] sm:text-[18px] font-sans leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {transcript}
                </p>
              </motion.div>
            )}

            {aiResponse && (phase === "speaking" || phase === "done") && (
              <motion.div
                className="text-center max-w-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[13px] sm:text-[15px] font-sans leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {aiResponse.slice(0, 200)}
                  {aiResponse.length > 200 ? "..." : ""}
                </p>
              </motion.div>
            )}

            {!transcript && !aiResponse && phase === "idle" && (
              <motion.p
                className="text-[13px] font-mono tracking-[0.1em]"
                style={{ color: "rgba(255,255,255,0.2)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Speak now...
              </motion.p>
            )}

            {phase === "done" && (
              <motion.p
                className="text-[10px] font-mono tracking-[0.15em] mt-4"
                style={{ color: "rgba(0,229,255,0.4)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                CLOSING...
              </motion.p>
            )}
          </div>

          {/* Bottom prompt */}
          <div className="relative z-10 text-center pb-12">
            <p className="text-[9px] font-mono tracking-[0.15em] text-white/20">
              {phase === "listening" ? "Speak clearly into your microphone" :
               phase === "processing" ? "Processing your request" :
               phase === "speaking" ? "JARVIS is responding" :
               phase === "done" ? "Done" : "\u00A0"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
