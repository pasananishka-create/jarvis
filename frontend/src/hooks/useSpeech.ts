import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "jarvis_voice_enabled";

export function useSpeech() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const warmedRef = useRef(false);

  // Load voices + warmup on first user gesture
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const uk = voices.find((v) => /uk|british|daniel|oliver|harry/i.test(v.name) && v.lang.startsWith("en"));
        const us = voices.find((v) => /google\s*us|samantha|aaron|fred|david|zira|jenny|aria/i.test(v.name) && v.lang.startsWith("en"));
        const any_en = voices.find((v) => v.lang.startsWith("en"));
        voiceRef.current = uk || us || any_en || null;
      }
    };
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    const t = setTimeout(loadVoices, 1500);

    const warmup = () => {
      if (warmedRef.current) return;
      warmedRef.current = true;
      try {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        u.rate = 1;
        u.onend = () => {
          warmedRef.current = true; // mark fully warmed
        };
        speechSynthesis.speak(u);
      } catch { /* */ }
    };
    document.addEventListener("pointerdown", warmup, { once: true, passive: true });
    document.addEventListener("touchstart", warmup, { once: true, passive: true });

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(voiceEnabled)); } catch { /* */ }
  }, [voiceEnabled]);

  const stop = useCallback(() => {
    try { speechSynthesis.cancel(); } catch { /* */ }
    setSpeaking(false);
    speakingRef.current = false;
    utteranceRef.current = null;
  }, []);

  const processQueue = useCallback(() => {
    if (speakingRef.current || queueRef.current.length === 0) return;
    const text = queueRef.current.shift()!;
    speakingRef.current = true;
    setSpeaking(true);
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 0.9;
      u.pitch = 0.85;
      u.volume = 1;
      u.onend = () => {
        speakingRef.current = false;
        setSpeaking(false);
        utteranceRef.current = null;
        processQueue();
      };
      u.onerror = () => {
        speakingRef.current = false;
        setSpeaking(false);
        utteranceRef.current = null;
        processQueue();
      };
      utteranceRef.current = u;
      speechSynthesis.speak(u);
    } catch {
      speakingRef.current = false;
      setSpeaking(false);
      utteranceRef.current = null;
      processQueue();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("[speech] SpeechSynthesis not available");
      return;
    }
    if (!text || !text.trim()) return;
    queueRef.current.push(text);
    processQueue();
  }, [processQueue]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((p) => {
      const next = !p;
      if (!next) {
        stop();
        queueRef.current = [];
      }
      return next;
    });
  }, [stop]);

  const voiceLabel = voiceRef.current?.name || "Default";

  return { voiceEnabled, toggleVoice, speaking, speak, stop, supported: true, voiceReady: true, voiceLabel };
}
