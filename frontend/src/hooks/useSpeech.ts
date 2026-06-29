import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "jarvis_voice_enabled";

export function useSpeech() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const warmedRef = useRef(false);
  const pendingSpeakRef = useRef(false);

  useEffect(() => {
    const hasSpeech = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(hasSpeech);
    if (!hasSpeech) return;

    const load = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const uk = voices.find((v) => /uk|british|daniel|oliver|harry/i.test(v.name) && v.lang.startsWith("en"));
        const us = voices.find((v) => /google\s*us|samantha|aaron|fred/i.test(v.name) && v.lang.startsWith("en"));
        const any_en = voices.find((v) => v.lang.startsWith("en"));
        voiceRef.current = uk || us || any_en || null;
        setVoiceReady(true);
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
          u.rate = 1;
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

  const stop = useCallback(() => {
    try { speechSynthesis.cancel(); } catch { /* */ }
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported) {
      console.warn("[speech] SpeechSynthesis not available");
      return;
    }
    if (!text || !text.trim()) return;

    try {
      stop();
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 0.9;
      u.pitch = 0.85;
      u.volume = 1;
      u.onstart = () => { setSpeaking(true); pendingSpeakRef.current = false; };
      u.onend = () => setSpeaking(false);
      u.onerror = (e) => {
        console.warn("[speech] error:", e.error, "text:", text.slice(0, 50));
        setSpeaking(false);
        pendingSpeakRef.current = false;
      };
      utteranceRef.current = u;
      speechSynthesis.speak(u);
      // Chrome sometimes swallows utterances - retry once if no onstart fires
      pendingSpeakRef.current = true;
      setTimeout(() => {
        if (pendingSpeakRef.current) {
          console.warn("[speech] utterance may have been swallowed, retrying...");
          pendingSpeakRef.current = false;
          try {
            speechSynthesis.cancel();
            const u2 = new SpeechSynthesisUtterance(text);
            if (voiceRef.current) u2.voice = voiceRef.current;
            u2.rate = 0.9;
            u2.pitch = 0.85;
            u2.volume = 1;
            u2.onstart = () => setSpeaking(true);
            u2.onend = () => setSpeaking(false);
            u2.onerror = (e) => { console.warn("[speech] retry error:", e.error); setSpeaking(false); };
            speechSynthesis.speak(u2);
          } catch { /* */ }
        }
      }, 1000);
    } catch (err) {
      console.warn("[speech] exception:", err);
      setSpeaking(false);
    }
  }, [supported, stop]);

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

  const voiceLabel = voiceReady
    ? (voiceRef.current?.name || "Default")
    : "Loading...";

  return { voiceEnabled, toggleVoice, speaking, speak, stop, supported, voiceReady, voiceLabel };
}
