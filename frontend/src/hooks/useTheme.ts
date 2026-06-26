import { useState, useEffect, useCallback } from "react";

export type ThemeName =
  | "jarvis-neon"
  | "cyber-blue"
  | "hacker-green"
  | "plasma-dark"
  | "matrix"
  | "visar-edge";

const THEMES: Record<ThemeName, { accent: string; glow: string; label: string }> = {
  "jarvis-neon": { accent: "#00d4ff", glow: "rgba(0, 212, 255, 0.3)", label: "Jarvis Neon" },
  "cyber-blue": { accent: "#00EFFF", glow: "rgba(0, 239, 255, 0.3)", label: "Cyber Blue" },
  "hacker-green": { accent: "#00FF00", glow: "rgba(0, 255, 0, 0.3)", label: "Hacker Green" },
  "plasma-dark": { accent: "#BB86FC", glow: "rgba(187, 134, 252, 0.3)", label: "Plasma Dark" },
  matrix: { accent: "#33CC33", glow: "rgba(51, 204, 51, 0.3)", label: "Matrix" },
  "visar-edge": { accent: "#FF4E2A", glow: "rgba(255, 78, 42, 0.3)", label: "Visar Edge" },
};

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("jarvis-theme") as ThemeName) || "jarvis-neon";
    }
    return "jarvis-neon";
  });

  useEffect(() => {
    localStorage.setItem("jarvis-theme", theme);
    const t = THEMES[theme];
    document.documentElement.style.setProperty("--theme-accent", t.accent);
    document.documentElement.style.setProperty("--theme-accent-glow", t.glow);
    document.documentElement.style.setProperty("--theme-border-glow", t.accent);
    document.documentElement.style.setProperty("--color-jarvis", t.accent);
    document.documentElement.style.setProperty("--color-jarvis-dark", t.accent + "cc");
    document.documentElement.style.setProperty("--color-jarvis-glow", t.glow);
    document.documentElement.style.setProperty("--color-jarvis-subtle", t.accent + "14");
    document.documentElement.style.setProperty("--color-border-subtle", t.accent + "14");
    document.documentElement.style.setProperty("--color-border", t.accent + "26");
    document.documentElement.style.setProperty("--color-border-active", t.accent + "59");
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);

  return { theme, setTheme, themes: THEMES };
}
