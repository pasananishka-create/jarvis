import { useCallback, useRef } from "react";

const TTS_ENDPOINTS = [
  "http://localhost:8000/api/tts",
  `${window.location.protocol}//${window.location.hostname}:8000/api/tts`,
  `${window.location.origin}/api/tts`,
];

export function useTts() {
  const currentRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async (text: string): Promise<void> => {
    // Try backend edge-tts
    for (const url of TTS_ENDPOINTS) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "en-GB-SoniaNeural" }),
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          const audio = new Audio(blobUrl);
          currentRef.current = audio;
          await audio.play();
          return new Promise((resolve) => {
            audio.onended = () => { URL.revokeObjectURL(blobUrl); resolve(); };
            audio.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(); };
          });
        }
      } catch {}
    }

    // Fallback: speechSynthesis
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // Cancel any previous speech first
    speechSynthesis.cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.pitch = 0.85;
      u.volume = 1;
      const voices = speechSynthesis.getVoices();
      const uk = voices.find((v) => /uk|british|daniel|oliver|harry|sonia/i.test(v.name) && v.lang.startsWith("en"));
      const us = voices.find((v) => /google\s*us|samantha|aaron|fred|david|zira|jenny|aria/i.test(v.name) && v.lang.startsWith("en"));
      u.voice = uk || us || voices.find((v) => v.lang.startsWith("en")) || null;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }, []);

  const stop = useCallback(() => {
    if (currentRef.current) {
      currentRef.current.pause();
      currentRef.current = null;
    }
    try { speechSynthesis.cancel(); } catch {}
  }, []);

  return { play, stop };
}
