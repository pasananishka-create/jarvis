import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "jarvis_voice_enabled";

function findJarvisVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const uk = voices.find((v) => /uk|british|daniel/i.test(v.name) && v.lang.startsWith("en"));
  if (uk) return uk;
  const en = voices.find((v) => /google\s*us|samantha/i.test(v.name) && v.lang.startsWith("en"));
  if (en) return en;
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

  useEffect(() => {
    const hasSpeech = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(hasSpeech);
    if (!hasSpeech) return;

    const load = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) voiceRef.current = findJarvisVoice(voices);
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(voiceEnabled)); } catch { /* */ }
  }, [voiceEnabled]);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    stop();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voiceRef.current;
    u.rate = 0.92;
    u.pitch = 0.85;
    u.volume = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utteranceRef.current = u;
    speechSynthesis.speak(u);
  }, [supported]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((p) => !p);
  }, []);

  return { voiceEnabled, toggleVoice, speaking, speak, stop, supported };
}
