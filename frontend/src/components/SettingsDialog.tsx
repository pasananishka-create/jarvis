import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { DirectConfig, ModelOption } from "../lib/directAi";
import { fetchLiveModels, getCuratedModels } from "../lib/directAi";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Cfg {
  activeProvider: DirectConfig["activeProvider"];
  activeModel: string;
  openaiKey: string;
  anthropicKey: string;
  nvidiaKey: string;
  ollamaUrl: string;
}

const PROVIDERS: { id: Cfg["activeProvider"]; label: string; note?: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "nvidia", label: "NVIDIA", note: "APK only" },
  { id: "ollama", label: "Ollama" },
];

function loadCfg(): Cfg {
  try {
    const raw = localStorage.getItem("jarvis_direct_config");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    activeProvider: "openai",
    activeModel: "gpt-4o",
    openaiKey: "",
    anthropicKey: "",
    nvidiaKey: "",
    ollamaUrl: "",
  };
}

function saveCfg(c: Cfg) {
  try {
    localStorage.setItem("jarvis_direct_config", JSON.stringify(c));
  } catch {}
}

function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function savePref(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

type Tab = "ai" | "voice" | "appearance" | "privacy";

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "monospace",
  letterSpacing: "0.15em",
  color: "rgba(255,255,255,0.6)",
  display: "block",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "12px 16px",
  fontSize: 15,
  fontFamily: "monospace",
  color: "rgba(255,255,255,0.9)",
  outline: "none",
  minHeight: 48,
  boxSizing: "border-box",
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "10px 0",
  fontSize: 10,
  fontFamily: "monospace",
  letterSpacing: "0.15em",
  border: "none",
  background: active ? "rgba(0,229,255,0.1)" : "transparent",
  color: active ? "#00E5FF" : "rgba(255,255,255,0.3)",
  cursor: "pointer",
  minHeight: 40,
  borderBottom: active ? "1px solid #00E5FF" : "1px solid transparent",
  transition: "all 0.3s",
});

export default function SettingsDialog({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<Cfg>(loadCfg);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("ai");

  // Voice prefs
  const [voiceSpeed, setVoiceSpeed] = useState(() => loadPref("jarvis_voice_speed", 1));
  const [voicePitch, setVoicePitch] = useState(() => loadPref("jarvis_voice_pitch", 1));
  const [soundEnabled, setSoundEnabled] = useState(() => loadPref("jarvis_sound_enabled", true));
  const [wakeWord, setWakeWord] = useState(() => loadPref("jarvis_wake_word", ""));

  // Animation prefs
  const [animQuality, setAnimQuality] = useState(() => loadPref("jarvis_anim_quality", "high"));
  const [particleCount, setParticleCount] = useState(() => loadPref("jarvis_particle_count", 60));

  // Theme
  const [accentColor, setAccentColor] = useState(() => loadPref("jarvis_accent_color", "#00E5FF"));

  useEffect(() => {
    if (open) {
      setCfg(loadCfg());
      setModels(getCuratedModels(loadCfg().activeProvider));
      setFetchError(null);
    }
  }, [open]);

  const update = (patch: Partial<Cfg>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveCfg(next);
  };

  const changeProvider = (id: Cfg["activeProvider"]) => {
    const defaults: Record<string, string> = {
      nvidia: "meta/llama-3.1-8b-instruct",
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-20250514",
      ollama: "llama3.1",
    };
    const next = { ...cfg, activeProvider: id, activeModel: defaults[id] };
    setCfg(next);
    saveCfg(next);
    setModels(getCuratedModels(id));
    setFetchError(null);
  };

  const hasKey = () => {
    if (cfg.activeProvider === "ollama") return !!cfg.ollamaUrl;
    if (cfg.activeProvider === "nvidia") return !!cfg.nvidiaKey;
    if (cfg.activeProvider === "openai") return !!cfg.openaiKey;
    if (cfg.activeProvider === "anthropic") return !!cfg.anthropicKey;
    return false;
  };

  const refresh = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const live = await fetchLiveModels(cfg.activeProvider);
      setModels(live);
      if (live.length > 0 && !live.find((m: ModelOption) => m.id === cfg.activeModel)) {
        update({ activeModel: live[0].id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(msg);
      setModels(getCuratedModels(cfg.activeProvider));
    } finally {
      setFetching(false);
    }
  }, [cfg.activeProvider]);

  if (!open) return null;

  const rangeSlider = (label: string, val: number, set: (v: number) => void, min: number, max: number, step: number) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{label}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{val.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => { const v = parseFloat(e.target.value); set(v); savePref(`jarvis_voice_${label.toLowerCase()}`, v); }}
        style={{
          width: "100%",
          height: 4,
          appearance: "none",
          background: "rgba(255,255,255,0.1)",
          borderRadius: 2,
          outline: "none",
          cursor: "pointer",
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00E5FF;
          box-shadow: 0 0 8px rgba(0,229,255,0.4);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00E5FF;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: "rgba(4,6,11,0.95)",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 0",
        }}
      >
        <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.25em", color: "rgba(255,255,255,0.6)" }}>
          SETTINGS
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            padding: 8,
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "12px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {(["ai", "voice", "appearance", "privacy"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>
            {t === "ai" ? "AI" : t === "voice" ? "VOICE" : t === "appearance" ? "STYLE" : "PRIVACY"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {/* ─── AI TAB ─── */}
        {tab === "ai" && (
          <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.6 }}>
              API keys stay on this device only.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={(e) => { e.stopPropagation(); changeProvider(p.id); }}
                  style={{
                    flexShrink: 0,
                    padding: "10px 16px",
                    fontSize: 12,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    border: cfg.activeProvider === p.id ? "1px solid rgba(0,229,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    background: cfg.activeProvider === p.id ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)",
                    color: cfg.activeProvider === p.id ? "#00E5FF" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    minHeight: 40,
                  }}
                >
                  {p.label}
                  {p.note && <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>({p.note})</span>}
                </button>
              ))}
            </div>

            <div style={sectionStyle}>
              {cfg.activeProvider === "nvidia" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>NVIDIA API Key</label>
                  <input value={cfg.nvidiaKey || ""} onChange={(e) => { update({ nvidiaKey: e.target.value }); setFetchError(null); }} type="password" placeholder="nvapi-..." style={inputStyle} />
                </div>
              )}
              {cfg.activeProvider === "openai" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>OpenAI API Key</label>
                  <input value={cfg.openaiKey || ""} onChange={(e) => { update({ openaiKey: e.target.value }); setFetchError(null); }} type="password" placeholder="sk-..." style={inputStyle} />
                </div>
              )}
              {cfg.activeProvider === "anthropic" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Anthropic API Key</label>
                  <input value={cfg.anthropicKey || ""} onChange={(e) => { update({ anthropicKey: e.target.value }); setFetchError(null); }} type="password" placeholder="sk-ant-..." style={inputStyle} />
                </div>
              )}
              {cfg.activeProvider === "ollama" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Ollama URL</label>
                  <input value={cfg.ollamaUrl || ""} onChange={(e) => { update({ ollamaUrl: e.target.value }); setFetchError(null); }} placeholder="http://192.168.1.100:11434" style={inputStyle} />
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)" }}>MODELS</span>
                <button
                  onClick={(e) => { e.stopPropagation(); refresh(); }}
                  disabled={!hasKey() || fetching}
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    letterSpacing: "0.12em",
                    padding: "8px 12px",
                    border: hasKey() && !fetching ? "1px solid rgba(0,229,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                    background: "none",
                    color: hasKey() && !fetching ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.2)",
                    cursor: hasKey() && !fetching ? "pointer" : "default",
                    minHeight: 36,
                  }}
                >
                  {fetching ? "REFRESHING..." : "REFRESH"}
                </button>
              </div>

              {fetchError && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{fetchError}</p>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); update({ activeModel: m.id }); }}
                    style={{
                      padding: "8px 12px",
                      fontSize: 11,
                      fontFamily: "monospace",
                      letterSpacing: "0.05em",
                      border: cfg.activeModel === m.id ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      background: cfg.activeModel === m.id ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)",
                      color: cfg.activeModel === m.id ? "#00E5FF" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      minHeight: 36,
                    }}
                  >
                    {m.name}
                  </button>
                ))}
                {models.length === 0 && (
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>No models available</span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── VOICE TAB ─── */}
        {tab === "voice" && (
          <motion.div key="voice" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <div style={sectionStyle}>
              <span style={labelStyle}>WAKE WORD</span>
              <input
                value={wakeWord}
                onChange={(e) => { setWakeWord(e.target.value); savePref("jarvis_wake_word", e.target.value); }}
                placeholder="e.g. JARVIS"
                style={inputStyle}
              />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6, fontFamily: "monospace" }}>
                Say this word before commands
              </p>
            </div>

            <div style={sectionStyle}>
              <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 12 }}>
                SPEECH
              </span>
              {rangeSlider("Speed", voiceSpeed, setVoiceSpeed, 0.5, 2, 0.1)}
              {rangeSlider("Pitch", voicePitch, setVoicePitch, 0.5, 2, 0.1)}
            </div>

            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Sound Effects</span>
                <button
                  onClick={() => { setSoundEnabled(!soundEnabled); savePref("jarvis_sound_enabled", !soundEnabled); }}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    background: soundEnabled ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.3s",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: soundEnabled ? "#00E5FF" : "rgba(255,255,255,0.3)",
                      position: "absolute",
                      top: 2,
                      left: soundEnabled ? 22 : 2,
                      transition: "left 0.3s, background 0.3s",
                      boxShadow: soundEnabled ? "0 0 6px rgba(0,229,255,0.4)" : "none",
                    }}
                  />
                </button>
              </div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                Startup, listening, and notification sounds
              </p>
            </div>
          </motion.div>
        )}

        {/* ─── APPEARANCE TAB ─── */}
        {tab === "appearance" && (
          <motion.div key="appearance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <div style={sectionStyle}>
              <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 12 }}>
                ACCENT COLOR
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["#00E5FF", "#3B82F6", "#00FFC8", "#8B5CF6", "#F59E0B", "#FF4B6E"].map((c) => (
                  <button
                    key={c}
                    onClick={() => { setAccentColor(c); savePref("jarvis_accent_color", c); }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: accentColor === c ? "2px solid #fff" : "2px solid transparent",
                      background: c,
                      cursor: "pointer",
                      boxShadow: accentColor === c ? `0 0 12px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 12 }}>
                ANIMATIONS
              </span>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["low", "medium", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => { setAnimQuality(q); savePref("jarvis_anim_quality", q); }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontSize: 10,
                      fontFamily: "monospace",
                      letterSpacing: "0.1em",
                      border: animQuality === q ? "1px solid rgba(0,229,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      background: animQuality === q ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)",
                      color: animQuality === q ? "#00E5FF" : "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                      minHeight: 40,
                      borderRadius: 8,
                    }}
                  >
                    {q.toUpperCase()}
                  </button>
                ))}
              </div>
              {animQuality !== "low" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Particles</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{particleCount}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={120}
                    step={10}
                    value={particleCount}
                    onChange={(e) => { const v = parseInt(e.target.value); setParticleCount(v); savePref("jarvis_particle_count", v); }}
                    style={{
                      width: "100%",
                      height: 4,
                      appearance: "none",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 }}>
                ACCESSIBILITY
              </span>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                Reduced motion is automatically detected from your system settings. High contrast mode reads system contrast preference. Dynamic font sizing adjusts with system font scale.
              </p>
            </div>
          </motion.div>
        )}

        {/* ─── PRIVACY TAB ─── */}
        {tab === "privacy" && (
          <motion.div key="privacy" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <div style={sectionStyle}>
              <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 12 }}>
                DATA & PERMISSIONS
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Microphone</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>Speech recognition</div>
                  </div>
                  <span style={{ fontSize: 10, color: "#00FFC8", fontFamily: "monospace" }}>GRANTED</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Storage</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>Local config & keys</div>
                  </div>
                  <span style={{ fontSize: 10, color: "#00FFC8", fontFamily: "monospace" }}>LOCAL ONLY</span>
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 }}>
                ABOUT
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Version</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>2.0.0</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Engine</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>AI OS v2</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>,
    document.body
  );
}
