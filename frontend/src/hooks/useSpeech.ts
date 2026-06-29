import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "jarvis_voice_enabled";

function hasSpeech() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useSpeech() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const warmedRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!hasSpeech()) return;

    const load = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const uk = voices.find((v) => /uk|british|daniel|oliver|harry/i.test(v.name) && v.lang.startsWith("en"));
        const us = voices.find((v) => /google\s*us|samantha|aaron|fred/i.test(v.name) && v.lang.startsWith("en"));
        const any_en = voices.find((v) => v.lang.startsWith("en"));
        voiceRef.current = uk || us || any_en || null;
      }
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    const t = setTimeout(load, 1500);

    const warmup = () => {
      if (warmedRef.current) return;
      warmedRef.current = true;
      try {
        speechSynthesis.cancel();
        for (let i = 0; i < 3; i++) {
          const u = new SpeechSynthesisUtterance(" ");
          u.volume = 0;
          speechSynthesis.speak(u);
        }
        setTimeout(() => speechSynthesis.cancel(), 200);
      } catch { /* */ }
    };
    document.addEventListener("pointerdown", warmup, { once: true });
    document.addEventListener("touchstart", warmup, { once: true });

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      clearTimeout(t);
      document.removeEventListener("pointerdown", warmup);
      document.removeEventListener("touchstart", warmup);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(voiceEnabled)); } catch { /* */ }
  }, [voiceEnabled]);

  const speak = useCallback((text: string) => {
    if (!hasSpeech()) {
      console.warn("[speech] SpeechSynthesis not available");
      return;
    }
    if (!text || !text.trim()) return;

    const trySpeak = (retry = false) => {
      try {
        speechSynthesis.cancel();

        const doSpeak = () => {
          const u = new SpeechSynthesisUtterance(text);
          if (voiceRef.current) u.voice = voiceRef.current;
          u.rate = 0.9;
          u.pitch = 0.85;
          u.volume = 1;
          u.onstart = () => setSpeaking(true);
          u.onend = () => setSpeaking(false);
          u.onerror = (e) => {
            console.warn("[speech] error:", e.error);
            setSpeaking(false);
          };
          utteranceRef.current = u;
          speechSynthesis.speak(u);
        };

        if (retry) {
          setTimeout(doSpeak, 150);
        } else {
          doSpeak();
        }
      } catch (err) {
        console.warn("[speech] exception:", err);
        setSpeaking(false);
      }
    };

    trySpeak(false);

    // Chrome sometimes swallows first utterance after cancel
    if (!retryRef.current) {
      retryRef.current = true;
      setTimeout(() => {
        if (!utteranceRef.current || !speaking) {
          console.warn("[speech] first attempt may have failed, retrying...");
          trySpeak(true);
        }
      }, 1200);
    }
  }, []);

  const retryRef = useRef(false);

  const stop = useCallback(() => {
    try { speechSynthesis.cancel(); } catch { /* */ }
    setSpeaking(false);
  }, []);

  useEffect(() => {
    return () => { try { speechSynthesis.cancel(); } catch { /* */ } };
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((p) => {
      const next = !p;
      if (!next) stop();
      return next;
    });
  }, [stop]);

  const voiceLabel = voiceRef.current?.name || "Default";

  return { voiceEnabled, toggleVoice, speaking, speak, stop, supported: hasSpeech(), voiceReady: true, voiceLabel };
}
