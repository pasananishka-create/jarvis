import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "jarvis_voice_enabled";

export function useSpeech() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const load = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const uk = voices.find((v) => /uk|british|daniel|oliver|harry/i.test(v.name) && v.lang.startsWith("en"));
        const us = voices.find((v) => /google\s*us|samantha|aaron|fred|david|zira|jenny|aria/i.test(v.name) && v.lang.startsWith("en"));
        voiceRef.current = uk || us || voices.find((v) => v.lang.startsWith("en")) || null;
      }
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(voiceEnabled)); } catch {}
  }, [voiceEnabled]);

  const clearFallback = useCallback(() => {
    if (fallbackRef.current !== undefined) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = undefined;
    }
  }, []);

  const processQueue = useCallback(() => {
    if (speakingRef.current || queueRef.current.length === 0) return;

    const text = queueRef.current.shift()!;
    speakingRef.current = true;
    setSpeaking(true);

    try {
      // Cancel first to reset Chrome's synthesis engine (critical for avoiding stuck state)
      speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 0.9;
      u.pitch = 0.85;
      u.volume = 1;

      const onFinish = () => {
        clearFallback();
        speakingRef.current = false;
        setSpeaking(false);
        processQueue();
      };

      u.onend = onFinish;
      u.onerror = onFinish;

      // Safety net: Chrome sometimes never fires onend/onerror
      fallbackRef.current = setTimeout(() => {
        if (speakingRef.current) onFinish();
      }, 15000);

      speechSynthesis.speak(u);
    } catch {
      clearFallback();
      speakingRef.current = false;
      setSpeaking(false);
      processQueue();
    }
  }, [clearFallback]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!text || !text.trim()) return;

    queueRef.current.push(text);

    // If currently speaking, processQueue will pick this up from the queue
    if (!speakingRef.current) {
      processQueue();
    }
  }, [processQueue]);

  const stop = useCallback(() => {
    clearFallback();
    try { speechSynthesis.cancel(); } catch {}
    speakingRef.current = false;
    setSpeaking(false);
    queueRef.current = [];
  }, [clearFallback]);

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
