import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "jarvis_voice_enabled";

function findJarvisVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const uk = voices.find((v) => /uk|british|daniel/i.test(v.name) && v.lang.startsWith("en"));
  if (uk) return uk;
  const en = voices.find((v) => /google\s*us|samantha/i.test(v.name) && v.lang.startsWith("en"));
  if (en) return en;
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

function warmupSpeech() {
  try {
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    u.rate = 1;
    speechSynthesis.speak(u);
    setTimeout(() => speechSynthesis.cancel(), 50);
  } catch { /* */ }
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

    // Chrome loads voices asynchronously; poll + event both
    const load = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        voiceRef.current = findJarvisVoice(voices);
      }
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    // Retry after a delay for Chrome
    const t = setTimeout(load, 500);

    // Warm up speech engine on first user click
    const handler = () => {
      if (warmedRef.current) return;
      warmedRef.current = true;
      warmupSpeech();
    };
    document.addEventListener("pointerdown", handler, { once: true });

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      clearTimeout(t);
      document.removeEventListener("pointerdown", handler);
    };
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
    u.onerror = (e) => { console.warn("[speech] error:", e.error); setSpeaking(false); };
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
