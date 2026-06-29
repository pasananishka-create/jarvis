import { useRef, useCallback, useEffect } from "react";

type SoundName =
  | "startup"
  | "shutdown"
  | "listening"
  | "thinking"
  | "speaking"
  | "notification"
  | "error"
  | "success"
  | "commandAccepted"
  | "taskComplete";

interface SoundConfig {
  frequency?: number;
  type?: OscillatorType;
  duration?: number;
  gain?: number;
  ramp?: "sine" | "exp";
}

const SOUND_MAP: Record<SoundName, SoundConfig> = {
  startup: { frequency: 880, type: "sine", duration: 0.4, gain: 0.08, ramp: "exp" },
  shutdown: { frequency: 440, type: "sine", duration: 0.3, gain: 0.06, ramp: "exp" },
  listening: { frequency: 660, type: "sine", duration: 0.15, gain: 0.05, ramp: "exp" },
  thinking: { frequency: 520, type: "triangle", duration: 0.2, gain: 0.04, ramp: "exp" },
  speaking: { frequency: 740, type: "sine", duration: 0.1, gain: 0.03, ramp: "sine" },
  notification: { frequency: 1000, type: "sine", duration: 0.12, gain: 0.06, ramp: "exp" },
  error: { frequency: 200, type: "sawtooth", duration: 0.3, gain: 0.07, ramp: "exp" },
  success: { frequency: 1200, type: "sine", duration: 0.25, gain: 0.06, ramp: "exp" },
  commandAccepted: { frequency: 780, type: "sine", duration: 0.15, gain: 0.05, ramp: "exp" },
  taskComplete: { frequency: 1400, type: "sine", duration: 0.35, gain: 0.05, ramp: "exp" },
};

export function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabledRef.current) return;
      try {
        const ctx = getCtx();
        const cfg = SOUND_MAP[name];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = cfg.type || "sine";
        osc.frequency.setValueAtTime(cfg.frequency || 440, ctx.currentTime);
        gain.gain.setValueAtTime(cfg.gain || 0.05, ctx.currentTime);
        if (cfg.ramp === "exp") {
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (cfg.duration || 0.2));
        } else {
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + (cfg.duration || 0.2));
        }
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + (cfg.duration || 0.2));
      } catch {}
    },
    [getCtx]
  );

  const setEnabled = useCallback((v: boolean) => {
    enabledRef.current = v;
  }, []);

  return { play, setEnabled };
}
