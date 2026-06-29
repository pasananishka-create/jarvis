import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "jarvis_voice_enabled";

function findJarvisVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const uk = voices.find((v) => /uk|british|daniel|oliver|harry/i.test(v.name) && v.lang.startsWith("en"));
  if (uk) return uk;
  const us = voices.find((v) => /google\s*us|samantha|aaron|fred/i.test(v.name) && v.lang.startsWith("en"));
  if (us) return us;
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

export function useSpeech() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const warmedRef = useRef(false);

  useEffect(() => {
    const hasSpeech = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(hasSpeech);
    if (!hasSpeech) return;

    const load = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        voiceRef.current = findJarvisVoice(voices);
      }
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    const t = setTimeout(load, 1000);

    const handler = () => {
      if (warmedRef.current) return;
      warmedRef.current = true;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        speechSynthesis.speak(u);
        setTimeout(() => speechSynthesis.cancel(), 100);
      } catch { /* */ }
    };
    document.addEventListener("pointerdown", handler, { once: true });
    document.addEventListener("touchstart", handler, { once: true });

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      clearTimeout(t);
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(voiceEnabled)); } catch { /* */ }
  }, [voiceEnabled]);

  const speak = useCallback((text: string) => {
    if (!supported) {
      console.warn("[speech] not supported on this browser");
      return;
    }
    try {
      speechSynthesis.cancel();
      setSpeaking(false);
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 0.92;
      u.pitch = 0.85;
      u.volume = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = (e) => {
        console.warn("[speech] speak error:", e.error);
        setSpeaking(false);
      };
      utteranceRef.current = u;
      speechSynthesis.speak(u);
    } catch (err) {
      console.warn("[speech] exception:", err);
      setSpeaking(false);
    }
  }, [supported]);

  const stop = useCallback(() => {
    try {
      speechSynthesis.cancel();
    } catch { /* */ }
    setSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((p) => !p);
    if (voiceEnabled) stop();
  }, [voiceEnabled, stop]);

  useEffect(() => {
    return () => { try { speechSynthesis.cancel(); } catch { /* */ } };
  }, []);

  return { voiceEnabled, toggleVoice, speaking, speak, stop, supported };
}
